"use client";

import { motion } from "framer-motion";
import { OceanAvatar } from "./OceanAvatar";
import { DepthBadge } from "./DepthBadge";
import { MessageSquare, Eye, Pin, Flame, Clock } from "lucide-react";
import type { DispatchThread, DispatchCategory } from "@/types/dive-tank";

const categoryColors: Record<string, string> = {
  all: "text-white/50 bg-white/5 border-white/10",
  "grammar-help": "text-blue-300 bg-blue-500/10 border-blue-500/15",
  vocabulary: "text-emerald-300 bg-emerald-500/10 border-emerald-500/15",
  culture: "text-amber-300 bg-amber-500/10 border-amber-500/15",
  resources: "text-purple-300 bg-purple-500/10 border-purple-500/15",
  "study-methods": "text-cyan-300 bg-cyan-500/10 border-cyan-500/15",
  "wins-struggles": "text-rose-300 bg-rose-500/10 border-rose-500/15",
};

const categoryLabels: Record<string, string> = {
  all: "All",
  "grammar-help": "Grammar Help",
  vocabulary: "Vocabulary",
  culture: "Culture",
  resources: "Resources",
  "study-methods": "Study Methods",
  "wins-struggles": "Wins & Struggles",
};

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface ThreadCardProps {
  thread: DispatchThread & {
    profiles?: { full_name?: string | null; avatar_url?: string | null };
  };
  onClick?: () => void;
}

export function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const isHot = thread.reply_count >= 10;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className="w-full text-left rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-teal-500/15 p-4 transition-colors group"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <OceanAvatar userId={thread.user_id} size={36} />

        <div className="flex-1 min-w-0">
          {/* Top row: badges */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Category badge */}
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                categoryColors[thread.category]
              }`}
            >
              {categoryLabels[thread.category]}
            </span>

            {thread.is_pinned && (
              <span className="text-amber-400/60 flex items-center gap-0.5 text-[10px]">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            )}
            {isHot && (
              <span className="text-orange-400/60 flex items-center gap-0.5 text-[10px]">
                <Flame className="h-3 w-3" /> Hot
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm text-white/80 font-medium truncate group-hover:text-teal-200 transition-colors">
            {thread.title}
          </h3>

          {/* Preview */}
          {thread.content && (
            <p className="text-xs text-seafoam/30 line-clamp-1 mt-0.5">
              {thread.content}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-seafoam/25">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {thread.reply_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {thread.view_count}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(thread.created_at)}
            </span>
            <span className="ml-auto text-seafoam/20">
              {thread.profiles?.full_name || "Diver"}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function ThreadCardSkeleton() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-full bg-white/[0.04]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 bg-white/[0.04] rounded-full" />
          <div className="h-4 w-3/4 bg-white/[0.04] rounded" />
          <div className="h-3 w-1/2 bg-white/[0.03] rounded" />
        </div>
      </div>
    </div>
  );
}
