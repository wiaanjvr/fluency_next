"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Conversation,
  DirectMessageWithProfile,
  SendMessagePayload,
} from "@/types/dive-tank";

export function useConversations(userId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      // Fetch distinct conversations: messages where user is sender or receiver
      const { data } = await supabase
        .from("direct_messages")
        .select(
          `*, sender:sender_id (id, full_name, avatar_url, target_language, native_language), receiver:receiver_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      // Group by conversation partner
      const convMap = new Map<string, Conversation>();
      for (const msg of data ?? []) {
        const otherId =
          msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        const other =
          msg.sender_id === userId
            ? (msg as any).receiver
            : (msg as any).sender;

        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            id: otherId,
            other_user: {
              ...other,
              depth_rank: "The Shallows",
              is_online: false,
              last_active_at: null,
            },
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: msg.receiver_id === userId && !msg.is_read ? 1 : 0,
          });
        } else if (msg.receiver_id === userId && !msg.is_read) {
          const conv = convMap.get(otherId)!;
          conv.unread_count++;
        }
      }

      setConversations(Array.from(convMap.values()));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen for new messages
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("dm_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchConversations();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useDirectMessages(userId?: string, otherUserId?: string) {
  const [messages, setMessages] = useState<DirectMessageWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef =
    useRef<ReturnType<ReturnType<typeof createClient>["channel"]>>();

  const fetchMessages = useCallback(async () => {
    if (!userId || !otherUserId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("direct_messages")
        .select(
          `*, sender:sender_id (id, full_name, avatar_url, target_language, native_language)`,
        )
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true });

      setMessages((data ?? []) as DirectMessageWithProfile[]);

      // Mark unread as read
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", userId)
        .eq("is_read", false);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time for new messages in this conversation
  useEffect(() => {
    if (!userId || !otherUserId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dm:${userId}:${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const msg = payload.new as any;
          if (
            (msg.sender_id === userId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === userId)
          ) {
            fetchMessages();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, otherUserId, fetchMessages]);

  return { messages, loading };
}

export function useSendMessage() {
  const [sending, setSending] = useState(false);

  const send = useCallback(async (payload: SendMessagePayload) => {
    setSending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        receiver_id: payload.receiver_id,
        content: payload.content,
        audio_url: payload.audio_url ?? null,
        is_de_mode: payload.is_de_mode ?? false,
      });

      if (error) throw error;
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending };
}
