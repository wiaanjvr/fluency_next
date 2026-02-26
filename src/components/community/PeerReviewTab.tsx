"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Waves } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useDiveSubmissions,
  useMyDiveSubmissions,
} from "@/hooks/useDiveSubmissions";
import { SubmissionFeed } from "./SubmissionFeed";
import { MyDivesFeed } from "./MyDivesFeed";
import type {
  SubmissionType,
  SubmissionSort,
  PeerReviewSubTab,
} from "@/types/dive-tank";

interface PeerReviewTabProps {
  onSubmitClick: () => void;
}

export function PeerReviewTab({ onSubmitClick }: PeerReviewTabProps) {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<PeerReviewSubTab>("review-others");
  const [filterType, setFilterType] = useState<SubmissionType | "all">("all");
  const [sort, setSort] = useState<SubmissionSort>("newest");

  const {
    submissions,
    loading: feedLoading,
    hasMore,
    loadMore,
  } = useDiveSubmissions({ filterType, sort });

  const {
    submissions: mySubmissions,
    loading: myLoading,
    hasMore: myHasMore,
    loadMore: myLoadMore,
  } = useMyDiveSubmissions(user?.id);

  // Count submissions awaiting review
  const openCount = submissions.filter(
    (s) => (s.review_count ?? 0) === 0,
  ).length;

  return (
    <div>
      {/* Sub-tab bar */}
      <div className="flex gap-1 mb-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] p-1">
        <SubTabButton
          active={subTab === "review-others"}
          onClick={() => setSubTab("review-others")}
          icon={<span className="text-base leading-none">🤿</span>}
          label="Review Others"
          badge={openCount > 0 ? String(openCount) : undefined}
        />
        <SubTabButton
          active={subTab === "my-dives"}
          onClick={() => setSubTab("my-dives")}
          icon={<Waves className="h-4 w-4" />}
          label="My Dives"
          badge={
            mySubmissions.length > 0 ? String(mySubmissions.length) : undefined
          }
        />
      </div>

      {/* Sub-tab content */}
      {subTab === "review-others" ? (
        <SubmissionFeed
          submissions={submissions}
          loading={feedLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          filterType={filterType}
          onFilterChange={(t) => setFilterType(t)}
          sort={sort}
          onSortChange={(s) => setSort(s)}
        />
      ) : (
        <MyDivesFeed
          submissions={mySubmissions}
          loading={myLoading}
          hasMore={myHasMore}
          onLoadMore={myLoadMore}
          onSubmitClick={onSubmitClick}
        />
      )}
    </div>
  );
}

function SubTabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "text-teal-300"
          : "text-seafoam/40 hover:text-seafoam/60 hover:bg-white/[0.02]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="peerReviewSubTab"
          className="absolute inset-0 rounded-xl bg-teal-500/10 border border-teal-500/20"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
      {badge && (
        <span className="relative z-10 inline-flex items-center justify-center rounded-full bg-teal-500/20 text-teal-400 px-1.5 py-0.5 text-[10px] font-bold leading-none min-w-[18px]">
          {badge}
        </span>
      )}
    </button>
  );
}
