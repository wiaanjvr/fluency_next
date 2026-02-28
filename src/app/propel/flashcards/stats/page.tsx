"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { OceanBackground, DepthSidebar } from "@/components/ocean";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import {
  BarChart,
  LineChart,
  Histogram,
  DonutChart,
  HeatmapCalendar,
  StackedBarChart,
  ForecastChart,
  StatCard,
} from "@/components/flashcards/stats-charts";
import { formatInterval, retrievability } from "@/lib/fsrs";
import {
  ArrowLeft,
  Clock,
  BarChart3,
  TrendingUp,
  Layers,
  Calendar,
  Target,
  Brain,
  Zap,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  Deck,
  Flashcard,
  CardSchedule,
  ReviewLogEntry,
  CardState,
  Rating,
} from "@/types/flashcards";
import "@/styles/ocean-theme.css";

// ============================================================================
// Types
// ============================================================================
type TimeRange = "7d" | "30d" | "90d" | "365d" | "all";

interface DeckOption {
  id: string;
  name: string;
}

// ============================================================================
// Helpers
// ============================================================================
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function rangeDays(range: TimeRange): number {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "365d":
      return 365;
    case "all":
      return 3650;
  }
}

function formatMs(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

// ============================================================================
// Time Range Picker
// ============================================================================
function TimeRangePicker({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const options: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "3 months" },
    { value: "365d", label: "1 year" },
    { value: "all", label: "All time" },
  ];

  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs transition",
            value === opt.value
              ? "bg-teal-500/15 text-teal-300 border border-teal-400/30"
              : "text-white/40 hover:text-white/60 border border-transparent",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Deck Picker
// ============================================================================
function DeckPicker({
  decks,
  selectedDeckId,
  onChange,
}: {
  decks: DeckOption[];
  selectedDeckId: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = selectedDeckId
    ? decks.find((d) => d.id === selectedDeckId)?.name || "Unknown"
    : "All Decks";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 border border-white/10 hover:border-white/20 transition"
      >
        <Layers className="h-3.5 w-3.5" />
        {selected}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#0d1f3c] border border-white/10 rounded-xl p-1.5 min-w-[180px] shadow-2xl z-50">
          <button
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "w-full text-left px-3 py-1.5 text-xs rounded-lg transition",
              !selectedDeckId
                ? "text-teal-300 bg-teal-500/10"
                : "text-white/60 hover:text-white hover:bg-white/5",
            )}
          >
            All Decks
          </button>
          {decks.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                onChange(d.id);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs rounded-lg transition",
                selectedDeckId === d.id
                  ? "text-teal-300 bg-teal-500/10"
                  : "text-white/60 hover:text-white hover:bg-white/5",
              )}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Section Wrapper
// ============================================================================
function StatsSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.02] p-5",
        className,
      )}
    >
      <h3 className="text-white/80 text-sm font-medium mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ============================================================================
