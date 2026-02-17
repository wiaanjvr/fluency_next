const dotenv = require("dotenv");
const { resolve } = require("path");

// Use process.cwd() to resolve .env.local relative to project root
const envLocalPath = resolve(process.cwd(), ".env.local");
dotenv.config({ path: envLocalPath });
dotenv.config(); // fallback to .env if .env.local is missing

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY not found in environment. Please set it in .env.local or .env.",
  );
  process.exit(1);
}

/**
 * Foundation Audio Generation Script
 *
 * Generates OpenAI HD TTS audio for foundation vocabulary words and sentences
 * for German and Italian (French audio already generated).
 * Uploads to Supabase storage and seeds database.
 *
 * Requirements:
 * - OpenAI API key in environment
 * - Supabase credentials in environment
 *
 * Usage: npx ts-node scripts/generate-foundation-audio.ts
 */

const OpenAI = require("openai").default;
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs/promises");
const path = require("path");
const {
  generateFoundationVocabulary,
} = require("../src/data/foundation-vocabulary.ts");

// Supported languages type
type SupportedLanguage = "fr" | "de" | "it";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role for admin operations
);

// OpenAI TTS voice mapping for each language
const VOICE_MAPPING: Record<
  SupportedLanguage,
  "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"
> = {
  fr: "nova", // Female French voice
  de: "onyx", // Male German voice
  it: "shimmer", // Female Italian voice
};

// Language codes for OpenAI TTS (if needed for better pronunciation)
const LANGUAGE_CODES: Record<SupportedLanguage, string> = {
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
};

/**
 * Generate audio using OpenAI TTS HD
 */
async function generateAudio(
  text: string,
  language: SupportedLanguage,
): Promise<Buffer> {
  console.log(`  Generating audio for: "${text}" (${language})`);

  const mp3 = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: VOICE_MAPPING[language],
    input: text,
    speed: 0.9, // Slightly slower for learning
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer;
}

/**
 * Upload audio to Supabase storage
 */
async function uploadAudio(
  buffer: Buffer,
  filePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("foundation-audio")
    .upload(filePath, buffer, {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`  Error uploading ${filePath}:`, error);
    return null;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("foundation-audio").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Sanitize filename by removing special characters and diacritics
 * Converts "être" to "etre", "naïve" to "naive", etc.
 */
function sanitizeFilename(text: string): string {
  return text
    .normalize("NFD") // Decompose combined characters (é -> e + ´)
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/[^a-zA-Z0-9\s_-]/g, "") // Remove remaining special chars
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .toLowerCase();
}

/**
 * Generate and upload audio for a word
 */
async function processWord(
  word: any,
  language: SupportedLanguage,
): Promise<{ wordAudioUrl: string | null; sentenceAudioUrl: string | null }> {
  // Generate word audio
  const wordText = word.word;
  const wordAudio = await generateAudio(wordText, language);
  const wordFilePath = `${language}/words/${word.rank}_${sanitizeFilename(wordText)}.mp3`;
  const wordAudioUrl = await uploadAudio(wordAudio, wordFilePath);

  // Wait a bit to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate sentence audio
  const sentenceText =
    word.exampleSentence.target ||
    word.exampleSentence.french ||
    word.exampleSentence.german ||
    word.exampleSentence.italian ||
    "";
  const sentenceAudio = await generateAudio(sentenceText, language);
  const sentenceFilePath = `${language}/sentences/${word.rank}_${sanitizeFilename(wordText)}.mp3`;
  const sentenceAudioUrl = await uploadAudio(sentenceAudio, sentenceFilePath);

  // Wait a bit to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { wordAudioUrl, sentenceAudioUrl };
}

/**
 * Insert word and sentence into database
 */
async function insertWordToDatabase(
  word: any,
  language: SupportedLanguage,
  wordAudioUrl: string | null,
  sentenceAudioUrl: string | null,
): Promise<void> {
  // Insert word
  const { data: wordData, error: wordError } = await supabase
    .from("foundation_words")
    .insert({
      word: word.word,
      lemma: word.lemma,
      language,
      rank: word.rank,
      pos: word.pos,
      translation: word.translation,
      image_keyword: word.imageKeyword,
      imageability: word.imageability,
      category: word.category,
      phonetic: word.phonetic || null,
      audio_url: wordAudioUrl,
    })
    .select()
    .single();

  if (wordError) {
    console.error(`  Error inserting word ${word.word}:`, wordError);
    return;
  }

  // Insert sentence
  const sentenceText =
    word.exampleSentence.target ||
    word.exampleSentence.french ||
    word.exampleSentence.german ||
    word.exampleSentence.italian ||
    "";

  const { error: sentenceError } = await supabase
    .from("foundation_sentences")
    .insert({
      word_id: wordData.id,
      target_language_text: sentenceText,
      english_translation: word.exampleSentence.english,
      audio_url: sentenceAudioUrl,
    });

  if (sentenceError) {
    console.error(
      `  Error inserting sentence for ${word.word}:`,
      sentenceError,
    );
  }
}

/**
 * Load raw word data from JSON files
 */
async function loadRawWords(language: SupportedLanguage): Promise<any[]> {
  const filePath = path.join(
    __dirname,
    "../src/data",
    `common-${language === "fr" ? "french" : language === "de" ? "german" : "italian"}-words.json`,
  );
  const fileContent = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(fileContent);
  return data.words || [];
}

/**
 * Process all words for a language
 */
async function processLanguage(language: SupportedLanguage): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing ${language.toUpperCase()} Foundation Vocabulary`);
  console.log(`${"=".repeat(60)}\n`);

  // Load raw word data
  const rawWords = await loadRawWords(language);
  const words = generateFoundationVocabulary(rawWords, language);
  console.log(`Found ${words.length} words for ${language}\n`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    console.log(
      `[${i + 1}/${words.length}] Processing: ${word.word} (rank ${word.rank})`,
    );

    try {
      // Generate and upload audio
      const { wordAudioUrl, sentenceAudioUrl } = await processWord(
        word,
        language,
      );

      // Insert into database
      await insertWordToDatabase(
        word,
        language,
        wordAudioUrl,
        sentenceAudioUrl,
      );

      console.log(`  ✅ Complete\n`);
    } catch (error) {
      console.error(`  ❌ Error processing word:`, error);
      console.log(`  Continuing with next word...\n`);
    }
  }

  console.log(`\n✅ Completed ${language.toUpperCase()}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log("Foundation Audio Generation Script");
  console.log("==================================\n");

  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not found in environment");
    process.exit(1);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("❌ Supabase credentials not found in environment");
    process.exit(1);
  }

  const languages: SupportedLanguage[] = ["de", "it"];

  for (const language of languages) {
    await processLanguage(language);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ ALL LANGUAGES COMPLETED");
  console.log("=".repeat(60));
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
