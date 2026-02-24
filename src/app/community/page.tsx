"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import {
  SubmissionCard,
  langFlag,
} from "@/components/community/SubmissionCard";
import { SubmissionModal } from "@/components/community/SubmissionModal";
import { SubmitExerciseModal } from "@/components/community/SubmitExerciseModal";
import { CommunityLeaderboard } from "@/components/community/CommunityLeaderboard";
import { useCommunityStore } from "@/lib/store/communityStore";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { Plus, Anchor, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/styles/ocean-theme.css";

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  en: "English",
};

type Tab = "review-others" | "my-dives";

export default function CommunityPage() {
  const { user } = useAuth();
  const {
    submissions,
    mySubmissions,
    mySubmissionsLoading,
    mySubmissionsHasMore,
    fetchMySubmissions,
    loadMoreMySubmissions,
  } = useCommunityStore();

  const [activeTab, setActiveTab] = useState<Tab>("review-others");
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    string | null
  >(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>("fr");

  // Load user's target language and submissions
  useEffect(() => {
    if (user?.id) {
      fetchMySubmissions(user.id);
      const supabase = createClient();
      supabase
        .from("profiles")
        .select("target_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.target_language) setTargetLanguage(data.target_language);
        });
    }
  }, [user?.id, fetchMySubmissions]);

  // Count of open submissions awaiting review (shows on Review tab)
  const openCount = submissions.filter((s) => s.status === "open").length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--midnight)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* ── Page Header ── */}
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                {/* Depth gauge icon */}
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-ocean-turquoise/20 to-teal-900/40 border border-ocean-turquoise/20 flex items-center justify-center">
                  <span className="text-xl">🤿</span>
                </div>
                <div>
                  <h1 className="text-2xl font-display font-semibold text-sand leading-tight">
                    The Dive Tank
                  </h1>
                  <p className="text-sm text-seafoam/50 flex items-center gap-1.5 mt-0.5">
                    {langFlag(targetLanguage)}
                    <span>
                      {LANGUAGE_NAMES[targetLanguage] ?? targetLanguage}{" "}
                      Community
                    </span>
                    <span className="h-1 w-1 rounded-full bg-seafoam/20" />
                    <span className="text-ocean-turquoise/60 text-xs font-medium">
                      peer review
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-seafoam/30 max-w-sm leading-relaxed hidden sm:block">
                Structured correction from real learners. Not Discord — depth
                progression, pedagogical feedback, built into your lessons.
              </p>
            </div>

            {/* Primary CTA — full teal, not ghost */}
            <button
              onClick={() => setSubmitModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-5 py-2.5 text-sm font-semibold hover:brightness-110 active:brightness-95 transition-all shadow-[0_0_20px_rgba(61,214,181,0.25)] shrink-0"
            >
              <Plus className="h-4 w-4" />
              Submit for Review
            </button>
          </div>

          {/* ── Main Two-Column Layout ── */}
          <div className="flex gap-6 items-start">
            {/* ── Left: Feed + Tab System ── */}
            <div className="flex-1 min-w-0">
              {/* Tab Bar — dramatic differentiation */}
              <div className="flex gap-1 mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-1">
                <TabButton
                  active={activeTab === "review-others"}
                  onClick={() => setActiveTab("review-others")}
                  icon={<span className="text-base leading-none">🤿</span>}
                  label="Review Others"
                  description="Give depth — help fellow learners"
                  badge={openCount > 0 ? String(openCount) : undefined}
                  activeStyle="bg-ocean-turquoise/[0.12] border-ocean-turquoise/25 text-ocean-turquoise"
                />
                <TabButton
                  active={activeTab === "my-dives"}
                  onClick={() => setActiveTab("my-dives")}
                  icon={<Waves className="h-4 w-4" />}
                  label="My Dives"
                  description="Track your submitted work"
                  badge={
                    mySubmissions.length > 0
                      ? String(mySubmissions.length)
                      : undefined
                  }
                  activeStyle="bg-amber-500/[0.10] border-amber-500/20 text-amber-300"
                />
              </div>

              {/* Tab Content */}
              {activeTab === "review-others" && <CommunityFeed />}

              {activeTab === "my-dives" && (
                <MyDivesPanel
                  mySubmissions={mySubmissions}
                  mySubmissionsLoading={mySubmissionsLoading}
                  mySubmissionsHasMore={mySubmissionsHasMore}
                  userId={user?.id}
                  loadMore={loadMoreMySubmissions}
                  onSubmitClick={() => setSubmitModalOpen(true)}
                  onCardClick={(id) => {
                    setSelectedSubmissionId(id);
                    setDetailModalOpen(true);
                  }}
                />
              )}
            </div>

            {/* ── Right: Sidebar ── */}
            <aside className="w-72 xl:w-80 shrink-0 hidden lg:block">
              <CommunityLeaderboard />
            </aside>
          </div>
        </div>

        {/* Submit Exercise Modal */}
        <SubmitExerciseModal
          open={submitModalOpen}
          onOpenChange={setSubmitModalOpen}
        />

        {/* Submission Detail Modal (for My Dives tab) */}
        <SubmissionModal
          submissionId={selectedSubmissionId}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      </div>
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Tab button sub-component
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  icon,
  label,
  description,
  badge,
  activeStyle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  activeStyle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
        active
          ? activeStyle
          : "border-transparent text-seafoam/50 hover:bg-white/[0.03] hover:text-seafoam/70",
      )}
    >
      <span className={cn("shrink-0", active ? "" : "opacity-50")}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold leading-tight">{label}</span>
          {badge && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px]",
                active
                  ? "bg-current/20 text-current"
                  : "bg-white/10 text-seafoam/60",
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          className={cn(
            "text-[11px] leading-tight mt-0.5",
            active ? "opacity-60" : "opacity-40",
          )}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// My Dives panel
