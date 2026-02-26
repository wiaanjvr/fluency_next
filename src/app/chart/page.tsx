"use client";

import { Suspense, useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  AppNav,
  ContextualNav,
  MobileBottomNav,
} from "@/components/navigation";
import { DepthSidebar } from "@/components/navigation/DepthSidebar";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChartPageLayout,
  ChartSection,
  MonthlyGoalsPanel,
  WeeklyGoalsPanel,
  StreakCalendar,
  Gameboard,
} from "@/components/chart";
import { useGoals } from "@/hooks/useGoals";
import { useStreaks } from "@/hooks/useStreaks";
import { useGameboard } from "@/hooks/useGameboard";
import { useRewards } from "@/hooks/useRewards";
import LoadingScreen from "@/components/ui/LoadingScreen";

import "@/styles/ocean-theme.css";
import "@/styles/dashboard-theme.css";

/* =============================================================================
   /chart — Chart Page
   
   Displays monthly goals, weekly goals, streak calendar, and gameboard.
============================================================================= */

function ChartPageContent() {
  const { user, loading: authLoading } = useAuth();
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [streak, setStreakCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  // Data hooks
  const { monthlyData, currentWeek, loading: goalsLoading } = useGoals();

  const {
    streak: streakData,
    calendarDays,
    currentMonth,
    goToPreviousMonth,
    goToNextMonth,
    loading: streakLoading,
  } = useStreaks();

  const isGameboardUnlocked = monthlyData?.allWeeksComplete ?? false;

  const {
    gameboardState,
    selectTile,
    loading: gameboardLoading,
  } = useGameboard(isGameboardUnlocked);

  const { pendingRewards, claimReward, loading: rewardsLoading } = useRewards();

  // Fetch basic user stats for nav components
  useEffect(() => {
    if (!user?.id) return;

    const fetchStats = async () => {
      const supabase = createClient();

      // Words encountered
      const { count } = await supabase
        .from("user_words")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      setWordsEncountered(count ?? 0);

      // Profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    };

    fetchStats();
  }, [user?.id]);

  // Sync streak count from streakData
  useEffect(() => {
    if (streakData) {
      setStreakCount(streakData.current_streak);
    }
  }, [streakData]);

  if (authLoading) return <LoadingScreen />;

  // Current week reward (first pending reward from weekly_complete source)
  const weeklyReward =
    pendingRewards.find((r) => r.source === "weekly_complete") ?? null;

  return (
    <ProtectedRoute>
      <div
        className="dashboard-shell min-h-screen relative"
        style={{ background: "var(--bg-deep, #020F14)" }}
      >
        {/* Navigation */}
        <AppNav
          wordsEncountered={wordsEncountered}
          streak={streak}
          avatarUrl={avatarUrl}
        />
        <ContextualNav />
        <MobileBottomNav wordsEncountered={wordsEncountered} />

        {/* Depth sidebar */}
        <DepthSidebar
          wordCount={wordsEncountered}
          totalMinutes={totalMinutes}
        />

        {/* Main content */}
        <main className="pt-16 sm:pt-20 pb-24 sm:pb-8 sm:pl-16">
          <ChartPageLayout>
            {/* Section 1 — Monthly Goals */}
            <ChartSection>
              <MonthlyGoalsPanel data={monthlyData} loading={goalsLoading} />
            </ChartSection>

            {/* Section 2 — Weekly Goals */}
            <ChartSection>
              <WeeklyGoalsPanel
                week={currentWeek}
                totalWeeks={monthlyData?.totalWeeks ?? 4}
                reward={weeklyReward}
                onClaimReward={claimReward}
                loading={goalsLoading}
              />
            </ChartSection>

            {/* Section 3 — Streak Calendar */}
            <ChartSection>
              <StreakCalendar
                streak={streakData}
                calendarDays={calendarDays}
                currentMonth={currentMonth}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
                loading={streakLoading}
              />
            </ChartSection>

            {/* Section 4 — Gameboard */}
            <ChartSection>
              <Gameboard
                gameboardState={gameboardState}
                onSelectTile={selectTile}
                loading={gameboardLoading}
              />
            </ChartSection>
          </ChartPageLayout>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function ChartPage() {
  return (
    <Suspense>
      <ChartPageContent />
    </Suspense>
  );
}
