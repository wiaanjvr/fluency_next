"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DiveSubmissionWithProfile,
  SubmissionType,
  SubmissionSort,
  SubmitDivePayload,
} from "@/types/dive-tank";

const PAGE_SIZE = 12;

export function useDiveSubmissions(options?: {
  filterType?: SubmissionType | "all";
  sort?: SubmissionSort;
  speakingOnly?: boolean;
}) {
  const [submissions, setSubmissions] = useState<DiveSubmissionWithProfile[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchSubmissions = useCallback(
    async (pageNum = 0, append = false) => {
      setLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from("community_submissions")
          .select(
            `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
          )
          .eq("status", "open")
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (options?.speakingOnly) {
          query = query.eq("exercise_type", "speaking");
        } else if (options?.filterType && options.filterType !== "all") {
          query = query.eq("exercise_type", options.filterType);
        }

        // Sort
        switch (options?.sort) {
          case "oldest":
            query = query.order("created_at", { ascending: true });
            break;
          case "unanswered":
            query = query
              .eq("review_count", 0)
              .order("created_at", { ascending: false });
            break;
          case "most-urgent":
            query = query.order("created_at", { ascending: true });
            break;
          default:
            query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query;
        if (error) throw error;

        const items = (data ?? []) as DiveSubmissionWithProfile[];
        setSubmissions(append ? (prev) => [...prev, ...items] : items);
        setHasMore(items.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    },
    [options?.filterType, options?.sort, options?.speakingOnly],
  );

  useEffect(() => {
    fetchSubmissions(0);
  }, [fetchSubmissions]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchSubmissions(page + 1, true);
  }, [hasMore, page, fetchSubmissions]);

  const refresh = useCallback(() => fetchSubmissions(0), [fetchSubmissions]);

  return { submissions, loading, hasMore, loadMore, refresh };
}

export function useMyDiveSubmissions(userId?: string) {
  const [submissions, setSubmissions] = useState<DiveSubmissionWithProfile[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetch = useCallback(
    async (pageNum = 0) => {
      if (!userId) return;
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("community_submissions")
          .select(
            `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        const items = (data ?? []) as DiveSubmissionWithProfile[];
        setSubmissions(pageNum === 0 ? items : (prev) => [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    fetch(0);
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (hasMore) fetch(page + 1);
  }, [hasMore, page, fetch]);

  return { submissions, loading, hasMore, loadMore };
}

export function useSubmitDive() {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (payload: SubmitDivePayload) => {
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("community_submissions")
        .insert({
          user_id: user.id,
          exercise_type: payload.type,
          prompt: payload.prompt ?? null,
          content: payload.content ?? null,
          audio_url: payload.audio_url ?? null,
          language: payload.language_to ?? "de",
        })
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .single();

      if (error) throw error;
      return data as DiveSubmissionWithProfile;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting };
}
