"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  QuizQuestion,
  WaterCaustics,
  FeedbackPanel,
  RoundComplete,
} from "@/components/duel";
import { ArrowLeft, Loader2, Volume2, VolumeX } from "lucide-react";
import type { DuelQuestion, DuelRound, DuelCategory } from "@/types/duel";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/duel";
import "@/styles/ocean-theme.css";

// ============================================================================
// Play Screen Content
// ============================================================================
function PlayContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  userId,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  userId: string;
}) {
  const router = useRouter();
  const { duelId } = useParams<{ duelId: string }>();

  const [round, setRound] = useState<DuelRound | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<boolean[] | null>(null);
  const [scoreThisRound, setScoreThisRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Feedback panel state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackCorrect, setFeedbackCorrect] = useState(false);
  const [feedbackCorrectAnswer, setFeedbackCorrectAnswer] = useState("");
  const [feedbackExplanation, setFeedbackExplanation] = useState<
    string | undefined
  >();

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  // ─── Fetch current round ───────────────────────────────────────────

  useEffect(() => {
    const fetchRound = async () => {
      try {
        const res = await fetch(`/api/duels/${duelId}`);
        if (!res.ok) {
          router.push("/propel/duel");
          return;
        }
        const data = await res.json();
        const duel = data.duel;

        // Check if it's the user's turn
        if (duel.current_turn !== userId) {
          router.push(`/propel/duel/${duelId}`);
          return;
        }

        // Find current round
        const currentRound = (data.rounds || []).find(
          (r: DuelRound) => r.round_number === duel.current_round,
        );

        if (!currentRound) {
          setError("No questions available for this round.");
          setLoading(false);
          return;
        }

        // Check if user already submitted
        const isChallenger = data.isChallenger;
        const alreadySubmitted = isChallenger
          ? currentRound.challenger_completed_at
          : currentRound.opponent_completed_at;

        if (alreadySubmitted) {
          router.push(`/propel/duel/${duelId}`);
          return;
        }

        setRound(currentRound);
      } catch {
        setError("Failed to load round.");
      } finally {
        setLoading(false);
      }
    };

    fetchRound();
  }, [duelId, userId, router]);

  // ─── Answer submission per question ────────────────────────────────

  const handleAnswerSubmit = (answer: string) => {
    if (!round) return;
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);

    // Determine feedback
    const q = round.questions[currentQuestion];
    const correct =
      answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();

    setFeedbackCorrect(correct);
    setFeedbackCorrectAnswer(q.correct_answer);
    setFeedbackExplanation(q.explanation);
    setShowFeedback(true);
  };

  // Continue after feedback panel
  const handleFeedbackContinue = () => {
    setShowFeedback(false);

    if (currentQuestion < (round?.questions.length || 7) - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // All questions answered — submit the round
      submitRound(answers);
    }
  };

  // ─── Submit the full round ─────────────────────────────────────────

  const submitRound = async (finalAnswers: Record<number, string>) => {
    if (!round || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/duels/${duelId}/submit-turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_id: round.id,
          answers: finalAnswers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      const data = await res.json();
      setResults(data.correct);
      setScoreThisRound(data.score_this_round);
      setShowSummary(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading / Error states ────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <OceanBackground>
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="text-center space-y-4">
            <p className="font-body text-sm" style={{ color: "#f87171" }}>
              {error}
            </p>
            <Link
              href={`/propel/duel/${duelId}`}
              className="inline-flex items-center gap-2 font-body text-sm hover:underline"
              style={{ color: "#3dd6b5" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Duel
            </Link>
          </div>
        </div>
      </OceanBackground>
    );
  }

  if (!round) return <LoadingScreen />;

  const questions = round.questions;
  const totalQuestions = questions.length;

  // ─── Round Complete screen ─────────────────────────────────────────

  if (showSummary && results) {
    // Build category breakdown
    const categoryBreakdown = questions.reduce(
      (acc, q, i) => {
        const cat = q.category as DuelCategory;
        if (!acc[cat]) acc[cat] = { correct: 0, total: 0 };
        acc[cat].total++;
        if (results[i]) acc[cat].correct++;
        return acc;
      },
      {} as Record<string, { correct: number; total: number }>,
    );

    return (
      <OceanBackground>
        <DepthSidebar wordCount={wordsEncountered} scrollable={false} />
        <OceanNavigation
          streak={streak}
          avatarUrl={avatarUrl}
          currentPath={`/propel/duel/${duelId}/play`}
          isAdmin={isAdmin}
          targetLanguage={targetLanguage}
          wordsEncountered={wordsEncountered}
          onBeforeNavigate={handleNavigation}
        />

        <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
          <div className="max-w-xl mx-auto w-full flex items-center justify-center flex-1">
            <RoundComplete
              score={scoreThisRound}
              totalQuestions={totalQuestions}
              questions={questions}
              results={results}
              answers={answers}
              onReturn={() => router.push(`/propel/duel/${duelId}`)}
            />
          </div>
        </div>
      </OceanBackground>
    );
  }

  // ─── Quiz screen ───────────────────────────────────────────────────

  const question = questions[currentQuestion];

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath={`/propel/duel/${duelId}/play`}
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      {/* Water caustics overlay */}
      <WaterCaustics />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
        <div className="max-w-xl mx-auto w-full">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/propel/duel/${duelId}`}
              className="inline-flex items-center gap-2 font-body text-xs transition-opacity duration-200 hover:opacity-70"
              style={{ color: "#718096" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Exit
            </Link>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                color: soundEnabled ? "#3dd6b5" : "#718096",
              }}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>

          {submitting ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#3dd6b5" }}
              />
              <p className="font-body text-sm" style={{ color: "#718096" }}>
                Submitting your answers…
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <QuizQuestion
                key={currentQuestion}
                question={question}
                questionNumber={currentQuestion + 1}
                totalQuestions={totalQuestions}
                onSubmit={handleAnswerSubmit}
                soundEnabled={soundEnabled}
                disabled={showFeedback}
              />
            </AnimatePresence>
          )}

          {/* Feedback panel overlay */}
          <AnimatePresence>
            {showFeedback && (
              <FeedbackPanel
                isCorrect={feedbackCorrect}
                correctAnswer={feedbackCorrectAnswer}
                explanation={feedbackExplanation}
                onContinue={handleFeedbackContinue}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function DuelPlayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);
      setAvatarUrl(
        user.user_metadata?.avatar_url || user.user_metadata?.picture,
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("streak, target_language")
        .eq("id", user.id)
        .single();

      if (profile) {
        setStreak(profile.streak ?? 0);
        setTargetLanguage(profile.target_language ?? "fr");
      }

      const { data: allWords } = await supabase
        .from("learner_words_v2")
        .select("id")
        .eq("user_id", user.id)
        .eq("language", profile?.target_language ?? "fr");

      setWordsEncountered(allWords?.length ?? 0);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      setIsAdmin(!!adminRow);
      setLoading(false);
    };

    load();
  }, [supabase, router]);

  if (loading) return <LoadingScreen />;

  return (
    <ProtectedRoute>
      <PlayContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        userId={userId}
      />
    </ProtectedRoute>
  );
}
