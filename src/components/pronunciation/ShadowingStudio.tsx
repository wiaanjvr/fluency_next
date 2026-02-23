"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Loader2,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudioButton from "./AudioButton";
import RecordButton from "./RecordButton";
import WaveformDisplay from "./WaveformDisplay";
import IPASymbol from "./IPASymbol";
import type { ShadowingPhrase, ShadowingAnalysis } from "@/types/pronunciation";

interface ShadowingStudioProps {
  language: string;
  onBack: () => void;
  onSessionComplete: (data: {
    items_practiced: number;
    accuracy: number;
    duration_seconds: number;
  }) => void;
}

type StudioState =
  | "listen"
  | "ready_to_record"
  | "recording"
  | "analyzing"
  | "result";

// Language code to BCP-47 mapping for Web Speech API
const SPEECH_LANG_MAP: Record<string, string> = {
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
};

export default function ShadowingStudio({
  language,
  onBack,
  onSessionComplete,
}: ShadowingStudioProps) {
  const [phrases, setPhrases] = useState<ShadowingPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studioState, setStudioState] = useState<StudioState>("listen");
  const [analysis, setAnalysis] = useState<ShadowingAnalysis | null>(null);
  const [userBlob, setUserBlob] = useState<Blob | null>(null);
  const [userTranscript, setUserTranscript] = useState("");
  const [scores, setScores] = useState<number[]>([]);

  const startTimeRef = useRef(Date.now());
  const recognitionRef = useRef<any>(null);

  // Fetch shadowing phrases (A1 + A2)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a1Res, a2Res] = await Promise.all([
          fetch(`/api/pronunciation/shadowing?language=${language}&level=A1`),
          fetch(`/api/pronunciation/shadowing?language=${language}&level=A2`),
        ]);
        const a1Data = await a1Res.json();
        const a2Data = await a2Res.json();
        setPhrases([...(a1Data.phrases || []), ...(a2Data.phrases || [])]);
      } catch (err) {
        console.error("Failed to load shadowing phrases:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [language]);

  // Start speech recognition when recording begins
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setUserTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [language]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      stopSpeechRecognition();
      setUserBlob(blob);
      setStudioState("analyzing");

      const currentPhrase = phrases[currentIndex];
      if (!currentPhrase) return;

      // Wait a beat for speech recognition to finalize
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get the final transcript
      const transcript = userTranscript || "(recording captured)";

      try {
        const res = await fetch("/api/pronunciation/shadowing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phrase_id: currentPhrase.id,
            user_transcript: transcript,
            language,
          }),
        });

        const data = await res.json();
        setAnalysis(data.analysis);
        setScores((prev) => [...prev, data.analysis.overall_score]);
        setStudioState("result");
      } catch (err) {
        console.error("Analysis failed:", err);
        setAnalysis({
          overall_score: 50,
          phoneme_feedback: [],
          general_tip: "Keep practicing — we couldn't fully analyze this time.",
        });
        setStudioState("result");
      }
    },
    [phrases, currentIndex, language, userTranscript, stopSpeechRecognition],
  );

  const handleRetry = useCallback(() => {
    setStudioState("listen");
    setAnalysis(null);
    setUserBlob(null);
    setUserTranscript("");
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      handleRetry();
    } else {
      // Session complete
      const avgScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
      onSessionComplete({
        items_practiced: scores.length,
        accuracy: avgScore,
        duration_seconds: Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        ),
      });
    }
  }, [currentIndex, phrases.length, scores, onSessionComplete, handleRetry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "var(--turquoise)" }}
        />
      </div>
    );
  }

  if (phrases.length === 0) {
    return (
      <div className="text-center py-16">
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          No shadowing phrases available for this language yet.
        </p>
        <button
          onClick={onBack}
          className="mt-4 text-sm font-body"
          style={{ color: "var(--turquoise)" }}
        >
          ← Back
        </button>
      </div>
    );
  }

  const currentPhrase = phrases[currentIndex];
  if (!currentPhrase) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-body transition-opacity hover:opacity-100 opacity-60"
          style={{ color: "var(--turquoise)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <span
            className="text-xs font-body"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            {currentIndex + 1} / {phrases.length}
          </span>
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / phrases.length) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--turquoise), var(--teal))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h2
          className="font-display text-2xl md:text-3xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Shadowing Studio
        </h2>
        <p
          className="font-body text-xs"
          style={{ color: "var(--seafoam)", opacity: 0.5 }}
        >
          {currentPhrase.cefr_level} · Listen, then record yourself
        </p>
      </div>

      {/* Phrase display */}
      <div className="text-center space-y-3 py-4">
        <p
          className="font-display text-xl md:text-2xl font-semibold leading-relaxed"
          style={{ color: "var(--sand)" }}
        >
          {currentPhrase.text}
        </p>
        {currentPhrase.ipa_transcription && (
          <p
            className="font-serif text-sm tracking-wide"
            style={{ color: "var(--turquoise)", opacity: 0.7 }}
          >
            [{currentPhrase.ipa_transcription}]
          </p>
        )}
      </div>

      {/* Native audio play button */}
      <div className="flex justify-center">
        <AudioButton
          src={currentPhrase.audio_url}
          text={currentPhrase.text}
          language={language}
          label="Listen to native speaker"
          size="lg"
          onEnd={() => {
            if (studioState === "listen") {
              setStudioState("ready_to_record");
            }
          }}
        />
      </div>

      {/* Recording section */}
      {(studioState === "ready_to_record" || studioState === "recording") && (
        <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="font-body text-sm" style={{ color: "var(--sand)" }}>
            Now, repeat what you heard:
          </p>
          <RecordButton
            onRecordingComplete={(blob) => {
              setStudioState("recording");
              handleRecordingComplete(blob);
            }}
            size="lg"
            showPermissionHint={true}
          />
        </div>
      )}

      {/* Show a "tap to record" hint if just listened */}
      {studioState === "listen" && (
        <div className="text-center">
          <p
            className="font-body text-xs"
            style={{ color: "var(--seafoam)", opacity: 0.4 }}
          >
            Listen to the phrase first, then you'll record
          </p>
        </div>
      )}

      {/* Analyzing state */}
      {studioState === "analyzing" && (
        <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in duration-300">
          <Loader2
            className="w-8 h-8 animate-spin"
            style={{ color: "var(--turquoise)" }}
          />
          <p
            className="font-body text-sm"
            style={{ color: "var(--seafoam)", opacity: 0.7 }}
          >
            Analyzing your pronunciation…
          </p>
        </div>
      )}

      {/* Result state */}
      {studioState === "result" && analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Score badge */}
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                "text-5xl font-display font-bold",
                analysis.overall_score >= 80
                  ? "text-emerald-400"
                  : analysis.overall_score >= 50
                    ? "text-[var(--turquoise)]"
                    : "text-amber-400",
              )}
            >
              {analysis.overall_score}%
            </div>
            <span
              className="text-xs font-body"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              match
            </span>
          </div>

          {/* Waveform comparison */}
          {(currentPhrase.audio_url || userBlob) && (
            <WaveformDisplay
              nativeAudioUrl={currentPhrase.audio_url}
              userAudioBlob={userBlob}
              height={100}
              className="w-full"
            />
          )}

          {/* Phoneme feedback */}
          {analysis.phoneme_feedback.length > 0 && (
            <div className="space-y-3">
              <p
                className="text-xs font-body font-medium uppercase tracking-wider"
                style={{ color: "var(--turquoise)", opacity: 0.6 }}
              >
                Sound-level feedback
              </p>
              {analysis.phoneme_feedback.map((fb, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 p-4 space-y-1"
                  style={{ background: "rgba(13, 33, 55, 0.5)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-[var(--turquoise)]">
                      {fb.target}
                    </span>
                    <span
                      className="text-xs font-body"
                      style={{ color: "var(--seafoam)", opacity: 0.4 }}
                    >
                      →
                    </span>
                    <span className="font-serif text-red-400">
                      {fb.produced}
                    </span>
                    <span
                      className="text-xs font-body ml-auto"
                      style={{ color: "var(--seafoam)", opacity: 0.5 }}
                    >
                      in "{fb.word}"
                    </span>
                  </div>
                  <p
                    className="text-xs font-body"
                    style={{ color: "var(--seafoam)", opacity: 0.7 }}
                  >
                    {fb.advice}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* General tip */}
          {analysis.general_tip && (
            <div
              className="rounded-xl border border-[var(--turquoise)]/20 p-4"
              style={{ background: "rgba(61, 214, 181, 0.05)" }}
            >
              <p
                className="text-sm font-body"
                style={{ color: "var(--turquoise)" }}
              >
                💡 {analysis.general_tip}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-body transition-all hover:border-white/20 hover:bg-white/5"
              style={{ color: "var(--seafoam)" }}
            >
              <RotateCcw className="w-4 h-4" />
              Retry
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--turquoise), var(--teal))",
                color: "var(--midnight)",
              }}
            >
              {currentIndex < phrases.length - 1 ? (
                <>
                  Next Phrase
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Finish"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
