"use client";

import { motion } from "framer-motion";
import { OceanAvatar } from "./OceanAvatar";
import { Check, CheckCheck } from "lucide-react";
import type { DirectMessage } from "@/types/dive-tank";

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MessageBubbleProps {
  message: DirectMessage;
  isOwn: boolean;
  showAvatar?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
}: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar (non-own only) */}
      {!isOwn && showAvatar && (
        <OceanAvatar userId={message.sender_id} size={28} />
      )}
      {!isOwn && !showAvatar && <div className="w-7" />}

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isOwn
            ? "bg-teal-500/15 text-teal-100/90 rounded-br-md border border-teal-500/10"
            : "bg-white/[0.04] text-white/75 rounded-bl-md border border-white/[0.06]"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={`flex items-center gap-1 mt-1 ${
            isOwn ? "justify-end" : ""
          }`}
        >
          <span className="text-[9px] text-seafoam/20">
            {formatTime(message.created_at)}
          </span>
          {isOwn && (
            <span className="text-teal-400/40">
              {message.is_read ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
