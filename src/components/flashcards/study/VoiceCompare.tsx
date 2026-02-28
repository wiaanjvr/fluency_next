"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Play, RotateCcw, X, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceCompareProps {
  /** URL of the reference audio to compare against (card audio_url). */
  referenceAudioUrl: string | null;
  /** Fallback: text to speak via Web Speech API if no audio URL. */
  referenceText?: string;
  /** Language hint for speech synthesis. */
  lang?: string;
  onClose: () => void;
}

/**
 * Record your own voice and compare it side-by-side with the card's reference
 * audio. Desktop-oriented — uses MediaRecorder + Web Audio for waveform.
 */
export function VoiceCompare({
  referenceAudioUrl,
  referenceText,
  lang = "fr",
  onClose,
}: VoiceCompareProps) {
  const [recording, setRecording] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [playingRef, setPlayingRef] = useState(false);
  const [playingUser, setPlayingUser] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setDuration(0);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setUserAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mr.start(100);
      setRecording(true);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  const reRecord = useCallback(() => {
    if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
    setUserAudioUrl(null);
    setDuration(0);
  }, [userAudioUrl]);

  // Play reference audio
  const playReference = useCallback(() => {
    if (referenceAudioUrl && refAudioRef.current) {
      refAudioRef.current.currentTime = 0;
      refAudioRef.current.play();
      setPlayingRef(true);
    } else if (referenceText && "speechSynthesis" in window) {
      // Fallback: text-to-speech
      const utterance = new SpeechSynthesisUtterance(referenceText);
      utterance.lang = lang;
      utterance.onend = () => setPlayingRef(false);
      window.speechSynthesis.speak(utterance);
      setPlayingRef(true);
    }
  }, [referenceAudioUrl, referenceText, lang]);

  // Play user recording
  const playUser = useCallback(() => {
    if (userAudioUrl && userAudioRef.current) {
      userAudioRef.current.currentTime = 0;
      userAudioRef.current.play();
      setPlayingUser(true);
    }
  }, [userAudioUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (userAudioUrl) URL.revokeObjectURL(userAudioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userAudioUrl]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d2137] p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <Mic className="h-4 w-4 text-teal-400" />
          Record & Compare
        </h4>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Reference column */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider text-center">
            Reference
          </p>
          <button
            onClick={playReference}
            disabled={!referenceAudioUrl && !referenceText}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition text-sm",
              playingRef
                ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
              !referenceAudioUrl &&
                !referenceText &&
                "opacity-40 cursor-not-allowed",
            )}
          >
            <Volume2 className="h-4 w-4" />
            {playingRef ? "Playing..." : "Play"}
          </button>
          {referenceAudioUrl && (
            <audio
              ref={refAudioRef}
              src={referenceAudioUrl}
              onEnded={() => setPlayingRef(false)}
              className="hidden"
            />
          )}
        </div>

        {/* User column */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider text-center">
            Your Voice
          </p>
          {!userAudioUrl ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition text-sm",
                recording
                  ? "border-rose-400/50 bg-rose-500/10 text-rose-300 animate-pulse"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
              )}
            >
              {recording ? (
                <>
                  <Square className="h-4 w-4" />
                  Stop ({formatTime(duration)})
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  Record
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button
                onClick={playUser}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border transition text-sm",
                  playingUser
                    ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
                )}
              >
                <Play className="h-3.5 w-3.5" />
                Play
              </button>
              <button
                onClick={reRecord}
                className="flex items-center justify-center px-3 py-3 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {userAudioUrl && (
            <audio
              ref={userAudioRef}
              src={userAudioUrl}
              onEnded={() => setPlayingUser(false)}
              className="hidden"
            />
          )}
        </div>
      </div>

      <p className="text-[10px] text-white/30 text-center">
        Record yourself and compare with the reference pronunciation
      </p>
    </div>
  );
}
