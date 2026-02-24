"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Settings,
  Bell,
  Trophy,
  ChevronLeft,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface DuelSettingsProps {
  userId: string;
  userStats?: {
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    win_streak: number;
  };
  userName?: string;
  avatarUrl?: string;
}

type Tab = "profile" | "preferences" | "notifications" | "leaderboard";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
  {
    id: "preferences",
    label: "Preferences",
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: "leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="w-4 h-4" />,
  },
];

/* ─── Rank system ──────────────────────────────────────────────────── */
const RANKS = [
  { name: "Surface Swimmer", minElo: 0, color: "#60A5FA", creature: "🐟" },
  { name: "Reef Explorer", minElo: 800, color: "#34D399", creature: "🐠" },
  { name: "Tide Turner", minElo: 1000, color: "#3dd6b5", creature: "🐬" },
  { name: "Deep Diver", minElo: 1200, color: "#8B5CF6", creature: "🐙" },
  { name: "Trench Master", minElo: 1500, color: "#F59E0B", creature: "🦑" },
  {
    name: "Abyssal Champion",
    minElo: 1800,
    color: "#EC4899",
    creature: "🐋",
  },
];

function getRank(elo: number) {
  return [...RANKS].reverse().find((r) => elo >= r.minElo) || RANKS[0];
}

/* ─── Toggle Switch ────────────────────────────────────────────────── */
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-300"
      style={{
        background: enabled
          ? "rgba(61, 214, 181, 0.4)"
          : "rgba(255, 255, 255, 0.1)",
      }}
    >
      <motion.div
        className="absolute top-0.5 w-5 h-5 rounded-full"
        animate={{ left: enabled ? "22px" : "2px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          background: enabled ? "#3dd6b5" : "rgba(255, 255, 255, 0.4)",
          boxShadow: enabled ? "0 0 10px rgba(61, 214, 181, 0.3)" : "none",
        }}
      />
    </button>
  );
}

