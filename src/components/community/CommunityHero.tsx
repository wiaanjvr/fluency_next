"use client";

import { motion } from "framer-motion";
import {
  Plus,
  Users,
  Star,
  Bookmark,
  MessageSquare,
  Mic,
  BookOpen,
  Radio,
  Mail,
} from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import type { CommunityTab } from "@/types/dive-tank";

const TABS: { id: CommunityTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "peer-review",
    label: "Peer Review",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: "speaking-lab",
    label: "Speaking Lab",
    icon: <Mic className="h-4 w-4" />,
  },
  {
    id: "dive-logs",
    label: "Dive Logs",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: "dispatch",
    label: "Dispatch",
    icon: <Radio className="h-4 w-4" />,
  },
  {
    id: "messages",
    label: "Messages",
    icon: <Mail className="h-4 w-4" />,
  },
];

interface CommunityHeroProps {
  activeTab: CommunityTab;
  onTabChange: (tab: CommunityTab) => void;
  onSubmitClick: () => void;
}

export function CommunityHero({
  activeTab,
  onTabChange,
  onSubmitClick,
}: CommunityHeroProps) {
  const { stats } = useCommunityStats();
  const diversActive = useCountUp(stats.divers_active);
  const reviewsToday = useCountUp(stats.reviews_today);
  const awaitingDive = useCountUp(stats.awaiting_dive);

  return (
    <div className="mb-6">
      {/* Hero banner */}
      <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 sm:p-8 overflow-hidden mb-5">
        {/* Animated light rays background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-[1px] opacity-[0.06]"
              style={{
                left: `${25 + i * 25}%`,
                background:
                  "linear-gradient(180deg, rgba(61,214,181,0.8) 0%, transparent 60%)",
                transform: `rotate(${-5 + i * 5}deg)`,
                transformOrigin: "top center",
                animation: `heroRay ${10 + i * 3}s ease-in-out infinite alternate`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start justify-between gap-6">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-900/40 border border-teal-500/20 flex items-center justify-center">
                <span className="text-xl">🤿</span>
              </div>
              <div>
                <h1 className="text-2xl font-display font-semibold text-sand leading-tight">
                  The Dive Tank
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 text-[11px] text-teal-300 font-medium">
                    🇩🇪 DE German Community · peer review
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-seafoam/30 max-w-md leading-relaxed mt-2 hidden sm:block">
              Structured correction from real learners. Not Discord — depth
              progression, pedagogical feedback, built into your lessons.
            </p>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <button
              onClick={onSubmitClick}
              className="flex items-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-2.5 text-sm font-semibold hover:brightness-110 active:brightness-95 transition-all shadow-[0_0_20px_rgba(61,214,181,0.25)]"
            >
              <Plus className="h-4 w-4" />
              Submit for Review
            </button>

            {/* Live stats row */}
            <div className="flex items-center gap-4">
              <HeroStat
                icon={<Users className="h-3.5 w-3.5" />}
                value={diversActive}
                label="Divers Active"
                color="text-teal-400"
              />
              <HeroStat
                icon={<Star className="h-3.5 w-3.5" />}
                value={reviewsToday}
                label="Reviews Today"
                color="text-purple-400"
              />
              <HeroStat
                icon={<Bookmark className="h-3.5 w-3.5" />}
                value={awaitingDive}
                label="Awaiting Dive"
                color="text-amber-400"
              />
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes heroRay {
            0% {
              transform: rotate(-8deg) translateX(-10px);
              opacity: 0.03;
            }
            50% {
              opacity: 0.07;
            }
            100% {
              transform: rotate(8deg) translateX(10px);
              opacity: 0.03;
            }
          }
        `}</style>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "text-teal-300"
                : "text-seafoam/40 hover:text-seafoam/60 hover:bg-white/[0.02]"
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-xl bg-teal-500/10 border border-teal-500/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.icon}</span>
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={color}>{icon}</span>
      <span className={`text-sm font-semibold tabular-nums ${color}`}>
        {value}
      </span>
      <span className="text-[10px] text-seafoam/30 hidden sm:inline">
        {label}
      </span>
    </div>
  );
}