// Main Stats Content
// ============================================================================
function StatsContent({
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
  const supabase = createClient();
  const { ambientView, setAmbientView } = useAmbientPlayer();

  // Data
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [allSchedules, setAllSchedules] = useState<CardSchedule[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  useEffect(() => {
    if (ambientView === "container") setAmbientView("soundbar");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch all data ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);

    const [
      { data: deckData },
      { data: cardData },
      { data: schedData },
      { data: logData },
    ] = await Promise.all([
      supabase.from("decks").select("*").eq("user_id", userId).order("name"),
      supabase.from("flashcards").select("*").eq("user_id", userId),
      supabase.from("card_schedules").select("*").eq("user_id", userId),
      supabase
        .from("review_log")
        .select("*")
        .eq("user_id", userId)
        .order("reviewed_at", { ascending: true }),
    ]);

    setDecks((deckData || []) as Deck[]);
    setAllCards((cardData || []) as Flashcard[]);
    setAllSchedules((schedData || []) as CardSchedule[]);
    setReviewLogs((logData || []) as ReviewLogEntry[]);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Filtered data ──────────────────────────────────────────────────────
  const cards = useMemo(() => {
    if (!selectedDeckId) return allCards;
    return allCards.filter((c) => c.deck_id === selectedDeckId);
  }, [allCards, selectedDeckId]);

  const cardIds = useMemo(() => new Set(cards.map((c) => c.id)), [cards]);

  const schedules = useMemo(() => {
    return allSchedules.filter((s) => cardIds.has(s.card_id));
  }, [allSchedules, cardIds]);

  const scheduleMap = useMemo(
    () => new Map(schedules.map((s) => [s.card_id, s])),
    [schedules],
  );

  const rangeStart = useMemo(() => daysAgo(rangeDays(timeRange)), [timeRange]);

  const logs = useMemo(() => {
    let filtered = reviewLogs;
    if (selectedDeckId) {
      filtered = filtered.filter((l) => l.deck_id === selectedDeckId);
    }
    return filtered;
  }, [reviewLogs, selectedDeckId]);

  const rangeLogs = useMemo(() => {
    return logs.filter((l) => new Date(l.reviewed_at) >= rangeStart);
  }, [logs, rangeStart]);

  // ── Today's stats ──────────────────────────────────────────────────────
  const todayStats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayLogs = logs.filter((l) => new Date(l.reviewed_at) >= today);
    const total = todayLogs.length;
    const timeMs = todayLogs.reduce((s, l) => s + (l.review_time_ms || 0), 0);
    const newCount = todayLogs.filter((l) => {
      const sched = scheduleMap.get(l.card_id);
      return sched?.reps === 1;
    }).length;

    // Treat anything with lapses or reps===1-related as learning
    let again = 0,
      hard = 0,
      good = 0,
      easy = 0;
    for (const l of todayLogs) {
      switch (l.rating) {
        case 1:
          again++;
          break;
        case 2:
          hard++;
          break;
        case 3:
          good++;
          break;
        case 4:
          easy++;
          break;
      }
    }

    return { total, timeMs, newCount, again, hard, good, easy };
  }, [logs, scheduleMap]);

  // ── Card state counts ──────────────────────────────────────────────────
  const stateStats = useMemo(() => {
    const counts = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
      suspended: 0,
      buried: 0,
      young: 0,
      mature: 0,
    };
    for (const card of cards) {
      const sched = scheduleMap.get(card.id);
      if (!sched) {
        counts.new++;
        continue;
      }
      if (sched.is_suspended) {
        counts.suspended++;
        continue;
      }
      if (sched.is_buried) {
        counts.buried++;
        continue;
      }
      const state = sched.state as CardState;
      if (state === "new") counts.new++;
      else if (state === "learning") counts.learning++;
      else if (state === "relearning") counts.relearning++;
      else if (state === "review") {
        counts.review++;
        // Young: interval < 21 days; Mature: >= 21 days
        if (sched.scheduled_days < 21) counts.young++;
        else counts.mature++;
      }
    }
    return counts;
  }, [cards, scheduleMap]);

  // ── Review history (daily counts) ──────────────────────────────────────
  const reviewHistory = useMemo(() => {
    const days = rangeDays(timeRange);
    const map = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const date = formatDate(daysAgo(i));
      map.set(date, 0);
    }

    for (const log of rangeLogs) {
      const date = formatDate(new Date(log.reviewed_at));
      map.set(date, (map.get(date) || 0) + 1);
    }

    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [rangeLogs, timeRange]);

  // ── Review heatmap data ────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const data = new Map<string, number>();
    for (const log of logs) {
      const date = formatDate(new Date(log.reviewed_at));
      data.set(date, (data.get(date) || 0) + 1);
    }
    return data;
  }, [logs]);

  // ── Forecast (upcoming reviews) ───────────────────────────────────────
  const forecastData = useMemo(() => {
    const days = 30;
    const result: { date: string; review: number; newCards: number }[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);
      result.push({ date: dateStr, review: 0, newCards: 0 });
    }

    for (const sched of schedules) {
      if (sched.is_suspended || sched.is_buried) continue;
      const dueDate = startOfDay(new Date(sched.due));
      const daysFromToday = daysBetween(today, dueDate);
      if (daysFromToday >= 0 && daysFromToday < days) {
        if (sched.state === "new") {
          result[daysFromToday].newCards++;
        } else {
          result[daysFromToday].review++;
        }
      } else if (daysFromToday < 0) {
        // Overdue — add to today
        result[0].review++;
      }
    }

    return result;
  }, [schedules]);

  // ── Interval distribution ──────────────────────────────────────────────
  const intervalDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      "0": 0,
      "1": 0,
      "2-3": 0,
      "4-7": 0,
      "8-14": 0,
      "15-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-180": 0,
      "181-365": 0,
      "365+": 0,
    };

    for (const sched of schedules) {
      if (sched.state === "new") continue;
      const d = sched.scheduled_days;
      if (d === 0) buckets["0"]++;
      else if (d === 1) buckets["1"]++;
      else if (d <= 3) buckets["2-3"]++;
      else if (d <= 7) buckets["4-7"]++;
      else if (d <= 14) buckets["8-14"]++;
      else if (d <= 30) buckets["15-30"]++;
      else if (d <= 60) buckets["31-60"]++;
      else if (d <= 90) buckets["61-90"]++;
      else if (d <= 180) buckets["91-180"]++;
      else if (d <= 365) buckets["181-365"]++;
      else buckets["365+"]++;
    }

    return Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
    }));
  }, [schedules]);

  // ── Difficulty (ease) distribution ─────────────────────────────────────
  const easeDistribution = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (let i = 1; i <= 10; i++) {
      buckets[i.toString()] = 0;
    }

    for (const sched of schedules) {
      if (sched.state === "new") continue;
      const bucket = Math.min(10, Math.max(1, Math.round(sched.difficulty)));
      buckets[bucket.toString()] = (buckets[bucket.toString()] || 0) + 1;
    }

    return Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count,
    }));
  }, [schedules]);

  // ── Answer button distribution ─────────────────────────────────────────
  const answerDistribution = useMemo(() => {
    const daily = new Map<
      string,
      { again: number; hard: number; good: number; easy: number }
    >();
    const days = rangeDays(timeRange);

    for (let i = days - 1; i >= 0; i--) {
      const date = formatDate(daysAgo(i));
      daily.set(date, { again: 0, hard: 0, good: 0, easy: 0 });
    }

    for (const log of rangeLogs) {
      const date = formatDate(new Date(log.reviewed_at));
      const entry = daily.get(date);
      if (entry) {
        switch (log.rating) {
          case 1:
            entry.again++;
            break;
          case 2:
            entry.hard++;
            break;
          case 3:
            entry.good++;
            break;
          case 4:
            entry.easy++;
            break;
        }
      }
    }

    return Array.from(daily.entries()).map(([label, v]) => ({
      label,
      segments: [
        { value: v.again, color: "rgba(244, 63, 94, 0.7)", label: "Again" },
        { value: v.hard, color: "rgba(251, 146, 60, 0.7)", label: "Hard" },
        { value: v.good, color: "rgba(42, 169, 160, 0.7)", label: "Good" },
        { value: v.easy, color: "rgba(59, 130, 246, 0.7)", label: "Easy" },
      ],
    }));
  }, [rangeLogs, timeRange]);

  // ── Card added over time ───────────────────────────────────────────────
  const cardsAddedOverTime = useMemo(() => {
    const days = rangeDays(timeRange);
    const map = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const date = formatDate(daysAgo(i));
      map.set(date, 0);
    }

    for (const card of cards) {
      const date = formatDate(new Date(card.created_at));
      if (map.has(date)) {
        map.set(date, (map.get(date) || 0) + 1);
      }
    }

    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [cards, timeRange]);

  // ── True retention rate ────────────────────────────────────────────────
  const trueRetention = useMemo(() => {
    if (rangeLogs.length === 0) return null;
    // True retention = 1 - (lapse rate)
    // A review where rating = 1 (Again) on a review/relearning card = forgot
    const reviewLogs = rangeLogs.filter((l) => {
      const sched = scheduleMap.get(l.card_id);
      return sched && (sched.state === "review" || sched.reps > 1);
    });
    if (reviewLogs.length === 0) return null;
    const forgot = reviewLogs.filter((l) => l.rating === 1).length;
    return ((reviewLogs.length - forgot) / reviewLogs.length) * 100;
  }, [rangeLogs, scheduleMap]);

  // ── Overall answer button ratios ───────────────────────────────────────
  const answerRatios = useMemo(() => {
    const totals = { again: 0, hard: 0, good: 0, easy: 0, total: 0 };
    for (const l of rangeLogs) {
      totals.total++;
      switch (l.rating) {
        case 1:
          totals.again++;
          break;
        case 2:
          totals.hard++;
          break;
        case 3:
          totals.good++;
          break;
        case 4:
          totals.easy++;
          break;
      }
    }
    return totals;
  }, [rangeLogs]);

  // ── Streak ─────────────────────────────────────────────────────────────
  const reviewStreak = useMemo(() => {
    const dates = new Set<string>();
    for (const l of logs) {
      dates.add(formatDate(new Date(l.reviewed_at)));
    }

    let currentStreak = 0;
    const d = new Date();
    // Check today or yesterday as start
    if (!dates.has(formatDate(d))) {
      d.setDate(d.getDate() - 1);
      if (!dates.has(formatDate(d))) return 0;
    }

    while (dates.has(formatDate(d))) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    }
    return currentStreak;
  }, [logs]);

  // ── FSRS-specific metrics ──────────────────────────────────────────────
  const fsrsMetrics = useMemo(() => {
    const stabilities = schedules
      .filter((s) => s.state === "review")
      .map((s) => s.stability);
    const difficulties = schedules
      .filter((s) => s.state === "review")
      .map((s) => s.difficulty);

    const avgStability =
      stabilities.length > 0
        ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length
        : 0;
    const avgDifficulty =
      difficulties.length > 0
        ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
        : 0;

    // Average retrievability
    const now = Date.now();
    let totalR = 0;
    let countR = 0;
    for (const sched of schedules) {
      if (sched.state === "review" && sched.last_review) {
        const elapsed =
          (now - new Date(sched.last_review).getTime()) / (1000 * 60 * 60 * 24);
        totalR += retrievability(elapsed, sched.stability || 1);
        countR++;
      }
    }
    const avgRetrievability = countR > 0 ? (totalR / countR) * 100 : 0;

    return {
      avgStability,
      avgDifficulty,
      avgRetrievability,
      totalReviewCards: stabilities.length,
    };
  }, [schedules]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;

  const deckOptions: DeckOption[] = decks.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} />
      <AppNav
        streak={streak}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
      />
      <ContextualNav />

      <div className="flex-1 lg:ml-[72px] pb-20 lg:pb-0 overflow-y-auto">
        {/* Header */}
        <div className="px-4 lg:px-8 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/propel/flashcards"
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-light text-white">
              Flashcard Statistics
            </h1>
            <div className="ml-auto flex items-center gap-2">
              <DeckPicker
                decks={deckOptions}
                selectedDeckId={selectedDeckId}
                onChange={setSelectedDeckId}
              />
              <Link
                href="/propel/flashcards/browser"
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition"
              >
                <Layers className="h-3.5 w-3.5" /> Browser
              </Link>
            </div>
          </div>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>

        <div className="px-4 lg:px-8 space-y-5 pb-8">
          {/* ── Today's Stats ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard
              label="Studied Today"
              value={todayStats.total}
              subvalue="cards"
              icon={<BarChart3 className="h-4 w-4" />}
            />
            <StatCard
              label="Time Today"
              value={formatMs(todayStats.timeMs)}
              icon={<Clock className="h-4 w-4" />}
              color="text-white"
            />
            <StatCard
              label="New Today"
              value={todayStats.newCount}
              subvalue="cards"
              icon={<Zap className="h-4 w-4" />}
              color="text-blue-300"
            />
            <StatCard
              label="Review Streak"
              value={reviewStreak}
              subvalue="days"
              icon={<TrendingUp className="h-4 w-4" />}
              color="text-amber-300"
            />
            <StatCard
              label="True Retention"
              value={
                trueRetention != null ? `${trueRetention.toFixed(1)}%` : "—"
              }
              icon={<Target className="h-4 w-4" />}
              color={
                trueRetention && trueRetention >= 85
                  ? "text-emerald-300"
                  : "text-amber-300"
              }
            />
            <StatCard
              label="Total Cards"
              value={cards.length}
              icon={<Layers className="h-4 w-4" />}
              color="text-white/80"
            />
          </div>

          {/* ── Answer Breakdown (Today) ──────────────────────────────── */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
              <div className="text-rose-400 text-lg font-light">
                {todayStats.again}
              </div>
              <div className="text-rose-400/60 text-xs">Again</div>
            </div>
            <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 text-center">
              <div className="text-orange-400 text-lg font-light">
                {todayStats.hard}
              </div>
              <div className="text-orange-400/60 text-xs">Hard</div>
            </div>
            <div className="rounded-xl bg-teal-500/10 border border-teal-500/20 p-3 text-center">
              <div className="text-teal-400 text-lg font-light">
                {todayStats.good}
              </div>
              <div className="text-teal-400/60 text-xs">Good</div>
            </div>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
              <div className="text-blue-400 text-lg font-light">
                {todayStats.easy}
              </div>
              <div className="text-blue-400/60 text-xs">Easy</div>
            </div>
          </div>

          {/* ── Card States ───────────────────────────────────────────── */}
          <StatsSection title="Card States">
            <DonutChart
              data={[
                {
                  label: "New",
                  value: stateStats.new,
                  color: "rgba(59, 130, 246, 0.7)",
                },
                {
                  label: "Learning",
                  value: stateStats.learning + stateStats.relearning,
                  color: "rgba(251, 146, 60, 0.7)",
                },
                {
                  label: "Young",
                  value: stateStats.young,
                  color: "rgba(42, 169, 160, 0.5)",
                },
                {
                  label: "Mature",
                  value: stateStats.mature,
                  color: "rgba(42, 169, 160, 0.85)",
                },
                {
                  label: "Suspended",
                  value: stateStats.suspended,
                  color: "rgba(234, 179, 8, 0.5)",
                },
                {
                  label: "Buried",
                  value: stateStats.buried,
                  color: "rgba(107, 114, 128, 0.5)",
                },
              ]}
            />
          </StatsSection>

          {/* ── Review Activity Heatmap ────────────────────────────────── */}
          <StatsSection title="Review Activity">
            <HeatmapCalendar data={heatmapData} />
          </StatsSection>

          {/* ── Review History ─────────────────────────────────────────── */}
          <StatsSection title="Reviews per Day">
            <LineChart
              series={[
                {
                  data: reviewHistory,
                  color: "rgba(42, 169, 160, 0.8)",
                  label: "Reviews",
                },
              ]}
              height={180}
            />
          </StatsSection>

          {/* ── Forecast ───────────────────────────────────────────────── */}
          <StatsSection title="Upcoming Review Forecast (30 days)">
            <ForecastChart data={forecastData} height={180} />
          </StatsSection>

          {/* ── Answer Button Distribution ─────────────────────────────── */}
          <StatsSection title="Answer Button Distribution">
            <div className="mb-3 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/70" />
                Again{" "}
                {answerRatios.total > 0
                  ? `(${((answerRatios.again / answerRatios.total) * 100).toFixed(1)}%)`
                  : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/70" />
                Hard{" "}
                {answerRatios.total > 0
                  ? `(${((answerRatios.hard / answerRatios.total) * 100).toFixed(1)}%)`
                  : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/70" />
                Good{" "}
                {answerRatios.total > 0
                  ? `(${((answerRatios.good / answerRatios.total) * 100).toFixed(1)}%)`
                  : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/70" />
                Easy{" "}
                {answerRatios.total > 0
                  ? `(${((answerRatios.easy / answerRatios.total) * 100).toFixed(1)}%)`
                  : ""}
              </span>
            </div>
            <StackedBarChart data={answerDistribution} height={160} />
          </StatsSection>

          {/* ── Interval Distribution ──────────────────────────────────── */}
          <StatsSection title="Interval Distribution">
            <Histogram
              data={intervalDistribution}
              color="rgba(42, 169, 160, 0.6)"
              height={160}
            />
          </StatsSection>

          {/* ── Difficulty Distribution ─────────────────────────────────── */}
          <StatsSection title="Difficulty Distribution">
            <Histogram
              data={easeDistribution}
              color="rgba(251, 146, 60, 0.6)"
              height={160}
            />
          </StatsSection>

          {/* ── Cards Added Over Time ──────────────────────────────────── */}
          <StatsSection title="Cards Added Over Time">
            <BarChart
              data={cardsAddedOverTime}
              barColor="rgba(59, 130, 246, 0.5)"
              height={160}
            />
          </StatsSection>

          {/* ── FSRS Metrics ──────────────────────────────────────────── */}
          <StatsSection title="FSRS Algorithm Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/40 text-xs mb-1">Avg. Stability</div>
                <div className="text-teal-300 text-lg font-light">
                  {fsrsMetrics.avgStability > 0
                    ? formatInterval(fsrsMetrics.avgStability)
                    : "—"}
                </div>
                <div className="text-white/20 text-[10px]">
                  Memory half-life
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/40 text-xs mb-1">
                  Avg. Difficulty
                </div>
                <div className="text-orange-300 text-lg font-light">
                  {fsrsMetrics.avgDifficulty > 0
                    ? fsrsMetrics.avgDifficulty.toFixed(2)
                    : "—"}
                </div>
                <div className="text-white/20 text-[10px]">
                  Scale: 1 (easy) – 10 (hard)
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/40 text-xs mb-1">
                  Avg. Retrievability
                </div>
                <div
                  className={cn(
                    "text-lg font-light",
                    fsrsMetrics.avgRetrievability >= 85
                      ? "text-emerald-300"
                      : "text-amber-300",
                  )}
                >
                  {fsrsMetrics.avgRetrievability > 0
                    ? `${fsrsMetrics.avgRetrievability.toFixed(1)}%`
                    : "—"}
                </div>
                <div className="text-white/20 text-[10px]">
                  Current recall probability
                </div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/40 text-xs mb-1">Review Cards</div>
                <div className="text-white/80 text-lg font-light">
                  {fsrsMetrics.totalReviewCards}
                </div>
                <div className="text-white/20 text-[10px]">
                  Cards with FSRS data
                </div>
              </div>
            </div>
          </StatsSection>
        </div>
      </div>

      <MobileBottomNav wordsEncountered={wordsEncountered} />
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function FlashcardStatsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
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
        .select("streak, target_language, subscription_tier")
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

  if (loading || !userId) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <StatsContent
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
