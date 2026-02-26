"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { UserStreakChart, CalendarDayData } from "@/types/chart";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday as isTodayFn,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";

/* =============================================================================
   useStreaks — Fetches streak data and builds calendar grid for Chart page
============================================================================= */

interface UseStreaksReturn {
  streak: UserStreakChart | null;
  calendarDays: CalendarDayData[];
  currentMonth: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  loading: boolean;
  error: string | null;
}

function buildCalendarDays(
  monthDate: Date,
  streakHistory: Record<string, boolean>,
): CalendarDayData[] {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Add padding days for the start of the week (Sunday-based)
  const startDayOfWeek = getDay(start);
  const paddingDays: CalendarDayData[] = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    paddingDays.push({
      date: "",
      dayNumber: 0,
      isCompleted: false,
      isToday: false,
      isCurrentMonth: false,
      isInStreak: false,
    });
  }

  const calendarDays: CalendarDayData[] = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isCompleted = !!streakHistory[dateStr];
    return {
      date: dateStr,
      dayNumber: day.getDate(),
      isCompleted,
      isToday: dateStr === todayStr,
      isCurrentMonth: isSameMonth(day, monthDate),
      isInStreak: isCompleted,
    };
  });

  // Mark consecutive streak days
  for (let i = 1; i < calendarDays.length; i++) {
    if (calendarDays[i].isCompleted && calendarDays[i - 1].isCompleted) {
      calendarDays[i].isInStreak = true;
      calendarDays[i - 1].isInStreak = true;
    }
  }

  return [...paddingDays, ...calendarDays];
}

export function useStreaks(): UseStreaksReturn {
  const { user } = useAuth();
  const [streak, setStreak] = useState<UserStreakChart | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreak = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (data) {
        setStreak(data as UserStreakChart);
      } else {
        setStreak({
          id: "",
          user_id: user.id,
          current_streak: 0,
          best_streak: 0,
          last_active_date: null,
          streak_history: {},
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch streak");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const calendarDays = buildCalendarDays(
    currentMonth,
    streak?.streak_history ?? {},
  );

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  return {
    streak,
    calendarDays,
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    loading,
    error,
  };
}