// ---------------------------------------------------------------------------

function MyDivesPanel({
  mySubmissions,
  mySubmissionsLoading,
  mySubmissionsHasMore,
  userId,
  loadMore,
  onSubmitClick,
  onCardClick,
}: {
  mySubmissions: ReturnType<typeof useCommunityStore.getState>["mySubmissions"];
  mySubmissionsLoading: boolean;
  mySubmissionsHasMore: boolean;
  userId?: string;
  loadMore: (userId: string) => Promise<void>;
  onSubmitClick: () => void;
  onCardClick: (id: string) => void;
}) {
  if (mySubmissionsLoading && mySubmissions.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5"
          >
            <div className="flex items-center gap-3 mb-3.5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 mb-1.5" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (mySubmissions.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-10 text-center">
        <span className="text-4xl block mb-4">🌊</span>
        <h3 className="text-lg font-display font-semibold text-sand/80 mb-2">
          No dives yet
        </h3>
        <p className="text-sm text-seafoam/40 max-w-sm mx-auto mb-6 leading-relaxed">
          Submit a writing, speaking, or translation exercise and dive buddies
          will give you structured corrections — tied to your depth progression.
        </p>
        <button
          onClick={onSubmitClick}
          className="rounded-2xl bg-[var(--turquoise)] text-[var(--midnight)] px-6 py-2.5 text-sm font-semibold hover:brightness-110 transition-all shadow-[0_0_16px_rgba(61,214,181,0.2)]"
        >
          <Anchor className="inline h-4 w-4 mr-2 -mt-0.5" />
          Make your first dive
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mySubmissions.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onClick={() => onCardClick(submission.id)}
          />
        ))}
      </div>

      {mySubmissionsHasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => userId && loadMore(userId)}
            disabled={mySubmissionsLoading}
            className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
          >
            {mySubmissionsLoading ? "Loading…" : "Load more dives"}
          </button>
        </div>
      )}
    </>
  );
}
