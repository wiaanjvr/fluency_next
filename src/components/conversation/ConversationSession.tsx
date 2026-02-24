"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, PhoneOff, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import {
  useGeminiLive,
  type SessionConfig,
  type TranscriptEntry,
  type SessionPhase,
} from "@/hooks/useGeminiLive";

// ============================================================================
// Helpers
// ============================================================================
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function phaseLabel(phase: SessionPhase, silenceWarning: boolean): string {
  if (silenceWarning) return "Still there?";
  switch (phase) {
    case "listening":
      return "Listening...";
    case "responding":
      return "Responding...";
    default:
      return "Connected";
  }
}

// ============================================================================
// Pulse Circle
// ============================================================================
function PulseCircle({
  phase,
  audioLevel,
}: {
  phase: SessionPhase;
  audioLevel: number;
}) {
  return (
    <div className="relative flex items-center justify-center w-56 h-56 md:w-72 md:h-72">
      {/* Outer ripple rings */}
      {phase === "responding" && (
        <>
          <div
            className="absolute inset-0 rounded-full animate-[ripple_2s_ease-out_infinite]"
            style={{
              border: "1px solid rgba(45, 212, 191, 0.15)",
            }}
          />
          <div
            className="absolute inset-[-12px] rounded-full animate-[ripple_2s_ease-out_0.5s_infinite]"
            style={{
              border: "1px solid rgba(45, 212, 191, 0.10)",
            }}
          />
          <div
            className="absolute inset-[-24px] rounded-full animate-[ripple_2s_ease-out_1s_infinite]"
            style={{
              border: "1px solid rgba(45, 212, 191, 0.05)",
            }}
          />
        </>
      )}

      {/* Listening pulse ring */}
      {phase === "listening" && (
        <div
          className="absolute inset-[-4px] rounded-full animate-[pulse_3s_ease-in-out_infinite]"
          style={{
            border: "1px solid rgba(45, 212, 191, 0.2)",
          }}
        />
      )}

      {/* Main circle */}
      <div
        className={cn(
          "relative w-48 h-48 md:w-64 md:h-64 rounded-full",
          "flex items-center justify-center",
          "transition-all duration-500 ease-out",
        )}
        style={{
          background:
            phase === "responding"
              ? `radial-gradient(circle, rgba(45, 212, 191, ${0.2 + audioLevel * 0.15}) 0%, rgba(45, 212, 191, 0.05) 70%, transparent 100%)`
              : phase === "listening"
                ? `radial-gradient(circle, rgba(45, 212, 191, ${0.15 + audioLevel * 0.25}) 0%, rgba(45, 212, 191, 0.04) 70%, transparent 100%)`
                : "radial-gradient(circle, rgba(45, 212, 191, 0.08) 0%, transparent 70%)",
          boxShadow:
            phase !== "idle"
              ? `0 0 ${60 + audioLevel * 40}px rgba(45, 212, 191, ${0.08 + audioLevel * 0.12})`
              : "none",
        }}
      >
        {/* Inner glow */}
        <div
          className="w-24 h-24 md:w-32 md:h-32 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(45, 212, 191, ${0.12 + audioLevel * 0.2}) 0%, transparent 70%)`,
            transition: "all 0.15s ease-out",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Transcript Area
// ============================================================================
function TranscriptArea({ entries }: { entries: TranscriptEntry[] }) {
  const recent = entries.slice(-4);

  if (recent.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center">
        <p
          className="font-body text-sm italic"
          style={{ color: "var(--seafoam)", opacity: 0.3 }}
        >
          Conversation will appear here...
        </p>
      </div>
    );
  }

  return (
    <div className="h-28 overflow-hidden space-y-2 px-4">
      {recent.map((entry, i) => (
        <div
          key={entry.timestamp + i}
          className={cn(
            "font-body text-sm leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300",
            entry.role === "ai" ? "text-left" : "text-right",
          )}
          style={{
            color: entry.role === "ai" ? "var(--seafoam)" : "var(--sand)",
            opacity:
              i < recent.length - 2 ? 0.4 : i < recent.length - 1 ? 0.7 : 1,
          }}
        >
          <span className="text-xs opacity-50 mr-1.5">
            {entry.role === "ai" ? "AI" : "You"}
          </span>
          {entry.text}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================
interface ConversationSessionProps {
  config: SessionConfig;
  onSessionEnd: (data: {
    duration: number;
    transcript: TranscriptEntry[];
    exchanges: number;
  }) => void;
}

export default function ConversationSession({
  config,
  onSessionEnd,
}: ConversationSessionProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);

  const gemini = useGeminiLive({
    onSessionEnd: (reason) => {
      audioCapture.releaseMic();
      onSessionEnd({
        duration: gemini.elapsedSeconds,
        transcript: gemini.transcript,
        exchanges: Math.floor(
          gemini.transcript.filter((t) => t.role === "ai").length,
        ),
      });
    },
  });

  const audioCapture = useAudioCapture({
    minChunkMs: 100,
    onAudioChunk: (base64, mimeType) => {
      gemini.sendAudio(base64, mimeType);
    },
    onAudioLevel: (level) => {
      setAudioLevel(level);
    },
  });

  // Start connection once
  useEffect(() => {
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true;
      gemini.connect(config);
    }
    return () => {
      // Reset so Strict Mode remount can reconnect
      sessionStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start mic once connected
  useEffect(() => {
    if (gemini.status === "connected" && audioCapture.state === "idle") {
      audioCapture.requestMic().then(() => {
        // Auto-start recording (toggle mode by default)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.status]);

  // Handle mic state changes
  useEffect(() => {
    if (audioCapture.state === "ready" && !micActive) {
      // Mic ready — auto-start in toggle mode
      audioCapture.startRecording();
      setMicActive(true);
    }
    if (audioCapture.error) {
      setMicError(audioCapture.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioCapture.state, audioCapture.error]);

  const toggleMic = useCallback(() => {
    if (micActive) {
      audioCapture.stopRecording();
      setMicActive(false);
    } else {
      audioCapture.startRecording();
      setMicActive(true);
    }
  }, [micActive, audioCapture]);

  const handleEndSession = useCallback(() => {
    audioCapture.releaseMic();
    gemini.endSession("user_ended");
  }, [audioCapture, gemini]);

  const totalMinutes = config.sessionLengthMinutes;
  const remaining = totalMinutes * 60 - gemini.elapsedSeconds;
  const showTimeWarning = remaining <= 60 && remaining > 0;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] py-6 px-4">
      {/* Top bar */}
      <div className="w-full max-w-2xl flex items-center justify-between">
        <button
          onClick={handleEndSession}
          className="font-body text-sm px-3 py-1.5 min-h-touch rounded-lg transition-colors duration-200 hover:bg-white/5 cursor-pointer flex items-center gap-1.5"
          style={{ color: "var(--seafoam)", opacity: 0.6 }}
        >
          <PhoneOff className="w-3.5 h-3.5" />
          End Session
        </button>

        {/* Session timer */}
        <div
          className={cn(
            "flex items-center gap-1.5 font-mono text-sm px-3 py-1.5 rounded-lg",
            showTimeWarning && "animate-pulse",
          )}
          style={{
            color: showTimeWarning ? "#f59e0b" : "var(--seafoam)",
            opacity: showTimeWarning ? 1 : 0.5,
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          {formatTime(gemini.elapsedSeconds)}
          <span className="opacity-40">/ {totalMinutes}:00</span>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mt-4">
        <div
          className="flex items-center gap-2 font-body text-xs px-3 py-1 rounded-full"
          style={{
            color: gemini.silenceWarning ? "#f59e0b" : "var(--turquoise)",
            background: gemini.silenceWarning
              ? "rgba(245, 158, 11, 0.1)"
              : "rgba(45, 212, 191, 0.08)",
            border: `1px solid ${gemini.silenceWarning ? "rgba(245, 158, 11, 0.2)" : "rgba(45, 212, 191, 0.15)"}`,
          }}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              gemini.status === "connected" && "animate-pulse",
            )}
            style={{
              background: gemini.silenceWarning
                ? "#f59e0b"
                : gemini.status === "connected"
                  ? "var(--turquoise)"
                  : gemini.status === "connecting"
                    ? "#f59e0b"
                    : "#ef4444",
            }}
          />
          {gemini.status === "connecting"
            ? "Connecting..."
            : gemini.status === "error"
              ? "Connection error"
              : phaseLabel(gemini.phase, gemini.silenceWarning)}
        </div>
      </div>

      {/* Central pulse */}
      <div className="flex-1 flex items-center justify-center py-8">
        <PulseCircle phase={gemini.phase} audioLevel={audioLevel} />
      </div>

      {/* Transcript */}
      <div className="w-full max-w-lg">
        <TranscriptArea entries={gemini.transcript} />
      </div>

      {/* Cost/token indicator */}
      {gemini.tokensUsed > 0 && (
        <div
          className="font-mono text-[10px] mt-2"
          style={{ color: "var(--seafoam)", opacity: 0.3 }}
        >
          ~{gemini.tokensUsed} tokens
        </div>
      )}

      {/* Mic error */}
      {micError && (
        <div
          className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl text-sm font-body"
          style={{
            color: "#ef4444",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {micError}
        </div>
      )}

      {/* Mic button */}
      <div className="mt-6 mb-4 flex flex-col items-center gap-3">
        {/* Audio level ring */}
        <div className="relative">
          <button
            onClick={toggleMic}
            disabled={gemini.status !== "connected"}
            className={cn(
              "relative z-10 w-20 h-20 rounded-full",
              "flex items-center justify-center",
              "transition-all duration-300 cursor-pointer",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              micActive
                ? "bg-[var(--turquoise)]/20 border-2 border-[var(--turquoise)]/50 shadow-[0_0_24px_rgba(45,212,191,0.2)]"
                : "bg-white/5 border-2 border-white/10 hover:border-white/20",
            )}
          >
            {micActive ? (
              <Mic className="w-8 h-8" style={{ color: "var(--turquoise)" }} />
            ) : (
              <MicOff
                className="w-8 h-8"
                style={{ color: "var(--seafoam)", opacity: 0.5 }}
              />
            )}
          </button>

          {/* Level ring */}
          {micActive && (
            <div
              className="absolute inset-[-6px] rounded-full pointer-events-none"
              style={{
                border: `2px solid rgba(45, 212, 191, ${0.1 + audioLevel * 0.5})`,
                transform: `scale(${1 + audioLevel * 0.15})`,
                transition: "all 0.1s ease-out",
              }}
            />
          )}
        </div>

        <p
          className="font-body text-xs"
          style={{ color: "var(--seafoam)", opacity: 0.4 }}
        >
          {micActive ? "Tap to mute" : "Tap to unmute"}
        </p>
      </div>
    </div>
  );
}
