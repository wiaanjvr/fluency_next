"use client";

/**
 * ImmerseSelectModal.tsx
 *
 * Centered modal for browsing and selecting immersion streams.
 * Filters by type (All / Radio / Podcast / Video) and difficulty.
 * Shows "Now playing" state on the active stream card.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, Podcast, Youtube, Headphones, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImmerse } from "./ImmerseProvider";
import {
  filterByType,
  filterByDifficulty,
  type ImmerseContentType,
  type ImmerseDifficulty,
  type ImmerseStream,
} from "@/lib/immerse/immerseRegistry";
import { Loader2 } from "lucide-react";

// ── Filter types ─────────────────────────────────────────────────────────────

type TypeFilter = "all" | ImmerseContentType;
type DifficultyFilter = "all" | ImmerseDifficulty;

const TYPE_TABS: { value: TypeFilter; label: string; icon: typeof Radio }[] = [
  { value: "all", label: "All", icon: Waves },
  { value: "radio", label: "Radio", icon: Radio },
  { value: "podcast", label: "Podcast", icon: Podcast },
  { value: "youtube", label: "Video", icon: Youtube },
];

const DIFFICULTY_TABS: { value: DifficultyFilter; label: string }[] = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

// ── Stream card ──────────────────────────────────────────────────────────────

function StreamCard({
  stream,
  isNowPlaying,
  isLastPlayed,
  onSelect,
}: {
  stream: ImmerseStream;
  isNowPlaying: boolean;
  isLastPlayed: boolean;
  onSelect: () => void;
}) {
  const typeColors: Record<ImmerseContentType, string> = {
    radio: "rgba(61, 214, 181, 0.2)",
    podcast: "rgba(100, 149, 237, 0.2)",
    youtube: "rgba(220, 80, 80, 0.2)",
  };
  const TypeIcon = { radio: Radio, podcast: Podcast, youtube: Youtube }[
    stream.type
  ];
  const diffColors: Record<ImmerseDifficulty, string> = {
    beginner: "rgba(61,214,181,0.15)",
    intermediate: "rgba(42,100,160,0.2)",
    advanced: "rgba(180,80,80,0.2)",
  };

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={cn(
        "relative w-full text-left rounded-xl p-3 transition-all group",
        isNowPlaying && "ring-1 ring-teal-500/30",
      )}
      style={{
        background: isNowPlaying
          ? "rgba(13, 148, 136, 0.08)"
          : "rgba(255, 255, 255, 0.02)",
        border: `1px solid ${
          isNowPlaying
            ? "rgba(13, 148, 136, 0.2)"
            : isLastPlayed
              ? "rgba(13, 148, 136, 0.1)"
              : "rgba(255,255,255,0.04)"
        }`,
      }}
    >
      {/* Now playing indicator */}
      {isNowPlaying && (
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(13, 148, 136, 0.2)",
            border: "1px solid rgba(13, 148, 136, 0.3)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
          </span>
          <span
            className="text-[9px] font-medium"
            style={{
              color: "var(--teal, #0D9488)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            PLAYING
          </span>
        </div>
      )}

      {/* Last played indicator */}
      {isLastPlayed && !isNowPlaying && (
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span
            className="text-[9px] font-medium"
            style={{
              color: "var(--text-muted, #2E5C54)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            }}
          >
            LAST PLAYED
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Thumbnail */}
        <div
          className="w-16 h-16 rounded-lg shrink-0 bg-cover bg-center transition-transform group-hover:scale-[1.03]"
          style={{
            backgroundImage: `url(${stream.thumbnailUrl})`,
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5">
          <h3
            className="text-sm font-medium truncate pr-16"
            style={{
              color: "var(--text-primary, #F0FDFA)",
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            }}
          >
            {stream.title}
          </h3>
          <p
            className="text-xs mt-1 line-clamp-2"
            style={{ color: "var(--text-secondary, #7BA8A0)" }}
          >
            {stream.description}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            {/* Type badge */}
            <span
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: typeColors[stream.type],
                color: "var(--text-secondary, #7BA8A0)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              }}
            >
              <TypeIcon className="w-3 h-3" />
              {stream.type === "youtube"
                ? "Video"
                : stream.type.charAt(0).toUpperCase() + stream.type.slice(1)}
            </span>
            {/* Difficulty badge */}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
              style={{
                background: diffColors[stream.difficulty],
                color: "var(--text-secondary, #7BA8A0)",
                border: "1px solid rgba(255,255,255,0.06)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              }}
            >
              {stream.difficulty}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main modal
// ═══════════════════════════════════════════════════════════════════════════════

export function ImmerseSelectModal() {
  const {
    isSelectModalOpen,
    closeSelectModal,
    currentStream,
    lastPlayedId,
    playStream,
    isPlaying,
    streams,
    isLoadingStreams,
  } = useImmerse();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>("all");

  const filtered = filterByDifficulty(
    filterByType(streams, typeFilter),
    diffFilter,
  );

  const handleSelect = (stream: ImmerseStream) => {
    playStream(stream);
    closeSelectModal();
  };

  return (
    <AnimatePresence>
      {isSelectModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="immerse-modal-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={closeSelectModal}
          />

          {/* Modal */}
          <motion.div
            key="immerse-modal"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-[61] inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[6%] sm:top-[5%] w-auto sm:w-full sm:max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #041E2B 0%, #020F14 100%)",
              border: "1px solid rgba(13, 148, 136, 0.12)",
              boxShadow:
                "0 0 60px rgba(13, 148, 136, 0.06), 0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(13, 148, 136, 0.12)" }}
                >
                  <Headphones
                    className="w-4 h-4"
                    style={{ color: "var(--teal, #0D9488)" }}
                  />
                </div>
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{
                      color: "var(--text-primary, #F0FDFA)",
                      fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    }}
                  >
                    Choose your immersion stream
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted, #2E5C54)" }}
                  >
                    Listen while you navigate — playback persists across pages
                  </p>
                </div>
              </div>
              <button
                onClick={closeSelectModal}
                className="p-2 rounded-lg transition-colors hover:bg-white/5"
                aria-label="Close"
              >
                <X
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted, #2E5C54)" }}
                />
              </button>
            </div>

            {/* Filters */}
            <div className="px-5 pb-3 space-y-3">
              {/* Type filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {TYPE_TABS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTypeFilter(value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    )}
                    style={{
                      background:
                        typeFilter === value
                          ? "rgba(13, 148, 136, 0.15)"
                          : "rgba(255,255,255,0.03)",
                      color:
                        typeFilter === value
                          ? "var(--teal, #0D9488)"
                          : "var(--text-muted, #2E5C54)",
                      border: `1px solid ${
                        typeFilter === value
                          ? "rgba(13, 148, 136, 0.25)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                      fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Difficulty filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {DIFFICULTY_TABS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setDiffFilter(value)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                    style={{
                      background:
                        diffFilter === value
                          ? "rgba(13, 148, 136, 0.12)"
                          : "transparent",
                      color:
                        diffFilter === value
                          ? "var(--text-secondary, #7BA8A0)"
                          : "var(--text-muted, #2E5C54)",
                      border: `1px solid ${
                        diffFilter === value
                          ? "rgba(13, 148, 136, 0.2)"
                          : "rgba(255,255,255,0.04)"
                      }`,
                      fontFamily:
                        "var(--font-mono, 'JetBrains Mono', monospace)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stream grid */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">
              {isLoadingStreams ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="w-6 h-6 animate-spin"
                    style={{ color: "var(--teal, #0D9488)" }}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((stream) => (
                      <StreamCard
                        key={stream.id}
                        stream={stream}
                        isNowPlaying={
                          isPlaying && currentStream?.id === stream.id
                        }
                        isLastPlayed={lastPlayedId === stream.id}
                        onSelect={() => handleSelect(stream)}
                      />
                    ))}
                  </AnimatePresence>

                  {filtered.length === 0 && (
                    <div className="text-center py-12">
                      <p
                        className="text-sm"
                        style={{ color: "var(--text-muted, #2E5C54)" }}
                      >
                        No streams match your filters
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
