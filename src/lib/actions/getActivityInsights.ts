"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { activityRegistry } from "@/lib/activities/activityRegistry";
import type { ActivityTag } from "@/lib/activities/activityRegistry";

// =============================================================================
// Types
// =============================================================================

export type ActivityInsight = {
  activityId: string;
  daysSinceLastSession: number | null; // null = never done
  totalSessionsAllTime: number;
  averageDurationSeconds: number;
  lastDoneAt: Date | null;
};

export type PropelPersonalization = {
  recommendedActivityId: string; // single top recommendation
  recommendationReason: string; // human-readable reason
  neglectedActivityIds: string[]; // activities not done in 7+ days
  streakActivityId: string | null; // activity done most consistently
  neverTriedActivityIds: string[]; // activities with 0 sessions
};

// =============================================================================
// Skill area mapping — groups tags into broader skill areas
// =============================================================================

const SKILL_AREA_TAGS: Record<string, ActivityTag[]> = {
  Speaking: ["Speaking"],
  Grammar: ["Grammar"],
  Vocabulary: ["Vocabulary"],
  Listening: ["Listening"],
  Reading: ["Reading"],
  Writing: ["Writing"],
};

// =============================================================================
// Ocean-themed recommendation reasons
// =============================================================================

const NEVER_TRIED_REASONS = [
  "Uncharted territory — ready to explore?",
  "These waters are untouched. Time to dive in.",
  "A new depth awaits. You haven't been here yet.",
];

const NEGLECTED_REASONS = [
  "These waters have been quiet lately.",
  "The current misses you here.",
  "This part of the ocean has been still for too long.",
];

