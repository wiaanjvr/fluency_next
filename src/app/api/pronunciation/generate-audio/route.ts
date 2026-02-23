import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { fetchWikimediaAudio, isSingleWord } from "@/lib/wikimedia-audio";

// ─── TTS fallback (used for multi-word phrases only) ─────────────────────────

const VOICE_MAP: Record<string, string> = {
  de: "Kore",
  fr: "Aoede",
  it: "Aoede",
};

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const TTS_RETRY_ATTEMPTS = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateTtsAudio(text: string, voiceName: string) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_google_api_key") {
    throw new Error(
      "Google API key is required. Please configure GOOGLE_API_KEY or GEMINI_API_KEY in your environment.",
    );
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= TTS_RETRY_ATTEMPTS; attempt++) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [
                {
                  text: "You are a TTS system. Read the given text aloud exactly as written, with natural pronunciation.",
                },
              ],
            },
            contents: [{ role: "user", parts: [{ text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
          }),
          signal: AbortSignal.timeout(60000),
        },
      );

      const bodyText = await geminiRes.text();
      let ttsJson: any = null;
      try {
        ttsJson = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        ttsJson = null;
      }

      if (!geminiRes.ok) {
        const details =
          ttsJson?.error?.message || bodyText || `HTTP ${geminiRes.status}`;
        throw new Error(details);
      }

      const parts = ttsJson?.candidates?.[0]?.content?.parts;
      const audioPart = Array.isArray(parts)
        ? parts.find(
            (part: any) =>
              typeof part?.inlineData?.data === "string" &&
              part.inlineData.data.length > 0,
          )
        : undefined;

      const audioBase64: string | undefined = audioPart?.inlineData?.data;
      const mimeType = String(
        audioPart?.inlineData?.mimeType || "",
      ).toLowerCase();

      if (!audioBase64) {
        throw new Error("TTS generation returned no audio");
      }

      return { audioBase64, mimeType };
    } catch (err) {
      lastError = err;
      if (attempt < TTS_RETRY_ATTEMPTS) {
        await wait(350 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("TTS generation failed for all model attempts");
}

/**
 * Wrap raw PCM data from Gemini TTS in a WAV container.
 */
function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Build a stable, deterministic Supabase storage path for a word's audio.
 * Stored under the user's own prefix to satisfy the reading-audio RLS policy.
 */
function pronunciationCachePath(
  userId: string,
  language: string,
  word: string,
  ext: string,
): string {
  const slug = word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüßàâéèêëîïôùûüçæœ]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${userId}/pronunciation-cache/${language}/${slug}.${ext}`;
}

/**
 * Return a cached Supabase public URL for a word if one already exists
 * in the reading-audio bucket under the cache prefix.
 */
async function getCachedSupabaseUrl(
  supabase: any,
  userId: string,
  language: string,
  word: string,
): Promise<string | null> {
  const prefix = `${userId}/pronunciation-cache/${language}`;
  const slug = word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüßàâéèêëîïôùûüçæœ]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const { data: files } = await supabase.storage
    .from("reading-audio")
    .list(prefix, { search: slug });

  if (!files || files.length === 0) return null;

  // Any extension match (.ogg / .mp3 / .wav)
  const match = (files as Array<{ name: string }>).find((f) =>
    f.name.startsWith(slug + "."),
  );
  if (!match) return null;

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("reading-audio")
    .getPublicUrl(`${prefix}/${match.name}`);
  return publicUrl;
}

/**
 * Download audio from a Wikimedia URL and upload it to Supabase.
 * Returns the Supabase public URL, or null if the download/upload fails.
 */
async function downloadAndCacheWikimediaAudio(
  supabase: any,
  userId: string,
  language: string,
  word: string,
  wikimediaUrl: string,
): Promise<string | null> {
  const mediaRes = await fetch(wikimediaUrl, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      "User-Agent": "Lingua2.0 pronunciation cache (educational)",
    },
  });
  if (!mediaRes.ok) return null;

  const audioBuffer = Buffer.from(await mediaRes.arrayBuffer());
  const contentType = mediaRes.headers.get("content-type") || "audio/ogg";
  const ext = contentType.includes("mp3")
    ? "mp3"
    : contentType.includes("wav")
      ? "wav"
      : "ogg";

  const storagePath = pronunciationCachePath(userId, language, word, ext);

  const { error: uploadError } = await supabase.storage
    .from("reading-audio")
    .upload(storagePath, audioBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    console.error(
      "Failed to cache Wikimedia audio in Supabase:",
      uploadError.message,
    );
    return null;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("reading-audio").getPublicUrl(storagePath);
  return publicUrl;
}

// POST /api/pronunciation/generate-audio — generate TTS audio
export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { supabase, user } = auth;

  let body: { text: string; language: string; storage_path?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, language, storage_path } = body;

  if (!text || !language) {
    return NextResponse.json(
      { error: "text and language are required" },
      { status: 400 },
    );
  }

  try {
    // ── Step 1: try Wikimedia Commons for single words ──────────────────────
    // Downloads are cached in Supabase so the browser always receives a
    // same-origin URL — this avoids the CORS restriction that prevents
    // MediaElementAudioSource from working with upload.wikimedia.org.
    if (isSingleWord(text)) {
      try {
        // 1a. Already cached in Supabase?
        const cached = await getCachedSupabaseUrl(
          supabase,
          user.id,
          language,
          text,
        );
        if (cached) {
          return NextResponse.json({
            audio_url: cached,
            source: "wikimedia-cached",
          });
        }

        // 1b. Fetch URL from Commons, then download + re-upload to Supabase
        const wikimediaUrl = await fetchWikimediaAudio(text, language);
        if (wikimediaUrl) {
          const supabaseUrl = await downloadAndCacheWikimediaAudio(
            supabase,
            user.id,
            language,
            text,
            wikimediaUrl,
          );
          if (supabaseUrl) {
            return NextResponse.json({
              audio_url: supabaseUrl,
              source: "wikimedia",
            });
          }
          // Download/upload failed — fall through to TTS
        }
      } catch (wikiErr) {
        // Wikimedia lookup is best-effort — fall through to TTS on any error
        console.warn(
          "Wikimedia Commons lookup failed, falling back to TTS:",
          wikiErr,
        );
      }
    }

    // ── Step 2: TTS fallback (used for phrases, or when Commons has no entry) ─
    const voiceName = VOICE_MAP[language] || "Aoede";
    const { audioBase64, mimeType } = await generateTtsAudio(text, voiceName);

    const rawAudio = Buffer.from(audioBase64, "base64");
    const wavBuffer = mimeType.includes("wav") ? rawAudio : pcmToWav(rawAudio);

    // Upload to Supabase Storage (path must start with user.id for RLS)
    const normalizedStoragePath = storage_path?.replace(/^\/+/, "");
    const storagePath = normalizedStoragePath
      ? normalizedStoragePath.startsWith(`${user.id}/`)
        ? normalizedStoragePath
        : `${user.id}/${normalizedStoragePath}`
      : `${user.id}/pronunciation/${language}/${Date.now()}-${crypto.randomUUID()}.wav`;

    const { error: uploadError } = await supabase.storage
      .from("reading-audio")
      .upload(storagePath, wavBuffer, {
        contentType: "audio/wav",
        upsert: true,
      });

    if (uploadError) {
      // Return the audio inline as a data URL rather than hard-failing
      const dataUrl = `data:audio/wav;base64,${wavBuffer.toString("base64")}`;
      return NextResponse.json({
        audio_url: dataUrl,
        source: "tts",
        storage_warning: uploadError.message,
      });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("reading-audio").getPublicUrl(storagePath);

    return NextResponse.json({ audio_url: publicUrl, source: "tts" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Audio generation failed:", err);
    return NextResponse.json(
      {
        error: "Audio generation failed",
        details: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500 },
    );
  }
}
