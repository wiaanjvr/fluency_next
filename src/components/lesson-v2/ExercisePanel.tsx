"use client";

/**
 * ExercisePanel — Renders the post-story exercise based on mastery stage
 *
 * Exercise types:
 * - comprehension (0-29 mastered): Multiple-choice meaning check in English
 * - guided-recall (30-74): Fill-in-the-blank with target word
 * - constrained-production (75-149): Build a sentence from key words
 * - full-production (150+): Write entirely in target language
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LessonExercise,
  ComprehensionExercise,
  GuidedRecallExercise,
  ConstrainedProductionExercise,
  FullProductionExercise,
} from "@/types/lesson-v2";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Brain,
  PenLine,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  exercise: LessonExercise;
  onComplete: (response: string, correct: boolean) => void;
}

export default function ExercisePanel({ exercise, onComplete }: Props) {
  switch (exercise.type) {
    case "comprehension":
      return <ComprehensionPanel exercise={exercise} onComplete={onComplete} />;
    case "guided-recall":
      return <GuidedRecallPanel exercise={exercise} onComplete={onComplete} />;
    case "constrained-production":
      return (
        <ConstrainedProductionPanel
          exercise={exercise}
          onComplete={onComplete}
        />
      );
    case "full-production":
      return (
        <FullProductionPanel exercise={exercise} onComplete={onComplete} />
      );
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMPREHENSION (0-29 words mastered)
// ═══════════════════════════════════════════════════════════════════

function ComprehensionPanel({
  exercise,
  onComplete,
}: {
  exercise: ComprehensionExercise;
  onComplete: (response: string, correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = selected === exercise.correctIndex;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Comprehension Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-lg font-medium">{exercise.question}</p>

        <div className="space-y-2">
          {exercise.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => !submitted && setSelected(idx)}
              disabled={submitted}
              className={cn(
                "w-full text-left p-3 rounded-xl border-2 transition-all",
                selected === idx && !submitted && "border-primary bg-primary/5",
                submitted &&
                  idx === exercise.correctIndex &&
                  "border-green-500 bg-green-50 dark:bg-green-500/10",
                submitted &&
                  selected === idx &&
                  idx !== exercise.correctIndex &&
                  "border-red-500 bg-red-50 dark:bg-red-500/10",
                !submitted &&
                  selected !== idx &&
                  "border-border hover:border-primary/50",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground w-6">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span>{option}</span>
                {submitted && idx === exercise.correctIndex && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-green-600" />
                )}
                {submitted &&
                  selected === idx &&
                  idx !== exercise.correctIndex && (
                    <XCircle className="ml-auto h-5 w-5 text-red-500" />
                  )}
              </div>
            </button>
          ))}
        </div>

        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={selected === null}
            className="w-full"
            size="lg"
          >
            Check Answer
          </Button>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "p-3 rounded-xl text-center font-medium",
                isCorrect
                  ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400",
              )}
            >
              {isCorrect ? "Correct!" : "Not quite — review the story again!"}
            </div>
            <Button
              onClick={() => onComplete(exercise.options[selected!], isCorrect)}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// GUIDED RECALL (30-74 words mastered)
// ═══════════════════════════════════════════════════════════════════

function GuidedRecallPanel({
  exercise,
  onComplete,
}: {
  exercise: GuidedRecallExercise;
  onComplete: (response: string, correct: boolean) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isCorrect =
    answer.toLowerCase().trim() === exercise.removedWord.toLowerCase().trim();

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setSubmitted(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          Fill in the Blank
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentence with blank */}
        <div className="p-4 rounded-xl bg-muted/50 text-lg leading-relaxed">
          {exercise.sentenceWithBlank}
        </div>

        {/* Hint */}
        {exercise.hint && (
          <p className="text-sm text-muted-foreground italic">
            Hint: {exercise.hint}
          </p>
        )}

        {/* Multiple choice or free input */}
        {exercise.options ? (
          <div className="grid grid-cols-2 gap-2">
            {exercise.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => !submitted && setAnswer(opt)}
                disabled={submitted}
                className={cn(
                  "p-3 rounded-xl border-2 transition-all text-center font-medium",
                  answer === opt && !submitted && "border-primary bg-primary/5",
                  submitted &&
                    opt === exercise.removedWord &&
                    "border-green-500 bg-green-50 dark:bg-green-500/10",
                  submitted &&
                    answer === opt &&
                    opt !== exercise.removedWord &&
                    "border-red-500 bg-red-50 dark:bg-red-500/10",
                  !submitted &&
                    answer !== opt &&
                    "border-border hover:border-primary/50",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type the missing word..."
            className="text-lg text-center"
            disabled={submitted}
            onKeyDown={(e) => {
              if (e.key === "Enter" && answer.trim()) handleSubmit();
            }}
            autoFocus
          />
        )}

        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!answer.trim()}
            className="w-full"
            size="lg"
          >
            Check Answer
          </Button>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "p-3 rounded-xl text-center",
                isCorrect
                  ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
              )}
            >
              {isCorrect ? (
                <span className="font-medium">Correct!</span>
              ) : (
                <span>
                  The answer was: <strong>{exercise.removedWord}</strong>
                </span>
              )}
            </div>
            <Button
              onClick={() => onComplete(answer, isCorrect)}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONSTRAINED PRODUCTION (75-149 words mastered)
