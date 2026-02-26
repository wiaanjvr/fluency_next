"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DiveReviewWithProfile,
  SubmitReviewPayload,
} from "@/types/dive-tank";

export function useDiveReviews(submissionId?: string) {
  const [reviews, setReviews] = useState<DiveReviewWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("community_reviews")
        .select(
          `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      setReviews((data ?? []) as DiveReviewWithProfile[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Real-time subscription
  useEffect(() => {
    if (!submissionId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`reviews:${submissionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_reviews",
          filter: `submission_id=eq.${submissionId}`,
        },
        () => {
          fetchReviews();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [submissionId, fetchReviews]);

  return { reviews, loading, refetch: fetchReviews };
}

export function useSubmitReview() {
  const [submitting, setSubmitting] = useState(false);

  const submitReview = useCallback(async (payload: SubmitReviewPayload) => {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("community_reviews")
        .insert({
          submission_id: payload.submission_id,
          reviewer_id: user.id,
          inline_corrections: payload.corrections,
          overall_feedback: payload.overall_feedback ?? null,
          rating: null,
          corrected_text: null,
        })
        .select(
          `*, profiles:reviewer_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .single();

      if (error) throw error;

      // Award XP
      await supabase.rpc("award_community_xp", {
        p_user_id: user.id,
        p_xp: 5,
      });

      return { review: data as DiveReviewWithProfile, xpAwarded: 5 };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitReview, submitting };
}
