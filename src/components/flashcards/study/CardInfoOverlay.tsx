"use client";

import { useState, useEffect } from "react";
import {
  X,
  CalendarDays,
  TrendingUp,
  Hash,
  BarChart3,
  Clock,
  AlertTriangle,
  Pause,
  Eye,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatInterval } from "@/lib/fsrs";
import type { ScheduledCard, Rating, CardState } from "@/types/flashcards";

interface ReviewLogEntry {
  id: string;
  rating: Rating;
  review_time_ms: number | null;
  reviewed_at: string;
}

interface CardInfoData {
  schedule: {
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: CardState;
    due: string;
    last_review: string | null;
    is_suspended: boolean;
    is_leech: boolean;
    is_buried: boolean;
  };
  reviewHistory: ReviewLogEntry[];
  card: {
    id: string;
    front: string;
    back: string;
    tags: string[];
    source: string;
    created_at: string;
  };
}

interface CardInfoOverlayProps {
  card: ScheduledCard;
  data: CardInfoData | null;
  loading: boolean;
  onClose: () => void;
}

const STATE_LABELS: Record<CardState, { label: string; color: string }> = {
  new: { label: "New", color: "text-blue-400 bg-blue-500/15" },
  learning: { label: "Learning", color: "text-amber-400 bg-amber-500/15" },
  review: { label: "Review", color: "text-teal-400 bg-teal-500/15" },
  relearning: { label: "Relearning", color: "text-rose-400 bg-rose-500/15" },
};

const RATING_LABELS: Record<Rating, { label: string; color: string }> = {
  1: { label: "Again", color: "text-rose-300" },
  2: { label: "Hard", color: "text-amber-300" },
  3: { label: "Good", color: "text-teal-300" },
  4: { label: "Easy", color: "text-blue-300" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CardInfoOverlay({
  card,
  data,
  loading,
  onClose,
}: CardInfoOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const sched = data?.schedule;
  const stateInfo = sched ? STATE_LABELS[sched.state] : null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-200",
        visible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0",
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[80vh] mx-4 rounded-2xl",
          "border border-white/10 bg-[#0d2137] shadow-2xl overflow-hidden",
          "transition-all duration-200",
          visible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-teal-400" />
            Card Info
          </h3>
          <button
            onClick={handleClose}
            className="text-white/40 hover:text-white/70 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Card preview */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  Card
                </p>
                <p className="text-white font-medium">
                  {card.flashcards.front.replace(/<[^>]*>/g, "").slice(0, 120)}
                </p>
                <p className="text-teal-300/80 text-sm">
                  {card.flashcards.back.replace(/<[^>]*>/g, "").slice(0, 120)}
                </p>
                {data.card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {data.card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-white/50 rounded-full px-2 py-0.5"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  icon={<Eye className="h-3.5 w-3.5" />}
                  label="State"
                  value={
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        stateInfo?.color,
                      )}
                    >
                      {stateInfo?.label}
                    </span>
                  }
                />
                <StatCard
                  icon={<TrendingUp className="h-3.5 w-3.5" />}
                  label="Stability"
                  value={`${sched!.stability.toFixed(2)}d`}
                />
                <StatCard
                  icon={<BarChart3 className="h-3.5 w-3.5" />}
                  label="Difficulty"
                  value={sched!.difficulty.toFixed(2)}
                />
                <StatCard
                  icon={<Hash className="h-3.5 w-3.5" />}
                  label="Reviews"
                  value={sched!.reps}
                />
                <StatCard
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                  label="Lapses"
                  value={sched!.lapses}
                />
                <StatCard
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Interval"
                  value={formatInterval(sched!.scheduled_days)}
                />
                <StatCard
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Due"
                  value={
                    <span className="text-[11px]">
                      {formatDate(sched!.due)}
                    </span>
                  }
                />
                <StatCard
                  icon={<Clock className="h-3.5 w-3.5" />}
                  label="Last Review"
                  value={
                    sched!.last_review ? (
                      <span className="text-[11px]">
                        {formatDate(sched!.last_review)}
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <StatCard
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Created"
                  value={
                    <span className="text-[11px]">
                      {formatDate(data.card.created_at)}
                    </span>
                  }
                />
              </div>

              {/* Status badges */}
              {(sched!.is_suspended || sched!.is_leech || sched!.is_buried) && (
                <div className="flex flex-wrap gap-2">
                  {sched!.is_suspended && (
                    <span className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-300 rounded-full px-3 py-1">
                      <Pause className="h-3 w-3" /> Suspended
                    </span>
                  )}
                  {sched!.is_leech && (
                    <span className="flex items-center gap-1 text-xs bg-rose-500/15 text-rose-300 rounded-full px-3 py-1">
                      <AlertTriangle className="h-3 w-3" /> Leech
                    </span>
                  )}
                  {sched!.is_buried && (
                    <span className="flex items-center gap-1 text-xs bg-purple-500/15 text-purple-300 rounded-full px-3 py-1">
                      <CalendarDays className="h-3 w-3" /> Buried
                    </span>
                  )}
                </div>
              )}

              {/* Review History */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  Review History ({data.reviewHistory.length})
                </p>
                {data.reviewHistory.length === 0 ? (
                  <p className="text-xs text-white/30 py-2">No reviews yet.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {data.reviewHistory.map((entry) => {
                      const rInfo =
                        RATING_LABELS[entry.rating as Rating] ??
                        RATING_LABELS[3];
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                        >
                          <span
                            className={cn("text-xs font-medium", rInfo.color)}
                          >
                            {rInfo.label}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {entry.review_time_ms
                              ? `${(entry.review_time_ms / 1000).toFixed(1)}s`
                              : "—"}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {formatDate(entry.reviewed_at)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-white/40 py-8">
              Could not load card info.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-white/40">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}
