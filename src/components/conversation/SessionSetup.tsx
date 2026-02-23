"use client";

import { useState } from "react";
import { MessageCircle, Play, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionConfig } from "@/hooks/useGeminiLive";

// ============================================================================
// Constants
// ============================================================================
const TOPICS = [
  "Free conversation",
  "Daily routine",
  "Travel & directions",
  "Work & career",
  "Current events",
  "Ordering food",
  "Custom",
] as const;

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
const SESSION_LENGTHS = [5, 10, 15] as const;

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
  tr: "Turkish",
  pl: "Polish",
  sv: "Swedish",
};

// ============================================================================
// Component
// ============================================================================
interface SessionSetupProps {
  targetLanguage: string;
  onStart: (config: SessionConfig) => void;
}

export default function SessionSetup({
  targetLanguage,
  onStart,
}: SessionSetupProps) {
  const [topic, setTopic] = useState<string>("Free conversation");
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] =
    useState<SessionConfig["difficulty"]>("Intermediate");
  const [sessionLength, setSessionLength] = useState<number>(10);

  const languageLabel =
    LANGUAGE_LABELS[targetLanguage] || targetLanguage.toUpperCase();

  const handleStart = () => {
    onStart({
      targetLanguage: languageLabel,
      topic,
      customTopic: topic === "Custom" ? customTopic : undefined,
      difficulty,
      sessionLengthMinutes: sessionLength,
    });
  };

  return (
    <div className="max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header icon */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: "rgba(45, 212, 191, 0.12)" }}
        >
          <MessageCircle
            className="w-8 h-8"
            style={{ color: "var(--turquoise)" }}
          />
        </div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Live Conversation
        </h2>
        <p
          className="font-body text-sm mt-1"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          Configure your AI conversation session
        </p>
      </div>

      {/* Config form */}
      <div
        className="rounded-2xl border border-white/10 p-6 space-y-5"
        style={{ background: "rgba(13, 33, 55, 0.6)" }}
      >
        {/* Target language (read-only) */}
        <div className="space-y-1.5">
          <label
            className="font-body text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.6 }}
          >
            Language
          </label>
          <div
            className="rounded-xl border border-white/10 px-4 py-2.5 font-body text-sm"
            style={{
              color: "var(--sand)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {languageLabel}
          </div>
        </div>

        {/* Topic */}
        <div className="space-y-1.5">
          <label
            className="font-body text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.6 }}
          >
            Topic
          </label>
          <div className="relative">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-white/10 px-4 py-2.5",
                "font-body text-sm appearance-none cursor-pointer",
                "focus:outline-none focus:border-[var(--turquoise)]/40",
                "transition-colors duration-200",
              )}
              style={{
                color: "var(--sand)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {TOPICS.map((t) => (
                <option key={t} value={t} style={{ background: "#0d1b2a" }}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            />
          </div>

          {/* Custom topic input */}
          {topic === "Custom" && (
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Describe your topic..."
              className={cn(
                "w-full rounded-xl border border-white/10 px-4 py-2.5 mt-2",
                "font-body text-sm placeholder:text-white/20",
                "focus:outline-none focus:border-[var(--turquoise)]/40",
                "transition-colors duration-200",
              )}
              style={{
                color: "var(--sand)",
                background: "rgba(255,255,255,0.03)",
              }}
            />
          )}
        </div>

        {/* Difficulty */}
        <div className="space-y-1.5">
          <label
            className="font-body text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.6 }}
          >
            Difficulty
          </label>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 font-body text-xs font-medium",
                  "transition-all duration-200 cursor-pointer",
                  difficulty === d
                    ? "border-[var(--turquoise)]/50 bg-[var(--turquoise)]/10"
                    : "border-white/10 hover:border-white/20 bg-transparent",
                )}
                style={{
                  color:
                    difficulty === d ? "var(--turquoise)" : "var(--seafoam)",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Session length */}
        <div className="space-y-1.5">
          <label
            className="font-body text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.6 }}
          >
            Session Length
          </label>
          <div className="flex gap-2">
            {SESSION_LENGTHS.map((len) => (
              <button
                key={len}
                onClick={() => setSessionLength(len)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 font-body text-xs font-medium",
                  "transition-all duration-200 cursor-pointer",
                  sessionLength === len
                    ? "border-[var(--turquoise)]/50 bg-[var(--turquoise)]/10"
                    : "border-white/10 hover:border-white/20 bg-transparent",
                )}
                style={{
                  color:
                    sessionLength === len
                      ? "var(--turquoise)"
                      : "var(--seafoam)",
                }}
              >
                {len} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={topic === "Custom" && !customTopic.trim()}
        className={cn(
          "w-full mt-6 rounded-2xl py-4 px-6",
          "flex items-center justify-center gap-3",
          "font-display text-base font-semibold tracking-wide",
          "transition-all duration-300 cursor-pointer",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "bg-[var(--turquoise)]/15 border border-[var(--turquoise)]/30",
          "hover:bg-[var(--turquoise)]/25 hover:border-[var(--turquoise)]/50",
          "hover:shadow-[0_0_32px_rgba(45,212,191,0.15)]",
        )}
        style={{ color: "var(--turquoise)" }}
      >
        <Play className="w-5 h-5" />
        Start Session
      </button>
    </div>
  );
}