const LOWEST_COUNT_REASONS = [
  "You've barely skimmed the surface here.",
  "More depth is waiting — keep diving.",
  "The rarest dive in your log. Time for another.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =============================================================================
// Core logic
// =============================================================================

async function fetchActivityInsights(
  userId: string,
  languageCode: string,
): Promise<{
  insights: ActivityInsight[];
  personalization: PropelPersonalization;
}> {
  const supabase = await createClient();

  // Fetch all sessions for this user + language
  const { data: sessions, error } = await supabase
    .from("user_activity_sessions")
    .select("activity_id, started_at, completed_at, duration_seconds")
    .eq("user_id", userId)
    .eq("language_code", languageCode);

  if (error) {
    console.error("[getActivityInsights] Supabase error:", error.message);
    // Return empty but valid data so UI degrades gracefully
    return buildFallback();
  }

  const rows = sessions ?? [];

  // ── Build insights per activity ──────────────────────────────────────────
  const now = Date.now();

  // Exclude "duel" from personalization (competition shouldn't feel overdue)
  const eligibleActivities = activityRegistry.filter((a) => a.id !== "duel");

  const insights: ActivityInsight[] = eligibleActivities.map((activity) => {
    const activitySessions = rows.filter((s) => s.activity_id === activity.id);

    if (activitySessions.length === 0) {
      return {
        activityId: activity.id,
        daysSinceLastSession: null,
        totalSessionsAllTime: 0,
        averageDurationSeconds: 0,
        lastDoneAt: null,
      };
    }

    const lastSession = activitySessions.reduce((latest, s) => {
      const d = new Date(s.started_at).getTime();
      return d > new Date(latest.started_at).getTime() ? s : latest;
    });

    const lastDoneAt = new Date(lastSession.started_at);
    const daysSince = Math.floor(
      (now - lastDoneAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const totalDuration = activitySessions.reduce(
      (sum, s) => sum + (s.duration_seconds ?? 0),
      0,
    );

    return {
      activityId: activity.id,
      daysSinceLastSession: daysSince,
      totalSessionsAllTime: activitySessions.length,
      averageDurationSeconds:
        activitySessions.length > 0
          ? Math.round(totalDuration / activitySessions.length)
          : 0,
      lastDoneAt,
    };
  });

  // Also add duel insight (without personalization flags)
  const duelSessions = rows.filter((s) => s.activity_id === "duel");
  if (duelSessions.length > 0) {
    const lastDuel = duelSessions.reduce((latest, s) => {
      return new Date(s.started_at).getTime() >
        new Date(latest.started_at).getTime()
        ? s
        : latest;
    });
    const lastDuelAt = new Date(lastDuel.started_at);
    const duelDays = Math.floor(
      (now - lastDuelAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const duelDuration = duelSessions.reduce(
      (sum, s) => sum + (s.duration_seconds ?? 0),
      0,
    );
    insights.push({
      activityId: "duel",
      daysSinceLastSession: duelDays,
      totalSessionsAllTime: duelSessions.length,
      averageDurationSeconds: Math.round(duelDuration / duelSessions.length),
      lastDoneAt: lastDuelAt,
    });
  } else {
    insights.push({
      activityId: "duel",
      daysSinceLastSession: null,
      totalSessionsAllTime: 0,
      averageDurationSeconds: 0,
      lastDoneAt: null,
    });
  }

  // ── Personalization logic ────────────────────────────────────────────────

  const neverTriedActivityIds = insights
    .filter((i) => i.totalSessionsAllTime === 0 && i.activityId !== "duel")
    .map((i) => i.activityId);

  const neglectedActivityIds = insights
    .filter(
      (i) =>
        i.activityId !== "duel" &&
        i.daysSinceLastSession !== null &&
        i.daysSinceLastSession >= 7,
    )
    .map((i) => i.activityId);

  // Streak: activity done most consistently = highest total sessions
  const streakActivityId =
    insights
      .filter((i) => i.activityId !== "duel" && i.totalSessionsAllTime > 0)
      .sort((a, b) => b.totalSessionsAllTime - a.totalSessionsAllTime)[0]
      ?.activityId ?? null;

  // ── Recommendation algorithm ─────────────────────────────────────────────

  let recommendedActivityId: string;
  let recommendationReason: string;

  if (neverTriedActivityIds.length > 0) {
    // Priority: newest first by registry order (last in registry = newest)
    const registryOrderIds = eligibleActivities.map((a) => a.id);
    const neverTriedByRegistryOrder = neverTriedActivityIds.sort(
      (a, b) => registryOrderIds.indexOf(b) - registryOrderIds.indexOf(a),
    );
    recommendedActivityId = neverTriedByRegistryOrder[0];
    recommendationReason = pickRandom(NEVER_TRIED_REASONS);
  } else if (neglectedActivityIds.length > 0) {
    // Find the neglected activity in the highest-priority skill area
    // Priority order: Speaking > Grammar > Vocabulary > Listening > Reading > Writing
    const skillPriority = [
      "Speaking",
      "Grammar",
      "Vocabulary",
      "Listening",
      "Reading",
      "Writing",
    ];

    let found = false;
    recommendedActivityId = neglectedActivityIds[0]; // fallback
    recommendationReason = pickRandom(NEGLECTED_REASONS);

    for (const skill of skillPriority) {
      const skillTags = SKILL_AREA_TAGS[skill];
      const matchingActivities = eligibleActivities.filter(
        (a) =>
          neglectedActivityIds.includes(a.id) &&
          a.tags.some((t) => skillTags.includes(t)),
      );
      if (matchingActivities.length > 0) {
        recommendedActivityId = matchingActivities[0].id;
        const insight = insights.find(
          (i) => i.activityId === recommendedActivityId,
        );
        const days = insight?.daysSinceLastSession ?? 7;
        recommendationReason = `You haven't practiced ${skill} in ${days} days. ${pickRandom(NEGLECTED_REASONS)}`;
        found = true;
        break;
      }
    }

    if (!found) {
      recommendationReason = pickRandom(NEGLECTED_REASONS);
    }
  } else {
    // All tried recently — recommend lowest session count
    const lowestCount = insights
      .filter((i) => i.activityId !== "duel")
      .sort((a, b) => a.totalSessionsAllTime - b.totalSessionsAllTime)[0];

    recommendedActivityId = lowestCount?.activityId ?? eligibleActivities[0].id;
    recommendationReason = pickRandom(LOWEST_COUNT_REASONS);
  }

  return {
    insights,
    personalization: {
      recommendedActivityId,
      recommendationReason,
      neglectedActivityIds,
      streakActivityId,
      neverTriedActivityIds,
    },
  };
}

// =============================================================================
// Fallback when data fetch fails — graceful degradation
// =============================================================================

function buildFallback(): {
  insights: ActivityInsight[];
  personalization: PropelPersonalization;
} {
  const insights: ActivityInsight[] = activityRegistry.map((a) => ({
    activityId: a.id,
    daysSinceLastSession: null,
    totalSessionsAllTime: 0,
    averageDurationSeconds: 0,
    lastDoneAt: null,
  }));

  return {
    insights,
    personalization: {
      recommendedActivityId: activityRegistry[0].id,
      recommendationReason: "Uncharted territory — ready to explore?",
      neglectedActivityIds: [],
      streakActivityId: null,
      neverTriedActivityIds: activityRegistry
        .filter((a) => a.id !== "duel")
        .map((a) => a.id),
    },
  };
}

// =============================================================================
// Exported server action
// React cache() deduplicates repeated calls within the same request.
// The calling client component stores the result in useState, so it only
// runs once per page mount — no unstable_cache needed (which cannot accept
// dynamic data sources like cookies() inside its scope).
// =============================================================================

export const getActivityInsights = cache(
  async (
    userId: string,
    languageCode: string,
  ): Promise<{
    insights: ActivityInsight[];
    personalization: PropelPersonalization;
  }> => {
    return fetchActivityInsights(userId, languageCode);
  },
);
