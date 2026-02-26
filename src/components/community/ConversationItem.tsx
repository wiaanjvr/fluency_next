"use client";

import { motion } from "framer-motion";
import { OceanAvatar } from "./OceanAvatar";
import type { Conversation } from "@/types/dive-tank";

function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface ConversationItemProps {
  conversation: Conversation;
  active?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  active,
  onClick,
}: ConversationItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 2 }}
      className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
        active
          ? "bg-teal-500/10 border border-teal-500/15"
          : "hover:bg-white/[0.03] border border-transparent"
      }`}
    >
      <div className="relative">
        <OceanAvatar userId={conversation.other_user.id} size={40} />
        {conversation.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-teal-500 text-[9px] text-midnight font-bold flex items-center justify-center">
            {conversation.unread_count > 9 ? "9+" : conversation.unread_count}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={`text-sm font-medium truncate ${
              active ? "text-teal-200" : "text-white/60"
            }`}
          >
            {conversation.other_user.full_name || "Diver"}
          </span>
          <span className="text-[9px] text-seafoam/20 ml-2 shrink-0">
            {timeAgo(conversation.last_message_at)}
          </span>
        </div>
        <p className="text-xs text-seafoam/30 truncate mt-0.5">
          {conversation.last_message}
        </p>
      </div>
    </motion.button>
  );
}
