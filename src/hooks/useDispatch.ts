"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DispatchThreadWithProfile,
  DispatchReplyWithProfile,
  DispatchCategory,
  CreateThreadPayload,
} from "@/types/dive-tank";

const PAGE_SIZE = 15;

export function useDispatchThreads(category: DispatchCategory = "all") {
  const [threads, setThreads] = useState<DispatchThreadWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchThreads = useCallback(
    async (pageNum = 0) => {
      setLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from("dispatch_threads")
          .select(
            `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
          )
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (category !== "all") {
          query = query.eq("category", category);
        }

        const { data } = await query;
        const items = (data ?? []) as DispatchThreadWithProfile[];
        setThreads(pageNum === 0 ? items : (prev) => [...prev, ...items]);
        setHasMore(items.length === PAGE_SIZE);
        setPage(pageNum);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [category],
  );

  useEffect(() => {
    fetchThreads(0);
  }, [fetchThreads]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchThreads(page + 1);
  }, [hasMore, page, fetchThreads]);

  return { threads, loading, hasMore, loadMore };
}

export function useDispatchReplies(threadId?: string) {
  const [replies, setReplies] = useState<DispatchReplyWithProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReplies = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("dispatch_replies")
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      setReplies((data ?? []) as DispatchReplyWithProfile[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  return { replies, loading, refetch: fetchReplies };
}

export function useCreateThread() {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (payload: CreateThreadPayload) => {
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dispatch_threads")
        .insert({
          user_id: user.id,
          category: payload.category,
          title: payload.title,
          content: payload.content,
        })
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .single();

      if (error) throw error;
      return data as DispatchThreadWithProfile;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
}
