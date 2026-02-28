"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
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
import { cn } from "@/lib/utils";
import "@/styles/ocean-theme.css";
import "@/styles/propel-theme.css";

import {
  activityRegistry,
  getAllTags,
  getActivitiesByCategory,
} from "@/lib/activities/activityRegistry";
import type {
  ActivityTag,
  ActivityCategory,
} from "@/lib/activities/activityRegistry";
import { ActivityCard } from "@/components/propel/ActivityCard";
import type { ActivityCardPersonalizationProps } from "@/components/propel/ActivityCard";
import { TagFilterBar } from "@/components/propel/TagFilterBar";
import {
  PersonalizationBanner,
  PersonalizationBannerSkeleton,
} from "@/components/propel/PersonalizationBanner";
import { WhatNextFAB } from "@/components/propel/WhatNextFAB";
import { getActivityInsights } from "@/lib/actions/getActivityInsights";
import type {
  ActivityInsight,
  PropelPersonalization,
} from "@/lib/actions/getActivityInsights";

// ============================================================================
// Grid class per category
// ============================================================================
const GRID_CLASS: Record<ActivityCategory, string> = {
  Immersion: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6",
  Study: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6",
  Produce: "grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6",
  Compete: "flex justify-center",
};

// ============================================================================
// Propel Content
// ============================================================================
function PropelContent({
  streak,
  avatarUrl,
  targetLanguage,
  isAdmin,
  wordsEncountered,
  insights,
  personalization,
}: {
  streak: number;
  avatarUrl?: string;
  targetLanguage: string;
  isAdmin: boolean;
  wordsEncountered: number;
  insights: ActivityInsight[] | null;
  personalization: PropelPersonalization | null;
}) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTags, setActiveTags] = useState<ActivityTag[]>([]);
  const { ambientView, setAmbientView } = useAmbientPlayer();

  const allTags = useMemo(() => getAllTags(), []);
  const categorised = useMemo(() => getActivitiesByCategory(), []);

  // Filter logic: if no tags selected show all; otherwise OR-match
  const filteredCategories = useMemo(() => {
    if (activeTags.length === 0) return categorised;

    return categorised
      .map((group) => ({
        ...group,
        activities: group.activities.filter((a) =>
          a.tags.some((t) => activeTags.includes(t)),
        ),
      }))
      .filter((group) => group.activities.length > 0);
  }, [activeTags, categorised]);

  // Build per-activity personalization lookup
  const activityPersonalization = useMemo(() => {
    if (!insights || !personalization)
      return new Map<string, ActivityCardPersonalizationProps>();

    const map = new Map<string, ActivityCardPersonalizationProps>();

    for (const insight of insights) {
      const props: ActivityCardPersonalizationProps = {};

      props.isRecommended =
        insight.activityId === personalization.recommendedActivityId;
      props.isNeglected = personalization.neglectedActivityIds.includes(
        insight.activityId,
      );
      props.isNeverTried = personalization.neverTriedActivityIds.includes(
        insight.activityId,
      );
      props.daysSinceLastSession = insight.daysSinceLastSession;

      if (
        insight.daysSinceLastSession !== null &&
        insight.daysSinceLastSession > 0
      ) {
        props.lastDoneLabel =
          insight.daysSinceLastSession === 1
            ? "Last dive: yesterday"
            : `Last dive: ${insight.daysSinceLastSession} days ago`;
      } else if (insight.daysSinceLastSession === 0) {
        props.lastDoneLabel = "Last dive: today";
      }

      map.set(insight.activityId, props);
    }

    return map;
  }, [insights, personalization]);

  const handleTagToggle = useCallback((tag: ActivityTag) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setActiveTags([]);
  }, []);

  // Ensure soundbar is visible when arriving on Propel while ambient is active
  useEffect(() => {
    if (ambientView === "container") {
      setAmbientView("soundbar");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Allow page scroll on Propel
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, []);

  const handleNavigation = useCallback(
    (href: string) => {
      setIsNavigating(true);
      router.push(href);
    },
    [router],
  );

  if (isNavigating) {
    return <LoadingScreen />;
  }

  return (
    <OceanBackground>
      <DepthSidebar wordCount={wordsEncountered} scrollable={false} />

      <AppNav
        streak={streak}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        onBeforeNavigate={handleNavigation}
      />
      <ContextualNav />
      <MobileBottomNav wordsEncountered={wordsEncountered} />

      <div className="propel-root relative z-10 min-h-screen pt-28 pb-20 px-6 lg:pl-[280px]">
        <div className="max-w-4xl mx-auto w-full">
          {/* ── Page header — landing page style ── */}
          <div className="mb-10 propel-stagger-hero">
            <p className="propel-eyebrow mb-3">Training Hub</p>
            <h1 className="propel-title">Propel</h1>
            <p className="propel-subtitle mt-2">
              Choose your training. Build your depth.
            </p>
            {/* Decorative accent line */}
            <div className="mt-5 propel-accent-rule" />
          </div>

          {/* ── Personalization banner ── */}
          <div className="propel-stagger-banner">
            <Suspense fallback={<PersonalizationBannerSkeleton />}>
              <PersonalizationBanner personalization={personalization} />
            </Suspense>
          </div>

          {/* ── Filter bar ── */}
          <div className="mb-10">
            <TagFilterBar
              allTags={allTags}
              activeTags={activeTags}
              onToggle={handleTagToggle}
              onClearAll={handleClearAll}
            />
          </div>

          {/* ── Category sections ── */}
          <div className="space-y-14">
            <AnimatePresence mode="popLayout">
              {filteredCategories.map(
                ({ category, meta, activities }, catIdx) => (
                  <section
                    key={category}
                    className={
                      catIdx === 0
                        ? "propel-stagger-primary"
                        : "propel-stagger-secondary"
                    }
                  >
                    {/* Section label — eyebrow style */}
                    <div className="mb-6">
                      <span className="propel-eyebrow">{meta.label}</span>
                      <div className="mt-3 propel-section-divider" />
                    </div>

                    {/* Card grid */}
                    <div className={GRID_CLASS[category]}>
                      <AnimatePresence mode="popLayout">
                        {activities.map((activity) => (
                          <div
                            key={activity.id}
                            className={cn(
                              category === "Compete" && "w-full max-w-md",
                            )}
                          >
                            <ActivityCard
                              activity={activity}
                              personalization={activityPersonalization.get(
                                activity.id,
                              )}
                            />
                          </div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </section>
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── "What next?" floating action button ── */}
      <WhatNextFAB insights={insights} />
    </OceanBackground>
  );
}

// ============================================================================
// Page — fetches user data, guards auth
// ============================================================================
export default function PropelPage() {
  const router = useRouter();
  const supabase = createClient();

  const [streak, setStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [isAdmin, setIsAdmin] = useState(false);
  const [wordsEncountered, setWordsEncountered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<ActivityInsight[] | null>(null);
  const [personalization, setPersonalization] =
    useState<PropelPersonalization | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

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

      // Fetch personalization data non-blocking (graceful degradation)
      const lang = profile?.target_language ?? "fr";
      try {
        const result = await getActivityInsights(user.id, lang);
        setInsights(result.insights);
        setPersonalization(result.personalization);
      } catch (err) {
        console.error("[PropelPage] Failed to fetch personalization:", err);
        // Graceful degradation — page works without personalization
      }
    };

    load();
  }, [supabase, router]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ProtectedRoute>
      <PropelContent
        streak={streak}
        avatarUrl={avatarUrl}
        targetLanguage={targetLanguage}
        isAdmin={isAdmin}
        wordsEncountered={wordsEncountered}
        insights={insights}
        personalization={personalization}
      />
    </ProtectedRoute>
  );
}
