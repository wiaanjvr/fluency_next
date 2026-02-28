"use client";

import { useState, useEffect } from "react";
import { X, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Deck,
  FlashcardLanguage,
  InsertionOrder,
  LeechAction,
  NewGatherOrder,
  NewSortOrder,
  ReviewSortOrder,
  InterleaveMode,
} from "@/types/flashcards";

const LANGUAGES = [
  { code: "de" as FlashcardLanguage, flag: "🇩🇪", name: "German" },
  { code: "fr" as FlashcardLanguage, flag: "🇫🇷", name: "French" },
  { code: "it" as FlashcardLanguage, flag: "🇮🇹", name: "Italian" },
];

function stepsToString(steps: number[]): string {
  return steps.join(" ");
}

function parseSteps(raw: string): number[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
}

interface EditDeckModalProps {
  open: boolean;
  deck: Deck | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    language: FlashcardLanguage;
    description: string;
    new_per_day: number;
    review_per_day: number;
    learning_steps: number[];
    graduating_interval: number;
    easy_interval: number;
    insertion_order: InsertionOrder;
    // Reviews
    max_interval: number;
    interval_modifier: number;
    hard_interval_mult: number;
    easy_bonus: number;
    // Lapses
    relearning_steps: number[];
    min_interval_after_lapse: number;
    new_interval_multiplier: number;
    // Leeches
    leech_threshold: number;
    leech_action: LeechAction;
    // Display Order
    new_gather_order: NewGatherOrder;
    new_sort_order: NewSortOrder;
    review_sort_order: ReviewSortOrder;
    interleave_mode: InterleaveMode;
    // Burying
    bury_new_siblings: boolean;
    bury_review_siblings: boolean;
    // Timer
    show_answer_timer: boolean;
    answer_timer_limit: number;
    // Auto Advance
    auto_advance_answer_seconds: number;
    auto_advance_rate_seconds: number;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EditDeckModal({
  open,
  deck,
  onClose,
  onSave,
  onDelete,
}: EditDeckModalProps) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<FlashcardLanguage>("fr");
  const [description, setDescription] = useState("");
  const [newPerDay, setNewPerDay] = useState(20);
  const [reviewPerDay, setReviewPerDay] = useState(100);
  // New Cards settings
  const [learningStepsRaw, setLearningStepsRaw] = useState("1 10");
  const [graduatingInterval, setGraduatingInterval] = useState(1);
  const [easyInterval, setEasyInterval] = useState(4);
  const [insertionOrder, setInsertionOrder] =
    useState<InsertionOrder>("random");
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Reviews
  const [maxInterval, setMaxInterval] = useState(36500);
  const [intervalModifier, setIntervalModifier] = useState(1.0);
  const [hardIntervalMult, setHardIntervalMult] = useState(1.2);
  const [easyBonus, setEasyBonus] = useState(1.3);
  const [showReviews, setShowReviews] = useState(false);
  // Lapses
  const [relearningStepsRaw, setRelearningStepsRaw] = useState("10");
  const [minIntervalAfterLapse, setMinIntervalAfterLapse] = useState(1);
  const [newIntervalMultiplier, setNewIntervalMultiplier] = useState(0);
  const [leechThreshold, setLeechThreshold] = useState(8);
  const [leechActionValue, setLeechActionValue] = useState<LeechAction>("tag");
  const [showLapses, setShowLapses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Display Order
  const [newGatherOrder, setNewGatherOrder] =
    useState<NewGatherOrder>("deck_order");
  const [newSortOrder, setNewSortOrder] =
    useState<NewSortOrder>("order_gathered");
  const [reviewSortOrder, setReviewSortOrder] =
    useState<ReviewSortOrder>("due_date");
  const [interleaveMode, setInterleaveMode] = useState<InterleaveMode>("mix");
  const [showDisplayOrder, setShowDisplayOrder] = useState(false);
  // Burying
  const [buryNewSiblings, setBuryNewSiblings] = useState(false);
  const [buryReviewSiblings, setBuryReviewSiblings] = useState(false);
  const [showBurying, setShowBurying] = useState(false);
  // Timer
  const [showAnswerTimer, setShowAnswerTimer] = useState(false);
  const [answerTimerLimit, setAnswerTimerLimit] = useState(60);
  const [showTimerSection, setShowTimerSection] = useState(false);
  // Auto Advance
  const [autoAdvanceAnswerSeconds, setAutoAdvanceAnswerSeconds] = useState(0);
  const [autoAdvanceRateSeconds, setAutoAdvanceRateSeconds] = useState(0);
  const [showAutoAdvance, setShowAutoAdvance] = useState(false);

  // Sync form with deck data when opened
  useEffect(() => {
    if (deck && open) {
      setName(deck.name);
      setLanguage(deck.language);
      setDescription(deck.description || "");
      setNewPerDay(deck.new_per_day);
      setReviewPerDay(deck.review_per_day);
      setLearningStepsRaw(stepsToString(deck.learning_steps ?? [1, 10]));
      setGraduatingInterval(deck.graduating_interval ?? 1);
      setEasyInterval(deck.easy_interval ?? 4);
      setInsertionOrder(deck.insertion_order ?? "random");
      setMaxInterval(deck.max_interval ?? 36500);
      setIntervalModifier(deck.interval_modifier ?? 1.0);
      setHardIntervalMult(deck.hard_interval_mult ?? 1.2);
      setEasyBonus(deck.easy_bonus ?? 1.3);
      setRelearningStepsRaw(stepsToString(deck.relearning_steps ?? [10]));
      setMinIntervalAfterLapse(deck.min_interval_after_lapse ?? 1);
      setNewIntervalMultiplier(deck.new_interval_multiplier ?? 0);
      setLeechThreshold(deck.leech_threshold ?? 8);
      setLeechActionValue(deck.leech_action ?? "tag");
      setNewGatherOrder(deck.new_gather_order ?? "deck_order");
      setNewSortOrder(deck.new_sort_order ?? "order_gathered");
      setReviewSortOrder(deck.review_sort_order ?? "due_date");
      setInterleaveMode(deck.interleave_mode ?? "mix");
      setBuryNewSiblings(deck.bury_new_siblings ?? false);
      setBuryReviewSiblings(deck.bury_review_siblings ?? false);
      setShowAnswerTimer(deck.show_answer_timer ?? false);
      setAnswerTimerLimit(deck.answer_timer_limit ?? 60);
      setAutoAdvanceAnswerSeconds(deck.auto_advance_answer_seconds ?? 0);
      setAutoAdvanceRateSeconds(deck.auto_advance_rate_seconds ?? 0);
      setConfirmDelete(false);
      setShowAdvanced(false);
      setShowReviews(false);
      setShowLapses(false);
      setShowDisplayOrder(false);
      setShowBurying(false);
      setShowTimerSection(false);
      setShowAutoAdvance(false);
    }
  }, [deck, open]);

  if (!open || !deck) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        language,
        description: description.trim(),
        new_per_day: newPerDay,
        review_per_day: reviewPerDay,
        learning_steps: parseSteps(learningStepsRaw).length
          ? parseSteps(learningStepsRaw)
          : [1, 10],
        graduating_interval: Math.max(1, graduatingInterval),
        easy_interval: Math.max(1, easyInterval),
        insertion_order: insertionOrder,
        // Reviews
        max_interval: Math.max(1, maxInterval),
        interval_modifier: Math.max(0.1, intervalModifier),
        hard_interval_mult: Math.max(0.1, hardIntervalMult),
        easy_bonus: Math.max(1, easyBonus),
        // Lapses
        relearning_steps: parseSteps(relearningStepsRaw).length
          ? parseSteps(relearningStepsRaw)
          : [10],
        min_interval_after_lapse: Math.max(1, minIntervalAfterLapse),
        new_interval_multiplier: Math.max(0, newIntervalMultiplier),
        // Leeches
        leech_threshold: Math.max(1, leechThreshold),
        leech_action: leechActionValue,
        // Display Order
        new_gather_order: newGatherOrder,
        new_sort_order: newSortOrder,
        review_sort_order: reviewSortOrder,
        interleave_mode: interleaveMode,
        // Burying
        bury_new_siblings: buryNewSiblings,
        bury_review_siblings: buryReviewSiblings,
        // Timer
        show_answer_timer: showAnswerTimer,
        answer_timer_limit: Math.max(0, answerTimerLimit),
        // Auto Advance
        auto_advance_answer_seconds: Math.max(0, autoAdvanceAnswerSeconds),
        auto_advance_rate_seconds: Math.max(0, autoAdvanceRateSeconds),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10",
          "bg-[#0d2137] p-6 space-y-5 shadow-2xl",
          "animate-in slide-in-from-bottom-4 fade-in duration-300",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Edit Deck</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Deck Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Deck Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. French Basics"
            required
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white placeholder:text-white/30",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "transition",
            )}
          />
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Language</label>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 px-3",
                  "text-sm font-medium transition",
                  language === lang.code
                    ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20",
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">
            Description <span className="text-white/30">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this deck for?"
            rows={2}
            className={cn(
              "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
              "text-white placeholder:text-white/30 resize-none",
              "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30",
              "transition",
            )}
          />
        </div>

        {/* Daily Limits */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">
              New cards / day
            </label>
            <input
              type="number"
              value={newPerDay}
              onChange={(e) => setNewPerDay(Number(e.target.value))}
              min={1}
              max={200}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                "text-white focus:outline-none focus:border-teal-400/50",
                "focus:ring-1 focus:ring-teal-400/30 transition",
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-white/70">
              Reviews / day
            </label>
            <input
              type="number"
              value={reviewPerDay}
              onChange={(e) => setReviewPerDay(Number(e.target.value))}
              min={1}
              max={9999}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                "text-white focus:outline-none focus:border-teal-400/50",
                "focus:ring-1 focus:ring-teal-400/30 transition",
              )}
            />
          </div>
        </div>

        {/* New Cards settings — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>New Card Settings</span>
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              {/* Learning Steps */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Learning steps{" "}
                  <span className="text-white/30">
                    (minutes, space-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={learningStepsRaw}
                  onChange={(e) => setLearningStepsRaw(e.target.value)}
                  placeholder="e.g. 1 10"
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white placeholder:text-white/30",
                    "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  Cards pass through each step before graduating. e.g. &quot;1
                  10&quot; = 1 min then 10 min.
                </p>
              </div>

              {/* Graduating & Easy intervals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Graduating interval{" "}
                    <span className="text-white/30">(days)</span>
                  </label>
                  <input
                    type="number"
                    value={graduatingInterval}
                    onChange={(e) =>
                      setGraduatingInterval(Number(e.target.value))
                    }
                    min={1}
                    max={365}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Easy interval <span className="text-white/30">(days)</span>
                  </label>
                  <input
                    type="number"
                    value={easyInterval}
                    onChange={(e) => setEasyInterval(Number(e.target.value))}
                    min={1}
                    max={365}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                </div>
              </div>

              {/* Insertion Order */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Insertion order
                </label>
                <div className="flex gap-2">
                  {(["random", "sequential"] as InsertionOrder[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setInsertionOrder(o)}
                      className={cn(
                        "flex-1 rounded-xl border py-2 px-3 text-sm font-medium capitalize transition",
                        insertionOrder === o
                          ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/30">
                  Sequential introduces new cards in deck order; Random shuffles
                  them.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Reviews settings — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowReviews((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Reviews</span>
            {showReviews ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showReviews && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              {/* Maximum interval */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Maximum interval <span className="text-white/30">(days)</span>
                </label>
                <input
                  type="number"
                  value={maxInterval}
                  onChange={(e) => setMaxInterval(Number(e.target.value))}
                  min={1}
                  max={36500}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  Cap on how far out a card can be scheduled. 36500 ≈ 100 years.
                </p>
              </div>

              {/* Interval modifier */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Interval modifier{" "}
                  <span className="text-white/30">(multiplier)</span>
                </label>
                <input
                  type="number"
                  value={intervalModifier}
                  onChange={(e) => setIntervalModifier(Number(e.target.value))}
                  min={0.1}
                  max={5}
                  step={0.05}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  Global multiplier on all review intervals. 1.0 = 100% (no
                  change). &lt; 1.0 for shorter intervals, &gt; 1.0 for longer.
                </p>
              </div>

              {/* Hard interval & Easy bonus */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Hard interval <span className="text-white/30">(×)</span>
                  </label>
                  <input
                    type="number"
                    value={hardIntervalMult}
                    onChange={(e) =>
                      setHardIntervalMult(Number(e.target.value))
                    }
                    min={0.1}
                    max={3}
                    step={0.05}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                  <p className="text-xs text-white/30">
                    Multiplier for Hard on reviews. 1.2 = 120%.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Easy bonus <span className="text-white/30">(×)</span>
                  </label>
                  <input
                    type="number"
                    value={easyBonus}
                    onChange={(e) => setEasyBonus(Number(e.target.value))}
                    min={1}
                    max={5}
                    step={0.05}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                  <p className="text-xs text-white/30">
                    Multiplier for Easy on reviews. 1.3 = 130%.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lapses / Relearning settings — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLapses((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Lapses (Relearning)</span>
            {showLapses ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showLapses && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              {/* Relearning steps */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Relearning steps{" "}
                  <span className="text-white/30">
                    (minutes, space-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={relearningStepsRaw}
                  onChange={(e) => setRelearningStepsRaw(e.target.value)}
                  placeholder="e.g. 10"
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white placeholder:text-white/30",
                    "focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  Steps a lapsed card goes through before returning to review.
                </p>
              </div>

              {/* Min interval after lapse & New interval multiplier */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Min. interval <span className="text-white/30">(days)</span>
                  </label>
                  <input
                    type="number"
                    value={minIntervalAfterLapse}
                    onChange={(e) =>
                      setMinIntervalAfterLapse(Number(e.target.value))
                    }
                    min={1}
                    max={365}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                  <p className="text-xs text-white/30">
                    Shortest interval after re-graduating from a lapse.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    New interval <span className="text-white/30">(× old)</span>
                  </label>
                  <input
                    type="number"
                    value={newIntervalMultiplier}
                    onChange={(e) =>
                      setNewIntervalMultiplier(Number(e.target.value))
                    }
                    min={0}
                    max={1}
                    step={0.05}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                  <p className="text-xs text-white/30">
                    Multiply old interval by this after a lapse. 0 = reset to
                    minimum.
                  </p>
                </div>
              </div>

              {/* Leech threshold & action */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Leech threshold
                  </label>
                  <input
                    type="number"
                    value={leechThreshold}
                    onChange={(e) => setLeechThreshold(Number(e.target.value))}
                    min={1}
                    max={99}
                    className={cn(
                      "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                      "text-white focus:outline-none focus:border-teal-400/50",
                      "focus:ring-1 focus:ring-teal-400/30 transition",
                    )}
                  />
                  <p className="text-xs text-white/30">
                    Lapses before a card becomes a leech.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Leech action
                  </label>
                  <div className="flex gap-2">
                    {(["tag", "suspend"] as LeechAction[]).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setLeechActionValue(a)}
                        className={cn(
                          "flex-1 rounded-xl border py-2 px-3 text-sm font-medium capitalize transition",
                          leechActionValue === a
                            ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20",
                        )}
                      >
                        {a === "tag" ? "Tag Only" : "Suspend"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Display Order — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDisplayOrder((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Display Order</span>
            {showDisplayOrder ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showDisplayOrder && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              {/* New card gather order */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  New card gather order
                </label>
                <select
                  value={newGatherOrder}
                  onChange={(e) =>
                    setNewGatherOrder(e.target.value as NewGatherOrder)
                  }
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                >
                  <option value="deck_order">Deck order</option>
                  <option value="ascending_position">Ascending position</option>
                  <option value="descending_position">
                    Descending position
                  </option>
                  <option value="random">Random</option>
                </select>
                <p className="text-xs text-white/30">
                  How new cards are pulled from the deck each session.
                </p>
              </div>

              {/* New card sort order */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  New card sort order
                </label>
                <select
                  value={newSortOrder}
                  onChange={(e) =>
                    setNewSortOrder(e.target.value as NewSortOrder)
                  }
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                >
                  <option value="order_gathered">Order gathered</option>
                  <option value="card_type">Card type</option>
                  <option value="card_type_then_random">
                    Card type, then random
                  </option>
                  <option value="random">Random</option>
                </select>
                <p className="text-xs text-white/30">
                  How gathered new cards are sorted within the session.
                </p>
              </div>

              {/* Review sort order */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Review sort order
                </label>
                <select
                  value={reviewSortOrder}
                  onChange={(e) =>
                    setReviewSortOrder(e.target.value as ReviewSortOrder)
                  }
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                >
                  <option value="due_date">Due date</option>
                  <option value="random">Random</option>
                  <option value="intervals_ascending">
                    Intervals (ascending)
                  </option>
                  <option value="intervals_descending">
                    Intervals (descending)
                  </option>
                  <option value="relative_overdueness">
                    Relative overdueness
                  </option>
                </select>
                <p className="text-xs text-white/30">
                  How review cards are ordered. &quot;Relative overdueness&quot;
                  shows the most overdue cards (relative to their interval)
                  first.
                </p>
              </div>

              {/* Interleave mode */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  New/review mixing
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { val: "mix" as InterleaveMode, label: "Mix" },
                      {
                        val: "new_first" as InterleaveMode,
                        label: "New first",
                      },
                      {
                        val: "reviews_first" as InterleaveMode,
                        label: "Reviews first",
                      },
                    ] as const
                  ).map((o) => (
                    <button
                      key={o.val}
                      type="button"
                      onClick={() => setInterleaveMode(o.val)}
                      className={cn(
                        "flex-1 rounded-xl border py-2 px-3 text-sm font-medium transition",
                        interleaveMode === o.val
                          ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                          : "border-white/10 bg-white/5 text-white/60 hover:border-white/20",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/30">
                  Mix interleaves new and review cards. Otherwise they are shown
                  in separate groups.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Burying — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowBurying((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Burying</span>
            {showBurying ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showBurying && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buryNewSiblings}
                    onChange={(e) => setBuryNewSiblings(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400/30"
                  />
                  <span className="text-sm text-white/70">
                    Bury new siblings during review
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buryReviewSiblings}
                    onChange={(e) => setBuryReviewSiblings(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400/30"
                  />
                  <span className="text-sm text-white/70">
                    Bury review siblings during review
                  </span>
                </label>
              </div>
              <p className="text-xs text-white/30">
                When enabled, sibling cards (cards sharing the same front text
                or sibling group) will be postponed until the next day after you
                review one of them.
              </p>
            </div>
          )}
        </div>

        {/* Timer — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTimerSection((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Timer</span>
            {showTimerSection ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showTimerSection && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswerTimer}
                  onChange={(e) => setShowAnswerTimer(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-400/30"
                />
                <span className="text-sm text-white/70">
                  Show answer timer on cards
                </span>
              </label>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Stop timer at{" "}
                  <span className="text-white/30">(seconds, 0 = no limit)</span>
                </label>
                <input
                  type="number"
                  value={answerTimerLimit}
                  onChange={(e) => setAnswerTimerLimit(Number(e.target.value))}
                  min={0}
                  max={3600}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  The timer stops counting at this value. Keeps the review time
                  metric meaningful.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Auto Advance — collapsible */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAutoAdvance((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition"
          >
            <span>Auto Advance</span>
            {showAutoAdvance ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showAutoAdvance && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Auto-reveal answer after{" "}
                  <span className="text-white/30">(seconds, 0 = off)</span>
                </label>
                <input
                  type="number"
                  value={autoAdvanceAnswerSeconds}
                  onChange={(e) =>
                    setAutoAdvanceAnswerSeconds(Number(e.target.value))
                  }
                  min={0}
                  max={300}
                  step={0.5}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  Automatically flip the card to show the answer after this many
                  seconds.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/70">
                  Auto-rate card after{" "}
                  <span className="text-white/30">(seconds, 0 = off)</span>
                </label>
                <input
                  type="number"
                  value={autoAdvanceRateSeconds}
                  onChange={(e) =>
                    setAutoAdvanceRateSeconds(Number(e.target.value))
                  }
                  min={0}
                  max={300}
                  step={0.5}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5",
                    "text-white focus:outline-none focus:border-teal-400/50",
                    "focus:ring-1 focus:ring-teal-400/30 transition",
                  )}
                />
                <p className="text-xs text-white/30">
                  After revealing the answer, automatically rate the card as
                  &quot;Good&quot; after this many seconds. Requires the answer
                  to be showing.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className={cn(
              "flex-1 rounded-xl py-3 font-medium text-[#0a1628] transition",
              "bg-teal-400 hover:bg-teal-300 disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-teal-500/25",
            )}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Delete zone */}
        <div className="pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm transition",
              confirmDelete
                ? "bg-rose-500/20 border border-rose-400/40 text-rose-300 hover:bg-rose-500/30"
                : "text-white/30 hover:text-rose-400 hover:bg-rose-500/5",
              deleting && "opacity-50 cursor-wait",
            )}
          >
            <Trash2 className="h-4 w-4" />
            {deleting
              ? "Deleting..."
              : confirmDelete
                ? "Confirm: Delete deck and all cards?"
                : "Delete Deck"}
          </button>
        </div>
      </form>
    </div>
  );
}
