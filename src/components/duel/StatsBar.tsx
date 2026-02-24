"use client";

import { motion } from "framer-motion";
import { Trophy, Zap, Flame } from "lucide-react";

interface StatChip {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  glowColor: string;
}

interface StatsBarProps {
  winRate: number;
  activeDuels: number;
  winStreak: number;
}

export default function StatsBar({
  winRate,
  activeDuels,
  winStreak,
}: StatsBarProps) {
  const chips: StatChip[] = [
    {
      icon: <Trophy className="w-4 h-4" />,
      label: "Win Rate",
      value: `${winRate}%`,
      color: winRate >= 50 ? "#3dd6b5" : "#F59E0B",
      glowColor:
        winRate >= 50 ? "rgba(61, 214, 181, 0.15)" : "rgba(245, 158, 11, 0.15)",
    },
    {
      icon: <Zap className="w-4 h-4" />,
      label: "Active Duels",
      value: activeDuels,
      color: "#3B82F6",
      glowColor: "rgba(59, 130, 246, 0.15)",
    },
    {
      icon: <Flame className="w-4 h-4" />,
      label: "Win Streak",
      value: winStreak,
      color: winStreak >= 3 ? "#3dd6b5" : "#F59E0B",
      glowColor:
        winStreak >= 3
          ? "rgba(61, 214, 181, 0.15)"
          : "rgba(245, 158, 11, 0.15)",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {chips.map((chip, i) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: i * 0.1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(13, 27, 42, 0.7)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(61, 214, 181, 0.08)",
            boxShadow: `0 4px 20px ${chip.glowColor}`,
          }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{ color: chip.color }}
          >
            {chip.icon}
            <span
              className="font-body text-[10px] uppercase tracking-wider"
              style={{ color: "#718096" }}
            >
              {chip.label}
            </span>
          </div>
          <span
            className="font-display text-2xl font-bold"
            style={{ color: "#f7fafc" }}
          >
            {chip.value}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
