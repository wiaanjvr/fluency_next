"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, MessageSquare, Heart, Clock } from "lucide-react";
import { OceanAvatar } from "./OceanAvatar";
import type { DiveLogWithProfile } from "@/types/dive-tank";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface DiveLogCardProps {
  log: DiveLogWithProfile;
  featured?: boolean;
  onClick?: () => void;
}

export function DiveLogCard({ log, featured, onClick }: DiveLogCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden transition-all duration-200 ${
        hovered
          ? "border-teal-400/30 shadow-lg shadow-teal-900/10 -translate-y-0.5"
          : ""
      } ${featured ? "col-span-2" : ""}`}
    >
      {/* Cover gradient with ocean pattern */}
      <div className="relative h-32 bg-gradient-to-br from-teal-900/40 to-[var(--deep-navy)] overflow-hidden">
        {/* Auto-generated ocean pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.06]"
          viewBox="0 0 200 100"
        >
          <path
            d="M0 50 Q25 30 50 50 T100 50 T150 50 T200 50"
            stroke="#3dd6b5"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0 60 Q25 40 50 60 T100 60 T150 60 T200 60"
            stroke="#3dd6b5"
            strokeWidth="0.5"
            fill="none"
          />
          <path
            d="M0 70 Q25 50 50 70 T100 70 T150 70 T200 70"
            stroke="#3dd6b5"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>

        {/* Featured badge */}
        {featured && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-[10px] text-amber-300 font-semibold shadow-[0_0_12px_rgba(245,158,11,0.15)]">
              ✨ Community Pick
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-teal-400/[0.03] transition-opacity duration-200 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <div className="p-4">
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-white/90 mb-1.5 line-clamp-2 leading-snug">
          {log.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-seafoam/40 line-clamp-2 leading-relaxed mb-3">
          {log.excerpt}
        </p>

        {/* Author + time */}
        <div className="flex items-center gap-2 mb-3">
          <OceanAvatar userId={log.user_id} size={22} />
          <span className="text-[11px] text-seafoam/40">
            {log.profiles?.full_name ?? "Anonymous"}
          </span>
          <span className="text-[10px] text-seafoam/20">·</span>
          <span className="text-[10px] text-seafoam/25">
            {timeAgo(log.created_at)}
          </span>
        </div>

        {/* Tags */}
        {log.tags && log.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {log.tags.slice(0, 3).map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] text-teal-300/60 bg-teal-500/5 border border-teal-500/10 rounded-full px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-[10px] text-seafoam/30">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {log.read_time_minutes} min read
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {log.views}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {log.comment_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {log.likes}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
