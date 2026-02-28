"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getMediaType,
  ALL_ACCEPTED_TYPES,
  MAX_MEDIA_SIZE,
  type MediaType,
} from "@/types/card-editor";

// ── Upload Result ──────────────────────────────────────────────────────────
interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  storagePath: string;
  size: number;
  type: MediaType;
}

// ── useMediaUpload ─────────────────────────────────────────────────────────
export function useMediaUpload(userId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, cardId?: string): Promise<UploadResult | null> => {
      setError(null);

      // Validate type
      if (!ALL_ACCEPTED_TYPES.includes(file.type as never)) {
        setError(`Unsupported file type: ${file.type}`);
        return null;
      }

      // Validate size
      if (file.size > MAX_MEDIA_SIZE) {
        setError(`File too large (max ${MAX_MEDIA_SIZE / 1024 / 1024}MB)`);
        return null;
      }

      setUploading(true);
      try {
        const supabase = createClient();
        const ext = file.name.split(".").pop() || "bin";
        const storagePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("card-media")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          setError(uploadError.message);
          return null;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("card-media").getPublicUrl(storagePath);

        // Track in card_media table
        await supabase.from("card_media").insert({
          user_id: userId,
          card_id: cardId || null,
          filename: file.name,
          mime_type: file.type,
          storage_path: storagePath,
          file_size: file.size,
        });

        return {
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          storagePath,
          size: file.size,
          type: getMediaType(file.type),
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [userId],
  );

  return { upload, uploading, error, clearError: () => setError(null) };
}

// ── useAudioRecorder ───────────────────────────────────────────────────────
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setDuration(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start(100);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      console.error("Failed to start recording");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
  }, []);

  return {
    recording,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    clearRecording,
  };
}

// ── File Input Helper ──────────────────────────────────────────────────────
export function useFileInput(accept: string) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openFilePicker = useCallback(
    (onSelect: (files: File[]) => void) => {
      if (!inputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        document.body.appendChild(input);
        inputRef.current = input;
      }

      const input = inputRef.current;
      input.accept = accept;
      input.onchange = () => {
        if (input.files?.length) {
          onSelect(Array.from(input.files));
          input.value = "";
        }
      };
      input.click();
    },
    [accept],
  );

  return { openFilePicker };
}

// ── Generate [sound:file.mp3] syntax ───────────────────────────────────────
export function soundTag(url: string): string {
  return `[sound:${url}]`;
}

// ── Parse [sound:file.mp3] to get URL ──────────────────────────────────────
export function parseSoundTags(html: string): string[] {
  const regex = /\[sound:([^\]]+)\]/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

// ── Render [sound:...] tags as audio elements in HTML ──────────────────────
export function renderSoundTags(html: string): string {
  return html.replace(
    /\[sound:([^\]]+)\]/g,
    '<audio controls src="$1" class="inline-block max-w-full my-1"></audio>',
  );
}

// ── LaTeX rendering helper (uses KaTeX) ────────────────────────────────────
export async function renderLatex(latex: string): Promise<string> {
  try {
    const katex = await import("katex");
    return katex.default.renderToString(latex, {
      throwOnError: false,
      displayMode: latex.includes("\\\\") || latex.includes("\\begin"),
    });
  } catch {
    return `<code>${latex}</code>`;
  }
}

// ── Insert LaTeX dialog helper ─────────────────────────────────────────────
export function latexToHtml(latex: string): string {
  // For MathJax compatibility, wrap in delimiters
  if (latex.includes("\\begin") || latex.includes("\\\\")) {
    return `\\[${latex}\\]`;
  }
  return `\\(${latex}\\)`;
}
