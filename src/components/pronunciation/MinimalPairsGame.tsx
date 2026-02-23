"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Volume2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AudioButton from "./AudioButton";
import IPASymbol from "./IPASymbol";
import type { MinimalPair } from "@/types/pronunciation";

interface MinimalPairsGameProps {
  language: string;
  onBack: () => void;
  onSessionComplete: (data: {
    items_practiced: number;
    accuracy: number;
    duration_seconds: number;
  }) => void;
}

type GameState =
  | "listening"
  | "choosing"
  | "correct"
  | "incorrect"
  | "finished";

export default function MinimalPairsGame({
  language,
  onBack,
  onSessionComplete,
}: MinimalPairsGameProps) {
  const [pairs, setPairs] = useState<MinimalPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameState, setGameState] = useState<GameState>("listening");
  const [testTarget, setTestTarget] = useState<"a" | "b">("a");
  const [userChoice, setUserChoice] = useState<"a" | "b" | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const startTimeRef = useRef(Date.now());

  // Fetch minimal pairs
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/pronunciation/minimal-pairs?language=${language}`,
        );
        const data = await res.json();
        setPairs(data.pairs || []);
      } catch (err) {
        console.error("Failed to load minimal pairs:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [language]);

  // Randomize test target when moving to next pair
  const randomizeTarget = useCallback(() => {
    setTestTarget(Math.random() > 0.5 ? "a" : "b");
    setUserChoice(null);
    setGameState("listening");
  }, []);

  useEffect(() => {
    randomizeTarget();
  }, [currentIndex, randomizeTarget]);

  const currentPair = pairs[currentIndex];

  const handleChoice = useCallback(
    async (choice: "a" | "b") => {
      if (gameState !== "choosing") return;

      setUserChoice(choice);
      const isCorrect = choice === testTarget;
      setTotalAttempts((prev) => prev + 1);

      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
        setGameState("correct");
      } else {
        setGameState("incorrect");
      }

      // Submit result to API
      if (currentPair) {
        try {
          await fetch("/api/pronunciation/minimal-pairs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pair_id: currentPair.id,
              was_correct: isCorrect,
              phoneme_id: isCorrect
                ? currentPair.phoneme_a_id
                : currentPair.phoneme_b_id,
            }),
          });
        } catch {
          // Best-effort
        }
      }
    },
    [gameState, testTarget, currentPair],
  );

  const handleNext = useCallback(() => {
    if (currentIndex < pairs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameState("finished");
    }
  }, [currentIndex, pairs.length]);

  const handleFinish = useCallback(() => {
    const accuracy =
      totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;
    onSessionComplete({
      items_practiced: totalAttempts,
      accuracy,
      duration_seconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
    });
  }, [totalAttempts, correctCount, onSessionComplete]);

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

  if (pairs.length === 0) {
    return (
      <div className="text-center py-16">
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          No minimal pairs available for this language yet.
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

  // Finished state
  if (gameState === "finished") {
    const accuracy =
      totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div
          className="text-6xl font-display font-bold"
          style={{
            color: accuracy >= 80 ? "var(--turquoise)" : "var(--seafoam)",
          }}
        >
          {accuracy}%
        </div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Session Complete
        </h2>
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.7 }}
        >
          {correctCount} / {totalAttempts} correct ·{" "}
          {Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)} min
        </p>
        <p
          className="font-body text-xs"
          style={{ color: "var(--seafoam)", opacity: 0.5 }}
        >
          {accuracy >= 80
            ? "Excellent discrimination! Your ear is sharpening."
            : accuracy >= 60
              ? "Good progress. Keep listening to the differences."
              : "These sounds are tricky. Replay and focus on the subtle differences."}
        </p>
        <button
          onClick={handleFinish}
          className="px-6 py-3 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg mt-4"
          style={{
            background:
              "linear-gradient(135deg, var(--turquoise), var(--teal))",
            color: "var(--midnight)",
          }}
        >
          Done
        </button>
      </div>
    );
  }

  if (!currentPair) return null;

  const phonemeA = currentPair.phoneme_a;
  const phonemeB = currentPair.phoneme_b;

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
            {currentIndex + 1} / {pairs.length}
          </span>
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / pairs.length) * 100}%`,
                background:
                  "linear-gradient(90deg, var(--turquoise), var(--teal))",
              }}
            />
          </div>
          <span
            className="text-xs font-body tabular-nums"
            style={{ color: "var(--turquoise)" }}
          >
            {correctCount}/{totalAttempts}
          </span>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1">
        <h2
          className="font-display text-2xl md:text-3xl font-bold"
          style={{ color: "var(--sand)" }}
        >
          Minimal Pairs
        </h2>
        <p
          className="font-body text-sm"
          style={{ color: "var(--seafoam)", opacity: 0.6 }}
        >
          Listen to both sounds. Then identify which one you hear.
        </p>
      </div>

      {/* Two phoneme cards side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Sound A */}
        <button
          onClick={() =>
            gameState === "choosing" ? handleChoice("a") : undefined
          }
          className={cn(
            "rounded-2xl border p-6 flex flex-col items-center gap-3 transition-all duration-300",
            "bg-gradient-to-br from-[#0d2137]/80 to-[#0a1628]/90",
            gameState === "correct" && userChoice === "a"
              ? "border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
              : gameState === "incorrect" && userChoice === "a"
                ? "border-red-400/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                : gameState === "correct" && testTarget === "a"
                  ? "border-emerald-400/30"
                  : gameState === "incorrect" && testTarget === "a"
                    ? "border-emerald-400/30"
                    : "border-white/10 hover:border-white/20",
            gameState === "choosing" && "cursor-pointer hover:-translate-y-1",
          )}
          disabled={gameState !== "choosing"}
        >
          <span
            className="text-xs font-body uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            Sound A
          </span>
          {phonemeA && <IPASymbol symbol={phonemeA.ipa_symbol} size="lg" />}
          <AudioButton
            src={currentPair.audio_url_a}
            text={currentPair.example_word_a}
            language={language}
            label={currentPair.example_word_a}
            size="md"
          />
          {/* Show result icon */}
          {(gameState === "correct" || gameState === "incorrect") &&
            testTarget === "a" && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-body">
                <Check className="w-3.5 h-3.5" />
                <span>Correct answer</span>
              </div>
            )}
        </button>

        {/* Sound B */}
        <button
          onClick={() =>
            gameState === "choosing" ? handleChoice("b") : undefined
          }
          className={cn(
            "rounded-2xl border p-6 flex flex-col items-center gap-3 transition-all duration-300",
            "bg-gradient-to-br from-[#0d2137]/80 to-[#0a1628]/90",
            gameState === "correct" && userChoice === "b"
              ? "border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
              : gameState === "incorrect" && userChoice === "b"
                ? "border-red-400/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                : gameState === "correct" && testTarget === "b"
                  ? "border-emerald-400/30"
                  : gameState === "incorrect" && testTarget === "b"
                    ? "border-emerald-400/30"
                    : "border-white/10 hover:border-white/20",
            gameState === "choosing" && "cursor-pointer hover:-translate-y-1",
          )}
          disabled={gameState !== "choosing"}
        >
          <span
            className="text-xs font-body uppercase tracking-wider"
            style={{ color: "var(--seafoam)", opacity: 0.5 }}
          >
            Sound B
          </span>
          {phonemeB && <IPASymbol symbol={phonemeB.ipa_symbol} size="lg" />}
          <AudioButton
            src={currentPair.audio_url_b}
            text={currentPair.example_word_b}
            language={language}
            label={currentPair.example_word_b}
            size="md"
          />
          {(gameState === "correct" || gameState === "incorrect") &&
            testTarget === "b" && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 font-body">
                <Check className="w-3.5 h-3.5" />
                <span>Correct answer</span>
              </div>
            )}
        </button>
      </div>

      {/* Test audio — "Which one did you hear?" */}
      <div className="flex flex-col items-center gap-3 py-4">
        {gameState === "listening" && (
          <>
            <p
              className="font-body text-sm font-medium"
              style={{ color: "var(--sand)" }}
            >
              Listen to both sounds above, then tap the play button below:
            </p>
            <AudioButton
              src={
                testTarget === "a"
                  ? currentPair.audio_url_a
                  : currentPair.audio_url_b
              }
              text={
                testTarget === "a"
                  ? currentPair.example_word_a
                  : currentPair.example_word_b
              }
              language={language}
              label="Mystery sound"
              size="lg"
              onEnd={() => setGameState("choosing")}
            />
            <button
              onClick={() => setGameState("choosing")}
              className="text-xs font-body mt-2 opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: "var(--turquoise)" }}
            >
              Ready to choose →
            </button>
          </>
        )}

        {gameState === "choosing" && (
          <div className="space-y-3 text-center">
            <p
              className="font-display text-lg font-semibold"
              style={{ color: "var(--sand)" }}
            >
              Which one did you hear?
            </p>
            <p
              className="font-body text-xs"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              Tap Sound A or Sound B above
            </p>
            {/* Replay button */}
            <AudioButton
              src={
                testTarget === "a"
                  ? currentPair.audio_url_a
                  : currentPair.audio_url_b
              }
              text={
                testTarget === "a"
                  ? currentPair.example_word_a
                  : currentPair.example_word_b
              }
              language={language}
              label="Replay"
              size="md"
            />
          </div>
        )}

        {/* Correct feedback */}
        {gameState === "correct" && (
          <div className="text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="font-display text-lg font-semibold text-emerald-400">
                Correct!
              </span>
            </div>
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--turquoise), var(--teal))",
                color: "var(--midnight)",
              }}
            >
              Next Pair →
            </button>
          </div>
        )}

        {/* Incorrect feedback */}
        {gameState === "incorrect" && (
          <div className="text-center space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-center gap-2">
              <X className="w-5 h-5 text-red-400" />
              <span className="font-display text-lg font-semibold text-red-400">
                Not quite
              </span>
            </div>

            {/* Difference explanation */}
            <div
              className="rounded-xl border border-white/10 p-4 max-w-md mx-auto text-left space-y-2"
              style={{ background: "rgba(13, 33, 55, 0.6)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle
                  className="w-4 h-4"
                  style={{ color: "var(--turquoise)" }}
                />
                <span
                  className="text-xs font-body font-medium"
                  style={{ color: "var(--turquoise)" }}
                >
                  Hear the difference
                </span>
              </div>
              {phonemeA && (
                <p
                  className="text-xs font-body"
                  style={{ color: "var(--seafoam)", opacity: 0.8 }}
                >
                  <span className="font-serif text-[var(--turquoise)]">
                    /{phonemeA.ipa_symbol}/
                  </span>{" "}
                  — {phonemeA.description?.split(".")[0]}.
                </p>
              )}
              {phonemeB && (
                <p
                  className="text-xs font-body"
                  style={{ color: "var(--seafoam)", opacity: 0.8 }}
                >
                  <span className="font-serif text-[var(--turquoise)]">
                    /{phonemeB.ipa_symbol}/
                  </span>{" "}
                  — {phonemeB.description?.split(".")[0]}.
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              {/* Replay both */}
              <AudioButton
                src={currentPair.audio_url_a}
                text={currentPair.example_word_a}
                language={language}
                label={`A: ${currentPair.example_word_a}`}
                size="sm"
              />
              <AudioButton
                src={currentPair.audio_url_b}
                text={currentPair.example_word_b}
                language={language}
                label={`B: ${currentPair.example_word_b}`}
                size="sm"
              />
            </div>

            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl text-sm font-body font-medium transition-all hover:shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--turquoise), var(--teal))",
                color: "var(--midnight)",
              }}
            >
              Next Pair →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