// ═══════════════════════════════════════════════════════════════════

function ConstrainedProductionPanel({
  exercise,
  onComplete,
}: {
  exercise: ConstrainedProductionExercise;
  onComplete: (response: string, correct: boolean) => void;
}) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Check if response contains the key words
  const containsKeyWords = exercise.keyWords.every((kw) =>
    response.toLowerCase().includes(kw.toLowerCase()),
  );

  const handleSubmit = () => {
    if (!response.trim()) return;
    setSubmitted(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Build a Sentence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base">{exercise.prompt}</p>

        {/* Key words to use */}
        <div className="flex flex-wrap gap-2">
          {exercise.keyWords.map((kw) => (
            <span
              key={kw}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border",
                submitted && response.toLowerCase().includes(kw.toLowerCase())
                  ? "bg-green-100 border-green-300 text-green-800 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400"
                  : "bg-primary/10 border-primary/20 text-primary",
              )}
            >
              {kw}
            </span>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{exercise.mixingFormat}</p>

        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write your sentence..."
          className="text-base min-h-[80px]"
          disabled={submitted}
          autoFocus
        />

        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!response.trim()}
            className="w-full"
            size="lg"
          >
            Submit
          </Button>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "p-3 rounded-xl text-center",
                containsKeyWords
                  ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
              )}
            >
              {containsKeyWords
                ? "Great job using the key words!"
                : "Try to include all key words next time."}
            </div>

            {exercise.sampleAnswer && (
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Sample answer:
                </p>
                <p className="text-sm font-medium">{exercise.sampleAnswer}</p>
              </div>
            )}

            <Button
              onClick={() => onComplete(response, containsKeyWords)}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FULL PRODUCTION (150+ words mastered)
// ═══════════════════════════════════════════════════════════════════

function FullProductionPanel({
  exercise,
  onComplete,
}: {
  exercise: FullProductionExercise;
  onComplete: (response: string, correct: boolean) => void;
}) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const containsKeyWords = exercise.keyWords.every((kw) =>
    response.toLowerCase().includes(kw.toLowerCase()),
  );

  const handleSubmit = () => {
    if (!response.trim()) return;
    setSubmitted(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          Write in Target Language
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base">{exercise.prompt}</p>

        <div className="flex flex-wrap gap-2">
          {exercise.keyWords.map((kw) => (
            <span
              key={kw}
              className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium"
            >
              {kw}
            </span>
          ))}
        </div>

        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write entirely in the target language..."
          className="text-base min-h-[80px]"
          disabled={submitted}
          autoFocus
        />

        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!response.trim()}
            className="w-full"
            size="lg"
          >
            Submit
          </Button>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "p-3 rounded-xl text-center",
                containsKeyWords
                  ? "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400",
              )}
            >
              {containsKeyWords
                ? "Excellent work!"
                : "Try to include the key words."}
            </div>

            {exercise.sampleAnswer && (
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  Sample answer:
                </p>
                <p className="text-sm font-medium">{exercise.sampleAnswer}</p>
              </div>
            )}

            <Button
              onClick={() => onComplete(response, containsKeyWords)}
              className="w-full"
              size="lg"
            >
              Complete Lesson
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
