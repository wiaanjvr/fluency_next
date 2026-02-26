"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ChartGoal,
  MonthlyGoalData,
  WeeklyGoalSummary,
} from "@/types/chart";

/* =============================================================================
   useGoals — Fetches monthly & weekly goal data for the Chart page
============================================================================= */

interface UseGoalsReturn {
  monthlyData: MonthlyGoalData | null;
  currentWeek: WeeklyGoalSummary | null;
  weeklyGoals: ChartGoal[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function getWeekNumber(date: Date): number {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  return Math.ceil(dayOfMonth / 7);
}

function groupGoalsByWeek(goals: ChartGoal[]): WeeklyGoalSummary[] {
  const weekMap = new Map<number, ChartGoal[]>();

  for (const goal of goals) {
    const existing = weekMap.get(goal.week_number) ?? [];
    existing.push(goal);
    weekMap.set(goal.week_number, existing);
  }

  const summaries: WeeklyGoalSummary[] = [];
  for (const [weekNumber, weekGoals] of weekMap.entries()) {
    const completedCount = weekGoals.filter((g) => g.is_complete).length;
    summaries.push({
      weekNumber,
      goals: weekGoals,
      allComplete: completedCount === weekGoals.length && weekGoals.length > 0,
      completedCount,
      totalCount: weekGoals.length,
    });
  }

  return summaries.sort((a, b) => a.weekNumber - b.weekNumber);
}

export function useGoals(): UseGoalsReturn {
  const { user } = useAuth();
  const [monthlyData, setMonthlyData] = useState<MonthlyGoalData | null>(null);
  const [currentWeek, setCurrentWeek] = useState<WeeklyGoalSummary | null>(
    null,
  );
  const [weeklyGoals, setWeeklyGoals] = useState<ChartGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const currentWeekNum = getWeekNumber(now);

      // Fetch all goals for this month
      const { data, error: fetchError } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .order("week_number", { ascending: true });

      if (fetchError) throw fetchError;

      const goals = (data as ChartGoal[]) ?? [];
      const weeklyOnly = goals.filter((g) => g.type === "weekly");
      const weekSummaries = groupGoalsByWeek(weeklyOnly);
      const weeksComplete = weekSummaries.filter((w) => w.allComplete).length;

      const monthly: MonthlyGoalData = {
        month,
        year,
        weekSummaries,
        weeksComplete,
        totalWeeks: 4,
        allWeeksComplete: weeksComplete >= 4,
      };

      setMonthlyData(monthly);

      // Current week goals
      const currentWeekGoals = weeklyOnly.filter(
        (g) => g.week_number === currentWeekNum,
      );
      if (currentWeekGoals.length > 0) {
        const completedCount = currentWeekGoals.filter(
          (g) => g.is_complete,
        ).length;
        setCurrentWeek({
          weekNumber: currentWeekNum,
          goals: currentWeekGoals,
          allComplete:
            completedCount === currentWeekGoals.length &&
            currentWeekGoals.length > 0,
          completedCount,
          totalCount: currentWeekGoals.length,
        });
      } else {
        setCurrentWeek(null);
      }

      setWeeklyGoals(weeklyOnly);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  return {
    monthlyData,
    currentWeek,
    weeklyGoals,
    loading,
    error,
    refetch: fetchGoals,
  };
}
