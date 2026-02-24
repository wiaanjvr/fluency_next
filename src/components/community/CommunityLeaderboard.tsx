"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Zap, Users, BookOpen, Waves, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers – deterministic ocean identity for reviewers
// ---------------------------------------------------------------------------

const OCEAN_CREATURES = [
  "🐠",
  "🐙",
  "🦈",
  "🐡",
  "🦑",
  "🐟",
  "🦀",
  "🦐",
  "🐬",
  "🐳",
];

const DIVE_NAMES = [
  "CoralDiver",
  "AbyssExplorer",
  "TideRider",
  "DeepDiver",
  "ReefGuard",
  "WaveCrafter",
  "PearlSeeker",
  "KelpWriter",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getOceanCreature(userId: string): string {
  return OCEAN_CREATURES[hashId(userId) % OCEAN_CREATURES.length];
}

export function getOceanDisplayName(
  userId: string,
  fullName?: string | null,
): string {
  if (fullName) return fullName;
  const h = hashId(userId);
  const name = DIVE_NAMES[h % DIVE_NAMES.length];
  const suffix = ((h >> 4) % 90) + 10; // always 2-digit
  return `${name}_${suffix}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderEntry {
  reviewer_id: string;
  review_count: number;
  full_name: string | null;
  avatar_url: string | null;
}

interface CommunityStats {
  openSubmissions: number;
  reviewsToday: number;
  activeReviewers: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CommunityLeaderboardProps {
  className?: string;
  /** Current user's total XP from community_xp_log (optional) */
  myDepthPoints?: number;
}

export function CommunityLeaderboard({
  className,
  myDepthPoints,
}: CommunityLeaderboardProps) {
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [stats, setStats] = useState<CommunityStats>({
    openSubmissions: 0,
    reviewsToday: 0,
    activeReviewers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // Fetch leaderboard: top 5 reviewers this week
      const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const { data: reviews } = await supabase
        .from("community_reviews")
        .select("reviewer_id, profiles:reviewer_id(full_name, avatar_url)")
        .gte("created_at", weekAgo);

      if (reviews) {
        // Aggregate counts per reviewer
        const counts: Record<string, LeaderEntry> = {};
        for (const r of reviews) {
          const profileData = r.profiles as unknown as
            | { full_name: string | null; avatar_url: string | null }
            | { full_name: string | null; avatar_url: string | null }[]
            | null;
          const p = Array.isArray(profileData) ? profileData[0] : profileData;
          if (!counts[r.reviewer_id]) {
            counts[r.reviewer_id] = {
              reviewer_id: r.reviewer_id,
              review_count: 0,
              full_name: p?.full_name ?? null,
              avatar_url: p?.avatar_url ?? null,
            };
          }
          counts[r.reviewer_id].review_count++;
        }
        const sorted = Object.values(counts)
          .sort((a, b) => b.review_count - a.review_count)
          .slice(0, 5);
        setLeaders(sorted);
      }

      // Stats: open submissions
      const { count: openCount } = await supabase
        .from("community_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      // Reviews today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from("community_reviews")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString());

      // Active reviewers (past 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: activeReviews } = await supabase
        .from("community_reviews")
        .select("reviewer_id")
        .gte("created_at", dayAgo);

      const uniqueReviewers = new Set(
        activeReviews?.map((r) => r.reviewer_id) ?? [],
      );

      setStats({
        openSubmissions: openCount ?? 0,
        reviewsToday: todayCount ?? 0,
        activeReviewers: uniqueReviewers.size,
      });

      setLoading(false);
    }

    fetchData().catch(() => setLoading(false));
  }, []);

  const medalColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Community Health Stats ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/50 mb-3 flex items-center gap-2">
          <Waves className="h-3.5 w-3.5" />
          The Dive Tank — Live
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            value={loading ? "—" : String(stats.activeReviewers)}
            label="Divers Active"
            icon={<Users className="h-3.5 w-3.5" />}
            glow="teal"
          />
          <StatCard
            value={loading ? "—" : String(stats.reviewsToday)}
            label="Reviews Today"
            icon={<Star className="h-3.5 w-3.5" />}
            glow="purple"
          />
          <StatCard
            value={loading ? "—" : String(stats.openSubmissions)}
            label="Awaiting Dive"
            icon={<BookOpen className="h-3.5 w-3.5" />}
            glow="amber"
          />
        </div>
        {myDepthPoints !== undefined && (
          <div className="mt-3 rounded-xl bg-ocean-turquoise/[0.06] border border-ocean-turquoise/15 px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-ocean-turquoise" />
              <span className="text-xs text-seafoam/70">Your Depth Points</span>
            </div>
            <span className="text-sm font-semibold text-ocean-turquoise">
              {myDepthPoints} dp
            </span>
          </div>
        )}
      </div>

      {/* ── Top Reviewers Leaderboard ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-seafoam/50 mb-3 flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5" />
          Top Dive Buddies · This Week
        </h3>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <div className="h-7 w-7 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 flex-1 rounded-full bg-white/5 animate-pulse" />
                <div className="h-3 w-10 rounded-full bg-white/5 animate-pulse" />
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-xs text-seafoam/30">
              Be the first to review — claim the top spot!
            </p>
          </div>
        ) : (
          <ol className="space-y-1">
            {leaders.map((entry, i) => {
              const creature = getOceanCreature(entry.reviewer_id);
              const name = getOceanDisplayName(
                entry.reviewer_id,
                entry.full_name,
              );
              return (
                <li
                  key={entry.reviewer_id}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/[0.03] transition-colors"
                >
                  <span
                    className={cn(
                      "text-xs font-bold w-4 text-center shrink-0",
                      i < 3 ? medalColors[i] : "text-seafoam/30",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-base shrink-0">{creature}</span>
                  <span className="text-xs text-sand/80 truncate flex-1">
                    {name}
                  </span>
                  <span className="text-xs tabular-nums font-semibold text-ocean-turquoise/70 shrink-0">
                    {entry.review_count * 5}dp
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {/* CTA to become a reviewer */}
        {!loading && leaders.length > 0 && (
          <p className="mt-3 text-center text-xs text-seafoam/30">
            Review a submission to climb the ranks ↑
          </p>
        )}
      </div>

      {/* ── How Fluensea Peer Review Works ── */}
      <div className="rounded-2xl border border-ocean-turquoise/10 bg-ocean-turquoise/[0.04] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ocean-turquoise/60 mb-3 flex items-center gap-2">
          🤿 How the Depth Works
        </h3>
        <div className="space-y-2.5">
          {[
            { step: "1", text: "Submit an exercise from your lessons" },
            { step: "2", text: "Dive Buddies give structured corrections" },
            { step: "3", text: "Earn +5 Depth Points per review you write" },
            { step: "4", text: "Deeper feedback unlocks higher ranks" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ocean-turquoise/15 text-[9px] font-bold text-ocean-turquoise">
                {step}
              </span>
              <p className="text-xs text-seafoam/60 leading-snug">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-ocean-turquoise/[0.08] px-3 py-2">
          <p className="text-[11px] text-seafoam/50 italic">
            Unlike Discord, Fluensea gives your corrections pedagogical
            structure — inline fixes, rated by learners, tied to their depth
            progression.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

function StatCard({
  value,
  label,
  icon,
  glow,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  glow: "teal" | "purple" | "amber";
}) {
  const glowColors = {
    teal: "text-ocean-turquoise",
    purple: "text-purple-400",
    amber: "text-amber-400",
  };

  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-2.5 text-center">
      <div
        className={cn(
          "flex items-center justify-center mb-1",
          glowColors[glow],
          "opacity-60",
        )}
      >
        {icon}
      </div>
      <p
        className={cn(
          "text-base font-semibold tabular-nums leading-none mb-1",
          glowColors[glow],
        )}
      >
        {value}
      </p>
      <p className="text-[10px] text-seafoam/40 leading-tight">{label}</p>
    </div>
  );
}
