"use client";

import { motion } from "framer-motion";
import { User as UserIcon } from "lucide-react";

interface DuelHeaderProps {
  myName: string;
  myAvatar?: string | null;
  myScore: number;
  myElo?: number;
  myWinRate?: number;
  opponentName: string;
  opponentAvatar?: string | null;
  opponentScore: number;
  opponentElo?: number;
  opponentWinRate?: number;
  currentRound: number;
  maxRounds: number;
  roundWinners?: (string | null)[]; // array of 'you', 'them', or null per round
  language: string;
  difficulty: string;
  flag: string;
}

export default function DuelHeader({
  myName,
  myAvatar,
  myScore,
  myElo,
  myWinRate,
  opponentName,
  opponentAvatar,
  opponentScore,
  opponentElo,
  opponentWinRate,
  currentRound,
  maxRounds,
  roundWinners = [],
  language,
  difficulty,
  flag,
}: DuelHeaderProps) {
  return (
    <div
      className="rounded-3xl p-6 md:p-8"
      style={{
        background: "rgba(13, 27, 42, 0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(61, 214, 181, 0.08)",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Language + difficulty chip */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-lg">{flag}</span>
        <span
          className="font-body text-xs px-3 py-1 rounded-full"
          style={{
            color: "#718096",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {language} · {difficulty}
        </span>
      </div>

      {/* Versus header cards */}
      <div className="flex items-center justify-center gap-4 md:gap-8">
        {/* You */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(61, 214, 181, 0.1)",
              border: "2px solid rgba(61, 214, 181, 0.3)",
              boxShadow: "0 0 20px rgba(61, 214, 181, 0.1)",
            }}
          >
            {myAvatar ? (
              <img
                src={myAvatar}
                alt={myName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-7 h-7" style={{ color: "#3dd6b5" }} />
            )}
          </div>
          <span
            className="font-body text-xs font-medium"
            style={{ color: "#3dd6b5" }}
          >
            {myName}
          </span>
          {myElo !== undefined && (
            <span
              className="font-body text-[10px]"
              style={{ color: "#718096" }}
            >
              {myElo} atm
            </span>
          )}
        </motion.div>

        {/* Score center */}
        <div className="text-center relative">
          <div className="flex items-center gap-3 md:gap-5">
            <motion.span
              className="font-display text-4xl md:text-5xl font-bold"
              style={{
                color: myScore >= opponentScore ? "#3dd6b5" : "#e8d5b0",
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            >
              {myScore}
            </motion.span>

            {/* Pulsing VS dot */}
            <div className="relative flex flex-col items-center">
              <div className="w-px h-4 bg-white/10" />
              <motion.div
                className="w-3 h-3 rounded-full my-1"
                style={{
                  background: "#3dd6b5",
                  boxShadow: "0 0 8px rgba(61, 214, 181, 0.5)",
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <div className="w-px h-4 bg-white/10" />
            </div>

            <motion.span
              className="font-display text-4xl md:text-5xl font-bold"
              style={{
                color: opponentScore >= myScore ? "#e8d5b0" : "#718096",
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            >
              {opponentScore}
            </motion.span>
          </div>
        </div>

        {/* Opponent */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "2px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {opponentAvatar ? (
              <img
                src={opponentAvatar}
                alt={opponentName}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-7 h-7" style={{ color: "#718096" }} />
            )}
          </div>
          <span
            className="font-body text-xs font-medium"
            style={{ color: "#e8d5b0" }}
          >
            {opponentName}
          </span>
          {opponentElo !== undefined && (
            <span
              className="font-body text-[10px]"
              style={{ color: "#718096" }}
            >
              {opponentElo} atm
            </span>
          )}
        </motion.div>
      </div>

      {/* Round progress bar */}
      <div className="mt-6">
        <div className="flex items-center justify-center gap-1 mb-2">
          <span className="font-body text-xs" style={{ color: "#718096" }}>
            Round {currentRound} of {maxRounds}
          </span>
        </div>
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: maxRounds }).map((_, i) => {
            const winner = roundWinners[i];
            let bgColor = "rgba(255, 255, 255, 0.06)";
            if (winner === "you") bgColor = "#3dd6b5";
            else if (winner === "them") bgColor = "#e8d5b0";
            else if (i < currentRound - 1)
              bgColor = "rgba(255, 255, 255, 0.15)";

            return (
              <motion.div
                key={i}
                className="h-1.5 rounded-full flex-1 max-w-[40px]"
                style={{ background: bgColor }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.08,
                  ease: [0.4, 0, 0.2, 1],
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
