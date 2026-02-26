"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  DiveLogWithProfile,
  CreateDiveLogPayload,
} from "@/types/dive-tank";

const PAGE_SIZE = 10;

export function useDiveLogs() {
  const [logs, setLogs] = useState<DiveLogWithProfile[]>([]);
  const [featured, setFeatured] = useState<DiveLogWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Fetch featured
      if (pageNum === 0) {
        const { data: featuredData } = await supabase
          .from("dive_logs")
          .select(
            `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
          )
          .eq("is_featured", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setFeatured(featuredData as DiveLogWithProfile | null);
      }

      const { data } = await supabase
        .from("dive_logs")
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      const items = (data ?? []) as DiveLogWithProfile[];
      setLogs(pageNum === 0 ? items : (prev) => [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchLogs(page + 1);
  }, [hasMore, page, fetchLogs]);

  return { logs, featured, loading, hasMore, loadMore };
}

export function useCreateDiveLog() {
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (payload: CreateDiveLogPayload) => {
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const wordCount = payload.content.split(/\s+/).length;
      const readTime = Math.max(1, Math.round(wordCount / 200));
      const excerpt =
        payload.content.slice(0, 160).replace(/\s+\S*$/, "") + "…";

      const { data, error } = await supabase
        .from("dive_logs")
        .insert({
          user_id: user.id,
          title: payload.title,
          content: payload.content,
          excerpt,
          tags: payload.tags,
          read_time_minutes: readTime,
        })
        .select(
          `*, profiles:user_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .single();

      if (error) throw error;
      return data as DiveLogWithProfile;
    } finally {
      setCreating(false);
    }
  }, []);

  return { create, creating };
}
