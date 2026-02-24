"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, ChevronRight, User as UserIcon } from "lucide-react";
import type { DuelWithProfiles, DuelLanguage } from "@/types/duel";
import { LANGUAGE_FLAGS } from "@/types/duel";

interface DuelCardProps {
  duel: DuelWithProfiles;
  currentUserId: string;
  index?: number;
}

export default function DuelCard({
  duel,
  currentUserId,
  index = 0,
}: DuelCardProps) {
  const router = useRouter();

  const isChallenger = duel.challenger_id === currentUserId;
  const opponent = isChallenger
    ? duel.opponent_profile
    : duel.challenger_profile;
  const myScore = isChallenger ? duel.challenger_score : duel.opponent_score;
  const theirScore = isChallenger ? duel.opponent_score : duel.challenger_score;

  const isMyTurn = duel.current_turn === currentUserId;
  const isPending = duel.status === "pending";
  const isCompleted = duel.status === "completed";
  const isDeclined = duel.status === "declined";

  const opponentName =
    opponent?.display_name ||
    opponent?.id?.slice(0, 8) ||
    duel.opponent_email ||
    "Unknown";
  const flag = LANGUAGE_FLAGS[duel.language_code as DuelLanguage] || "🌊";

  function getStatusLabel() {
    if (isPending && !isChallenger) return "ACCEPT?";
    if (isPending && isChallenger) return "SENT";
    if (isDeclined) return "DECLINED";
    if (isCompleted) {
      if (duel.winner_id === currentUserId) return "VICTORY";
      if (duel.winner_id === null) return "DRAW";
      return "DEFEAT";
    }
    if (isMyTurn) return "YOUR MOVE";
    return "THINKING...";
  }

  function getStatusStyle(): { bg: string; color: string; border: string } {
    const label = getStatusLabel();
    switch (label) {
      case "YOUR MOVE":
      case "ACCEPT?":
        return {
          bg: "rgba(61, 214, 181, 0.15)",
          color: "#3dd6b5",
          border: "rgba(61, 214, 181, 0.3)",
        };
      case "VICTORY":
        return {
          bg: "rgba(16, 185, 129, 0.15)",
          color: "#10B981",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "DEFEAT":
        return {
          bg: "rgba(248, 113, 113, 0.1)",
          color: "#f87171",
          border: "rgba(248, 113, 113, 0.2)",
        };
      case "DRAW":
        return {
          bg: "rgba(245, 158, 11, 0.1)",
          color: "#F59E0B",
          border: "rgba(245, 158, 11, 0.2)",
        };
      case "THINKING...":
        return {
          bg: "rgba(245, 158, 11, 0.08)",
          color: "#F59E0B",
          border: "rgba(245, 158, 11, 0.15)",
        };
      default:
        return {
          bg: "rgba(255, 255, 255, 0.05)",
          color: "#718096",
          border: "rgba(255, 255, 255, 0.1)",
        };
    }
  }

  const showPulse = isMyTurn || (isPending && !isChallenger);
  const statusLabel = getStatusLabel();
  const statusStyle = getStatusStyle();
  const isWinning = myScore > theirScore;
  const isTied = myScore === theirScore;

  return (
    <motion.button
      onClick={() => router.push(`/propel/duel/${duel.id}`)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: index * 0.08,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.25 },
      }}
      className="w-full text-left relative rounded-3xl overflow-hidden cursor-pointer group"
      style={{
        background: "rgba(13, 27, 42, 0.7)",
        backdropFilter: "blur(20px)",
        border: showPulse
          ? "1px solid rgba(61, 214, 181, 0.2)"
          : isCompleted || isDeclined
            ? "1px solid rgba(255, 255, 255, 0.04)"
            : "1px solid rgba(61, 214, 181, 0.08)",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Left accent border for active states */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-300"
        style={{
          background: showPulse
            ? "linear-gradient(to bottom, #3dd6b5, transparent)"
            : "transparent",
          opacity: showPulse ? 1 : 0,
        }}
      />

      {/* Glow for pulse states */}
      {showPulse && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.02, 0.05, 0.02] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(ellipse at 30% 50%, rgba(61, 214, 181, 0.3) 0%, transparent 60%)",
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-4 px-5 py-4">
        {/* Avatar with presence dot */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: showPulse
                ? "rgba(61, 214, 181, 0.1)"
                : "rgba(255, 255, 255, 0.05)",
              border: showPulse
                ? "2px solid rgba(61, 214, 181, 0.25)"
                : isCompleted
                  ? "2px solid rgba(255, 255, 255, 0.06)"
                  : "2px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {opponent?.avatar_url ? (
              <img
                src={opponent.avatar_url}
                alt={opponentName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon
                className="w-5 h-5"
                style={{ color: showPulse ? "#3dd6b5" : "#718096" }}
              />
            )}
          </div>
          {/* Presence dot */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
            style={{
              borderColor: "#0d1b2a",
              background:
                duel.status === "active" ? "#10B981" : "rgba(255,255,255,0.15)",
            }}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-body text-sm font-semibold truncate"
              style={{ color: "#f7fafc" }}
            >
              {opponentName}
            </span>
            <span className="text-xs">{flag}</span>
            <span
              className="font-body text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: "#718096",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {duel.difficulty}
            </span>
          </div>

          {/* Score line */}
          {duel.status !== "pending" && duel.status !== "declined" && (
            <div className="flex items-center gap-2.5 mt-1.5">
              <span
                className="font-display text-xl font-bold"
                style={{
                  color: isWinning ? "#3dd6b5" : isTied ? "#e8d5b0" : "#718096",
                }}
              >
                {myScore}
              </span>
              <span
                className="font-body text-xs"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                —
              </span>
              <span
                className="font-display text-xl font-bold"
                style={{ color: "#e8d5b0", opacity: 0.7 }}
              >
                {theirScore}
              </span>
              {duel.status === "active" && (
                <span
                  className="font-body text-[10px] ml-1"
                  style={{ color: "#718096" }}
                >
                  Rd {duel.current_round}/{duel.max_rounds}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <motion.span
            className="font-body text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full"
            style={{
              color: statusStyle.color,
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
            }}
            animate={statusLabel === "YOUR MOVE" ? { scale: [1, 1.03, 1] } : {}}
            transition={
              statusLabel === "YOUR MOVE"
                ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
          >
            {statusLabel === "THINKING..." && (
              <span className="inline-flex gap-0.5 mr-1.5">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="w-1 h-1 rounded-full inline-block"
                    style={{ background: statusStyle.color }}
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: dot * 0.15,
                    }}
                  />
                ))}
              </span>
            )}
            {statusLabel}
          </motion.span>

          {/* Chevron */}
          <ChevronRight
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: "#718096" }}
          />
        </div>
      </div>

      {/* Bottom gradient accent */}
      <div
        className="h-px w-full transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(61, 214, 181, 0.15) 50%, transparent 100%)",
          opacity: showPulse ? 0.6 : 0.15,
        }}
      />
    </motion.button>
  );
}
