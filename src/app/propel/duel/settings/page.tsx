"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  OceanBackground,
  OceanNavigation,
  DepthSidebar,
} from "@/components/ocean";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { DuelSettings } from "@/components/duel";
import type { DuelStats } from "@/types/duel";
import "@/styles/ocean-theme.css";

// ============================================================================
// Settings Content
// ============================================================================
function SettingsContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  userId,
  userName,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  userId: string;
  userName?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<DuelStats | null>(null);

  const handleNavigation = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await supabase
          .from("duel_stats")
          .select("*")
          .eq("user_id", userId)
          .single();
        if (data) setStats(data as DuelStats);
      } catch {
        // Stats may not exist yet
      }
    };
    fetchStats();
  }, [supabase, userId]);

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <OceanNavigation
        streak={streak}
        avatarUrl={avatarUrl}
        currentPath="/propel/duel/settings"
        isAdmin={isAdmin}
        targetLanguage={targetLanguage}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />

      <div className="relative z-10 min-h-screen flex flex-col pt-20 pb-12 px-6 md:pl-[370px]">
        <DuelSettings
          userId={userId}
          userName={userName}
          avatarUrl={avatarUrl}
          userStats={
            stats
              ? {
                  elo: Math.round(
                    (stats.duels_won / Math.max(stats.duels_played, 1)) * 1500,
                  ),
                  wins: stats.duels_won,
                  losses: stats.duels_played - stats.duels_won,
                  draws: 0,
                  win_streak: stats.current_streak,
                }
              : undefined
          }
        />
      </div>
    </OceanBackground>
  );
}

// ============================================================================
// Page
// ============================================================================
export default function DuelSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState<string | undefined>();
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
      setUserName(
        user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0],
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
      <SettingsContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        userId={userId}
        userName={userName}
      />
    </ProtectedRoute>
  );
}
