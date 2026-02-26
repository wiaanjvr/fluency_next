"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, Send, Clock } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";
import { useDispatchReplies } from "@/hooks/useDispatch";
import { useAuth } from "@/contexts/AuthContext";
import type { DispatchThread, DispatchReply } from "@/types/dive-tank";

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ThreadViewerProps {
  thread: DispatchThread & {
    profiles?: { full_name?: string | null; avatar_url?: string | null };
  };
  onClose: () => void;
}

export function ThreadViewer({ thread, onClose }: ThreadViewerProps) {
  const { user } = useAuth();
  const { replies, loading } = useDispatchReplies(thread.id);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim() || !user) return;
    setSubmitting(true);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await supabase.from("dispatch_replies").insert({
        thread_id: thread.id,
        user_id: user.id,
        body: replyText.trim(),
      });
      setReplyText("");
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full max-w-lg bg-[var(--deep-navy)] border-l border-white/[0.06] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/[0.06]">
        <button
          onClick={onClose}
          className="text-seafoam/40 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-white/80 truncate flex-1">
          {thread.title}
        </h2>
        <button
          onClick={onClose}
          className="text-seafoam/30 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Thread body */}
      <div className="p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 mb-3">
          <OceanAvatar userId={thread.user_id} size={32} />
          <div>
            <span className="text-xs font-medium text-white/60">
              {thread.profiles?.full_name || "Diver"}
            </span>
            <span className="text-[10px] text-seafoam/25 ml-2 flex items-center gap-1 inline-flex">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo(thread.created_at)}
            </span>
          </div>
        </div>
        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
          {thread.content}
        </p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && replies.length === 0 && (
          <p className="text-xs text-seafoam/25 text-center py-8">
            No replies yet — be the first to respond!
          </p>
        )}

        <AnimatePresence>
          {replies.map((reply, i) => (
            <ReplyBubble key={reply.id} reply={reply} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Reply composer */}
      <div className="p-4 border-t border-white/[0.06]">
        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-sm text-white/80 placeholder:text-seafoam/20 outline-none focus:border-teal-500/20 resize-none"
          />
          <button
            onClick={handleReply}
            disabled={submitting || !replyText.trim()}
            className="rounded-xl bg-teal-500/20 text-teal-300 p-3 hover:bg-teal-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ReplyBubble({
  reply,
  index,
}: {
  reply: DispatchReply & {
    profiles?: { full_name?: string | null; avatar_url?: string | null };
  };
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-2.5"
    >
      <OceanAvatar userId={reply.user_id} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium text-white/50">
            {reply.profiles?.full_name || "Diver"}
          </span>
          <span className="text-[9px] text-seafoam/20">
            {timeAgo(reply.created_at)}
          </span>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2">
          <p className="text-xs text-white/65 leading-relaxed whitespace-pre-wrap">
            {reply.content}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