/* ─── Settings Row ─────────────────────────────────────────────────── */
function SettingRow({
  icon,
  label,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.04]">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            color: "#3dd6b5",
          }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p
            className="font-body text-sm font-medium"
            style={{ color: "#e8d5b0" }}
          >
            {label}
          </p>
          {description && (
            <p
              className="font-body text-[11px] mt-0.5"
              style={{ color: "#718096" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────── */
export default function DuelSettings({
  userId,
  userStats,
  userName,
  avatarUrl,
}: DuelSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [challengeNotif, setChallengeNotif] = useState(true);
  const [turnNotif, setTurnNotif] = useState(true);
  const [resultNotif, setResultNotif] = useState(true);
  const [friendRequests, setFriendRequests] = useState(true);

  const elo = userStats?.elo || 1000;
  const rank = getRank(elo);
  const wins = userStats?.wins || 0;
  const losses = userStats?.losses || 0;
  const draws = userStats?.draws || 0;
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/propel/duel"
        className="inline-flex items-center gap-2 font-body text-xs hover:opacity-70 transition-opacity"
        style={{ color: "#718096" }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Duels
      </Link>

      {/* Header */}
      <div>
        <h1
          className="font-display text-2xl md:text-3xl font-bold"
          style={{ color: "#e8d5b0" }}
        >
          Duel Settings
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: "#718096" }}>
          Customize your duel experience
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
        style={{ background: "rgba(255, 255, 255, 0.03)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-body text-xs font-medium transition-all duration-300 cursor-pointer whitespace-nowrap"
            style={{
              background:
                activeTab === tab.id
                  ? "rgba(61, 214, 181, 0.1)"
                  : "transparent",
              color:
                activeTab === tab.id ? "#3dd6b5" : "rgba(255, 255, 255, 0.4)",
              border:
                activeTab === tab.id
                  ? "1px solid rgba(61, 214, 181, 0.15)"
                  : "1px solid transparent",
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl p-6"
          style={{
            background: "rgba(13, 27, 42, 0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* ── Profile Tab ──────────────────────────────────────── */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Avatar + rank */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
                    style={{
                      background: `linear-gradient(135deg, ${rank.color}15, ${rank.color}08)`,
                      border: `2px solid ${rank.color}30`,
                    }}
                  >
                    {rank.creature}
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{
                      background: rank.color,
                      color: "#0a0f1e",
                      fontWeight: 700,
                    }}
                  >
                    {Math.floor(elo / 100)}
                  </div>
                </div>
                <div>
                  <h3
                    className="font-display text-lg font-bold"
                    style={{ color: "#e8d5b0" }}
                  >
                    {userName || "Diver"}
                  </h3>
                  <p
                    className="font-body text-sm font-medium"
                    style={{ color: rank.color }}
                  >
                    {rank.creature} {rank.name}
                  </p>
                  <p
                    className="font-body text-xs mt-0.5"
                    style={{ color: "#718096" }}
                  >
                    ELO: {elo}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Wins", value: wins, color: "#10B981" },
                  { label: "Losses", value: losses, color: "#f87171" },
                  { label: "Draws", value: draws, color: "#718096" },
                  { label: "Win %", value: `${winRate}%`, color: "#3dd6b5" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="text-center py-3 rounded-xl"
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <p
                      className="font-display text-xl font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="font-body text-[10px] mt-0.5"
                      style={{ color: "#718096" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Rank progression */}
              <div>
                <p
                  className="font-body text-xs mb-3"
                  style={{ color: "#718096" }}
                >
                  Rank Progression
                </p>
                <div className="space-y-2">
                  {RANKS.map((r, i) => {
                    const isActive = r.name === rank.name;
                    const isPast = elo >= r.minElo;
                    return (
                      <div
                        key={r.name}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200"
                        style={{
                          background: isActive ? `${r.color}08` : "transparent",
                          border: isActive
                            ? `1px solid ${r.color}20`
                            : "1px solid transparent",
                          opacity: isPast ? 1 : 0.4,
                        }}
                      >
                        <span className="text-lg">{r.creature}</span>
                        <div className="flex-1">
                          <p
                            className="font-body text-xs font-medium"
                            style={{ color: isPast ? r.color : "#718096" }}
                          >
                            {r.name}
                          </p>
                        </div>
                        <span
                          className="font-body text-[10px]"
                          style={{ color: "#718096" }}
                        >
                          {r.minElo}+
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Preferences Tab ──────────────────────────────────── */}
          {activeTab === "preferences" && (
            <div>
              <SettingRow
                icon={<Volume2 className="w-4 h-4" />}
                label="Sound Effects"
                description="Play sounds for correct/wrong answers"
              >
                <Toggle
                  enabled={soundEnabled}
                  onToggle={() => setSoundEnabled(!soundEnabled)}
                />
              </SettingRow>
              <SettingRow
                icon={<Vibrate className="w-4 h-4" />}
                label="Haptic Feedback"
                description="Vibrate on interactions (mobile)"
              >
                <Toggle
                  enabled={hapticEnabled}
                  onToggle={() => setHapticEnabled(!hapticEnabled)}
                />
              </SettingRow>
              <SettingRow
                icon={<Zap className="w-4 h-4" />}
                label="Auto-play Audio"
                description="Auto-play listening questions"
              >
                <Toggle
                  enabled={autoPlay}
                  onToggle={() => setAutoPlay(!autoPlay)}
                />
              </SettingRow>
              <SettingRow
                icon={<Clock className="w-4 h-4" />}
                label="Default Timer"
                description="Time limit per question"
              >
                <span
                  className="font-body text-xs"
                  style={{ color: "#3dd6b5" }}
                >
                  None
                </span>
              </SettingRow>
            </div>
          )}

          {/* ── Notifications Tab ────────────────────────────────── */}
          {activeTab === "notifications" && (
            <div>
              <SettingRow
                icon={<Zap className="w-4 h-4" />}
                label="New Challenges"
                description="When someone challenges you"
              >
                <Toggle
                  enabled={challengeNotif}
                  onToggle={() => setChallengeNotif(!challengeNotif)}
                />
              </SettingRow>
              <SettingRow
                icon={<Clock className="w-4 h-4" />}
                label="Your Turn"
                description="When it's your turn to play"
              >
                <Toggle
                  enabled={turnNotif}
                  onToggle={() => setTurnNotif(!turnNotif)}
                />
              </SettingRow>
              <SettingRow
                icon={<Trophy className="w-4 h-4" />}
                label="Results"
                description="When a duel is completed"
              >
                <Toggle
                  enabled={resultNotif}
                  onToggle={() => setResultNotif(!resultNotif)}
                />
              </SettingRow>
              <SettingRow
                icon={<Shield className="w-4 h-4" />}
                label="Friend Requests"
                description="When someone adds you as a friend"
              >
                <Toggle
                  enabled={friendRequests}
                  onToggle={() => setFriendRequests(!friendRequests)}
                />
              </SettingRow>
            </div>
          )}

          {/* ── Leaderboard Tab ──────────────────────────────────── */}
          {activeTab === "leaderboard" && (
            <div className="space-y-3">
              <p className="font-body text-xs" style={{ color: "#718096" }}>
                Top players by ELO rating
              </p>

              {/* Placeholder entries */}
              {[
                {
                  rank: 1,
                  name: "OceanMaster",
                  elo: 1850,
                  creature: "🐋",
                  isYou: false,
                },
                {
                  rank: 2,
                  name: "DeepDiver42",
                  elo: 1620,
                  creature: "🦑",
                  isYou: false,
                },
                {
                  rank: 3,
                  name: "ReefRunner",
                  elo: 1480,
                  creature: "🐙",
                  isYou: false,
                },
                {
                  rank: "–",
                  name: userName || "You",
                  elo: elo,
                  creature: rank.creature,
                  isYou: true,
                },
              ].map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{
                    background: entry.isYou
                      ? "rgba(61, 214, 181, 0.06)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: entry.isYou
                      ? "1px solid rgba(61, 214, 181, 0.15)"
                      : "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <span
                    className="font-display text-sm font-bold w-6 text-center"
                    style={{
                      color:
                        entry.rank === 1
                          ? "#F59E0B"
                          : entry.rank === 2
                            ? "#94A3B8"
                            : entry.rank === 3
                              ? "#CD7F32"
                              : "#718096",
                    }}
                  >
                    {entry.rank}
                  </span>
                  <span className="text-lg">{entry.creature}</span>
                  <span
                    className="font-body text-sm font-medium flex-1"
                    style={{
                      color: entry.isYou ? "#3dd6b5" : "#e8d5b0",
                    }}
                  >
                    {entry.name}
                    {entry.isYou && (
                      <span className="text-[10px] ml-1.5 opacity-50">
                        (you)
                      </span>
                    )}
                  </span>
                  <span
                    className="font-body text-xs font-semibold"
                    style={{ color: "#718096" }}
                  >
                    {entry.elo}
                  </span>
                </motion.div>
              ))}

              <p
                className="font-body text-[10px] text-center pt-2"
                style={{ color: "#718096", opacity: 0.6 }}
              >
                Full leaderboard coming soon
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
