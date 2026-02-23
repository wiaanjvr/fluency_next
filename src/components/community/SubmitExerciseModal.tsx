"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { countOpenSubmissions } from "@/lib/community";
import { Pen, Mic, RefreshCw, Loader2 } from "lucide-react";
import type { ExerciseType, SubmitForReviewPayload } from "@/types/community";

interface SubmitExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill data when coming from a lesson */
  prefill?: {
    exercise_type?: ExerciseType;
    prompt?: string;
    content?: string;
    language?: string;
  };
}

const EXERCISE_TYPES: {
  value: ExerciseType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "writing", label: "Writing", icon: <Pen className="h-4 w-4" /> },
  { value: "speaking", label: "Speaking", icon: <Mic className="h-4 w-4" /> },
  {
    value: "translation",
    label: "Translation",
    icon: <RefreshCw className="h-4 w-4" />,
  },
];

const MIN_CHARS = 50;
const MAX_CHARS = 500;

export function SubmitExerciseModal({
  open,
  onOpenChange,
  prefill,
}: SubmitExerciseModalProps) {
  const { user } = useAuth();
  const { submitForReview, isSubmitting } = useCommunityStore();

  const [exerciseType, setExerciseType] = useState<ExerciseType>(
    prefill?.exercise_type ?? "writing",
  );
  const [prompt, setPrompt] = useState(prefill?.prompt ?? "");
  const [content, setContent] = useState(prefill?.content ?? "");
  const [language, setLanguage] = useState(prefill?.language ?? "");
  const [openCount, setOpenCount] = useState(0);
  const [maxOpen, setMaxOpen] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load current submission count on open
  useEffect(() => {
    if (open && user?.id) {
      countOpenSubmissions(user.id).then((count) => setOpenCount(count));
      // We'd need profile info for tier, but default to 3 for free
      setMaxOpen(3); // Will be updated when submission is attempted
    }
  }, [open, user?.id]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
      if (prefill) {
        setExerciseType(prefill.exercise_type ?? "writing");
        setPrompt(prefill.prompt ?? "");
        setContent(prefill.content ?? "");
        setLanguage(prefill.language ?? "");
      }
    }
  }, [open, prefill]);

  const contentLength = content.length;
  const isWritingType =
    exerciseType === "writing" || exerciseType === "translation";
  const isContentValid = isWritingType
    ? contentLength >= MIN_CHARS && contentLength <= MAX_CHARS
    : true;
  const isFormValid = isContentValid;
  const remaining = maxOpen - openCount;

  const handleSubmit = useCallback(async () => {
    if (!isFormValid || isSubmitting) return;
    setError(null);

    try {
      const payload: SubmitForReviewPayload = {
        exercise_type: exerciseType,
        prompt: prompt.trim() || undefined,
        content: content.trim() || undefined,
        language: language || undefined,
      };
      await submitForReview(payload);
      setSuccess(true);
      setOpenCount((c) => c + 1);
      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setContent("");
        setPrompt("");
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
      );
    }
  }, [
    exerciseType,
    prompt,
    content,
    language,
    isFormValid,
    isSubmitting,
    submitForReview,
    onOpenChange,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md w-full">
        <SheetHeader className="mb-6 pt-2">
          <SheetTitle>Submit for Review</SheetTitle>
          <SheetDescription>
            Get feedback from the community on your work
          </SheetDescription>
        </SheetHeader>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-ocean-turquoise/15 flex items-center justify-center mb-4">
              <span className="text-2xl">🌊</span>
            </div>
            <p className="text-lg font-display font-semibold text-sand mb-1">
              Submitted!
            </p>
            <p className="text-sm text-seafoam/50">
              The community will review your work soon.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Remaining slots */}
            <div className="rounded-xl border border-ocean-turquoise/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-seafoam/50">
                Open submission slots
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  remaining <= 0 ? "text-red-400" : "text-ocean-turquoise",
                )}
              >
                {remaining} of {maxOpen} remaining
              </span>
            </div>

            {remaining <= 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center">
                <p className="text-sm text-amber-400/80">
                  You&apos;ve reached your limit. Close existing submissions or
                  upgrade for more slots.
                </p>
              </div>
            )}

            {/* Exercise type selector */}
            <div>
              <label className="text-xs text-seafoam/50 font-medium mb-2 block">
                Exercise type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {EXERCISE_TYPES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setExerciseType(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-medium transition-all border",
                      exerciseType === value
                        ? "bg-ocean-turquoise/15 text-ocean-turquoise border-ocean-turquoise/25"
                        : "bg-white/[0.02] text-seafoam/50 border-white/5 hover:bg-white/5",
                    )}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language (auto-filled, but editable) */}
            <div>
              <label className="text-xs text-seafoam/50 font-medium mb-1.5 block">
                Language
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="bg-white/[0.02] border-ocean-turquoise/10">
                  <SelectValue placeholder="Auto-detected from profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 French</SelectItem>
                  <SelectItem value="de">🇩🇪 German</SelectItem>
                  <SelectItem value="es">🇪🇸 Spanish</SelectItem>
                  <SelectItem value="it">🇮🇹 Italian</SelectItem>
                  <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                  <SelectItem value="nl">🇳🇱 Dutch</SelectItem>
                  <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                  <SelectItem value="ja">🇯🇵 Japanese</SelectItem>
                  <SelectItem value="ko">🇰🇷 Korean</SelectItem>
                  <SelectItem value="zh">🇨🇳 Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Prompt */}
            <div>
              <label className="text-xs text-seafoam/50 font-medium mb-1.5 block">
                Exercise prompt (optional)
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What was the exercise about?"
                className="min-h-[60px] bg-white/[0.02] border-ocean-turquoise/10 text-sm"
              />
            </div>

            {/* Content (for writing/translation) */}
            {isWritingType && (
              <div>
                <label className="text-xs text-seafoam/50 font-medium mb-1.5 block">
                  Your response
                </label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your response here…"
                  maxLength={MAX_CHARS}
                  className="min-h-[120px] bg-white/[0.02] border-ocean-turquoise/10 text-sm"
                />
                <div className="flex items-center justify-between mt-1">
                  <span
                    className={cn(
                      "text-xs",
                      contentLength < MIN_CHARS
                        ? "text-amber-400/60"
                        : contentLength > MAX_CHARS * 0.9
                          ? "text-red-400"
                          : "text-seafoam/30",
                    )}
                  >
                    {contentLength < MIN_CHARS
                      ? `${MIN_CHARS - contentLength} more characters needed`
                      : `${contentLength}/${MAX_CHARS}`}
                  </span>
                </div>
              </div>
            )}

            {/* Audio recorder placeholder for speaking */}
            {exerciseType === "speaking" && (
              <div className="rounded-2xl border border-dashed border-ocean-turquoise/15 bg-white/[0.01] p-8 text-center">
                <Mic className="h-8 w-8 mx-auto mb-2 text-seafoam/30" />
                <p className="text-sm text-seafoam/40">
                  Audio recording coming soon. For now, upload your audio file
                  via the app.
                </p>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting || remaining <= 0}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all min-h-touch",
                isFormValid && !isSubmitting && remaining > 0
                  ? "bg-ocean-turquoise/15 text-ocean-turquoise hover:bg-ocean-turquoise/25 border border-ocean-turquoise/20"
                  : "bg-white/5 text-seafoam/30 cursor-not-allowed",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Get Community Feedback"
              )}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
