/**
 * Shared Gemini AI client with streaming support and timeout guards.
 *
 * Every route was instantiating its own GoogleGenAI inline.  This module
 * provides a singleton + two helpers:
 *
 *   generateJSON()       – non-streaming, returns parsed object
 *   generateJSONStream() – streaming, collects full text then parses
 *
 * Both accept an optional `timeoutMs` (default 30 s) that uses an
 * AbortController so a stalled Gemini connection can never pin a
 * serverless worker indefinitely.
 */

import { GoogleGenAI } from "@google/genai";

// ─── Singleton ───────────────────────────────────────────────────────────────

let _ai: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey === "your_google_api_key") {
    throw new Error(
      "Google API key is required. Please configure GOOGLE_API_KEY in your environment.",
    );
  }
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

// ─── Default timeout ─────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds

// ─── Types ───────────────────────────────────────────────────────────────────

/** A content part: plain text or inline binary data (audio, images). */
export type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GenerateOptions {
  model?: string;
  /**
   * Prompt contents.
   *  - string: simple text prompt
   *  - Array<{ parts: ContentPart[] }>: multi-turn or multimodal content
   */
  contents: string | Array<{ parts: ContentPart[] }>;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
  /** Abort timeout in ms. Defaults to 30 000. Set 0 to disable. */
  timeoutMs?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildConfig(opts: GenerateOptions) {
  return {
    systemInstruction: opts.systemInstruction,
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: opts.maxOutputTokens,
    responseMimeType: opts.responseMimeType ?? "application/json",
  };
}

function makeAbortSignal(timeoutMs: number): AbortSignal | undefined {
  if (timeoutMs <= 0) return undefined;
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Non-streaming JSON generation with an AbortController timeout guard.
 * Returns the parsed JSON object.
 */
export async function generateJSON<T = unknown>(
  opts: GenerateOptions,
): Promise<T> {
  const ai = getAI();
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const completion = await ai.models.generateContent({
    model: opts.model ?? "gemini-2.5-flash-lite",
    contents: opts.contents,
    config: {
      ...buildConfig(opts),
      httpOptions: timeout > 0 ? { timeout } : undefined,
    },
  });

  const raw = completion.text || "{}";
  return JSON.parse(raw) as T;
}

/**
 * Streaming JSON generation.  Collects chunks via `generateContentStream`,
 * concatenates the full text, then parses as JSON.
 *
 * Why streaming even for JSON?
 * – The server receives the first byte quickly, resetting the 504 timer on
 *   Vercel / Cloudflare / any reverse-proxy with an idle-connection timeout.
 * – We still need the full text to parse JSON, but the connection stays alive.
 *
 * For truly incremental SSE to the client, use `streamToClient()` below.
 */
export async function generateJSONStream<T = unknown>(
  opts: GenerateOptions,
): Promise<T> {
  const ai = getAI();
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const stream = await ai.models.generateContentStream({
    model: opts.model ?? "gemini-2.5-flash-lite",
    contents: opts.contents,
    config: {
      ...buildConfig(opts),
      httpOptions: timeout > 0 ? { timeout } : undefined,
    },
  });

  let fullText = "";
  for await (const chunk of stream) {
    fullText += chunk.text ?? "";
  }

  return JSON.parse(fullText || "{}") as T;
}

/**
 * Stream Gemini output as SSE (Server-Sent Events) to the client.
 *
 * Returns a ReadableStream suitable for `new Response(stream, { headers })`.
 * Each chunk sends a `data: {...}\n\n` event with a partial JSON field.
 * The final event is `data: [DONE]\n\n`.
 *
 * Usage in a Next.js route handler:
 *
 *   return new Response(streamToClient(opts), {
 *     headers: {
 *       "Content-Type": "text/event-stream",
 *       "Cache-Control": "no-cache",
 *       Connection: "keep-alive",
 *     },
 *   });
 */
/**
 * Non-streaming plain-text generation (no JSON parsing).
 * Use for transcription, translation, and other free-form text outputs.
 */
export async function generateText(opts: GenerateOptions): Promise<string> {
  const ai = getAI();
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const completion = await ai.models.generateContent({
    model: opts.model ?? "gemini-2.5-flash-lite",
    contents: opts.contents,
    config: {
      systemInstruction: opts.systemInstruction,
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens,
      // No responseMimeType — plain text
      httpOptions: timeout > 0 ? { timeout } : undefined,
    },
  });

  return (completion.text || "").trim();
}

export function streamToClient(opts: GenerateOptions): ReadableStream {
  const ai = getAI();
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model: opts.model ?? "gemini-2.5-flash-lite",
          contents: opts.contents,
          config: {
            ...buildConfig(opts),
            httpOptions: timeout > 0 ? { timeout } : undefined,
          },
        });

        const encoder = new TextEncoder();
        for await (const chunk of stream) {
          const text = chunk.text ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Stream generation failed";
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ error: message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });
}
