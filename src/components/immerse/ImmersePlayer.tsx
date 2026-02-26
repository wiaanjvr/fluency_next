"use client";

/**
 * ImmersePlayer.tsx
 *
 * Persistent floating mini-player — like Spotify's bottom bar.
 * - Mini-player: 72px fixed at bottom, slides up with Framer Motion
 * - Expanded: centered modal with YouTube iframe / audio visualizer
 * - YouTube IFrame and <audio> persist across navigation (never unmount)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Radio,
  Podcast,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useImmerse } from "./ImmerseProvider";
import type { YTPlayerInstance } from "./ImmerseProvider";
import type {
  ImmerseContentType,
  ImmerseStream,
  ImmerseDifficulty,
} from "@/lib/immerse/immerseRegistry";
import {
  IMMERSE_STREAMS,
  filterByType,
  filterByDifficulty,
} from "@/lib/immerse/immerseRegistry";

// ── YouTube IFrame API loader ────────────────────────────────────────────────

let ytApiLoaded = false;

function loadYouTubeAPI(): Promise<void> {
  if (ytApiLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    if (typeof window === "undefined") return;
    if ((window as unknown as Record<string, unknown>).YT) {
      ytApiLoaded = true;
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
    (window as unknown as Record<string, () => void>).onYouTubeIframeAPIReady =
      () => {
        ytApiLoaded = true;
        resolve();
      };
  });
}

// ── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: ImmerseContentType }) {
  const config: Record<
    ImmerseContentType,
    { icon: typeof Radio; label: string; color: string }
  > = {
    radio: { icon: Radio, label: "Radio", color: "rgba(61, 214, 181, 0.2)" },
    podcast: {
      icon: Podcast,
      label: "Podcast",
      color: "rgba(100, 149, 237, 0.2)",
    },
    youtube: {
      icon: Youtube,
      label: "Video",
      color: "rgba(220, 80, 80, 0.2)",
    },
  };
  const { icon: Icon, label, color } = config[type];
  return (
    <span
      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
      style={{
        background: color,
        color: "var(--text-secondary, #7BA8A0)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Difficulty badge ─────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: ImmerseDifficulty }) {
  const colors: Record<ImmerseDifficulty, string> = {
    beginner: "rgba(61,214,181,0.15)",
    intermediate: "rgba(42,100,160,0.2)",
    advanced: "rgba(180,80,80,0.2)",
  };
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize shrink-0"
      style={{
        background: colors[level],
        color: "var(--text-secondary, #7BA8A0)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
      }}
    >
      {level}
    </span>
  );
}

// ── Audio visualizer bars ────────────────────────────────────────────────────

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[3px] h-8" aria-hidden>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: "var(--teal, #0D9488)" }}
          animate={
            isPlaying
              ? {
                  height: [
                    8,
                    20 + Math.random() * 12,
                    6,
                    16 + Math.random() * 16,
                    8,
                  ],
                }
              : { height: 6 }
          }
          transition={
            isPlaying
              ? {
                  duration: 0.8 + Math.random() * 0.6,
                  repeat: Infinity,
                  repeatType: "mirror",
                  delay: i * 0.05,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ── Volume slider ────────────────────────────────────────────────────────────

function VolumeSlider({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (v: number) => void;
}) {
  const [muted, setMuted] = useState(false);
  const prevVolume = useRef(volume);

  const toggleMute = () => {
    if (muted) {
      onChange(prevVolume.current || 0.5);
      setMuted(false);
    } else {
      prevVolume.current = volume;
      onChange(0);
      setMuted(true);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="p-1 rounded-md transition-colors hover:bg-white/5"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {volume === 0 || muted ? (
          <VolumeX
            className="w-4 h-4"
            style={{ color: "var(--text-muted, #2E5C54)" }}
          />
        ) : (
          <Volume2
            className="w-4 h-4"
            style={{ color: "var(--text-secondary, #7BA8A0)" }}
          />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => {
          onChange(parseFloat(e.target.value));
          setMuted(false);
        }}
        aria-label="Volume"
        className="immerse-volume-slider"
        style={{ width: 80 }}
      />
    </div>
  );
}

// ── Related streams sidebar ──────────────────────────────────────────────────

function RelatedStreams({
  current,
  onSelect,
}: {
  current: ImmerseStream;
  onSelect: (s: ImmerseStream) => void;
}) {
  const related = IMMERSE_STREAMS.filter((s) => s.id !== current.id).slice(
    0,
    4,
  );
  return (
    <div className="space-y-2">
      <h4
        className="text-xs font-medium uppercase tracking-wider"
        style={{
          color: "var(--text-muted, #2E5C54)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        }}
      >
        Up next
      </h4>
      {related.map((stream) => (
        <button
          key={stream.id}
          onClick={() => onSelect(stream)}
          className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-white/5 text-left"
        >
          <div
            className="w-10 h-10 rounded-md shrink-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${stream.thumbnailUrl})`,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium truncate"
              style={{ color: "var(--text-primary, #F0FDFA)" }}
            >
              {stream.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TypeBadge type={stream.type} />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main ImmersePlayer component
// ═══════════════════════════════════════════════════════════════════════════════

export function ImmersePlayer() {
  const {
    currentStream,
    isPlaying,
    isMinimized,
    isOpen,
    volume,
    playStream,
    togglePlay,
    minimize,
    expand,
    close,
    setVolume,
    audioRef,
    ytPlayerRef,
    setPlayerReady,
  } = useImmerse();

  const ytContainerRef = useRef<HTMLDivElement>(null);
  const ytInitialized = useRef(false);
  const currentVideoIdRef = useRef<string | null>(null);

  // ── Initialize YouTube player when a YT stream is selected ─────────────
  useEffect(() => {
    if (!currentStream || currentStream.type !== "youtube") return;
    if (!currentStream.youtubeVideoId) return;

    // Same video — just play/pause
    if (
      currentVideoIdRef.current === currentStream.youtubeVideoId &&
      ytPlayerRef.current
    ) {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      }
      return;
    }

    currentVideoIdRef.current = currentStream.youtubeVideoId;
    const videoId = currentStream.youtubeVideoId;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      const YT = (
        window as unknown as {
          YT: {
            Player: new (
              el: HTMLElement,
              opts: Record<string, unknown>,
            ) => YTPlayerInstance;
            PlayerState: Record<string, number>;
          };
        }
      ).YT;

      // Destroy old player if exists
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // noop
        }
      }

      if (!ytContainerRef.current) return;

      // Clear container
      ytContainerRef.current.innerHTML = "";
      const playerDiv = document.createElement("div");
      playerDiv.id = "immerse-yt-player";
      ytContainerRef.current.appendChild(playerDiv);

      ytPlayerRef.current = new YT.Player(playerDiv, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: { target: YTPlayerInstance }) => {
            event.target.setVolume(volume * 100);
            setPlayerReady(true);
            if (isPlaying) event.target.playVideo();
          },
          onStateChange: () => {
            // Could sync state here if needed
          },
        },
      } as Record<string, unknown>) as unknown as YTPlayerInstance;

      ytInitialized.current = true;
    };

    initPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStream?.youtubeVideoId, currentStream?.type]);

  // Sync play/pause to YouTube player
  useEffect(() => {
    if (currentStream?.type !== "youtube" || !ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    } catch {
      // player not ready
    }
  }, [isPlaying, currentStream?.type, ytPlayerRef]);

  // ── Marquee for long titles ────────────────────────────────────────────────
  const titleRef = useRef<HTMLDivElement>(null);
  const [needsMarquee, setNeedsMarquee] = useState(false);
  useEffect(() => {
    if (!titleRef.current) return;
    setNeedsMarquee(
      titleRef.current.scrollWidth > titleRef.current.clientWidth,
    );
  }, [currentStream?.title]);

  if (!currentStream) return null;

  return (
    <>
      {/* ── Persistent YouTube container — always in DOM ──────────────────── */}
      <div
        ref={ytContainerRef}
        className={cn(
          "fixed transition-all duration-300 z-[51]",
          isOpen && !isMinimized && currentStream.type === "youtube"
            ? "w-full max-w-2xl aspect-video rounded-xl overflow-hidden left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            : "w-0 h-0 overflow-hidden pointer-events-none opacity-0",
        )}
        style={{
          // Keep in DOM but hidden when minimized
          position: "fixed",
        }}
      />

      <AnimatePresence>
        {isOpen && (
          <>
            {/* ── Expanded overlay ─────────────────────────────────────────── */}
            {!isMinimized && (
              <motion.div
                key="immerse-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[49] bg-black/60 backdrop-blur-sm"
                onClick={minimize}
              />
            )}

            {/* ── Expanded panel ───────────────────────────────────────────── */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  key="immerse-expanded"
                  initial={{ opacity: 0, scale: 0.95, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 40 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-[10%] sm:top-[8%] z-[52] w-auto sm:w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(180deg, #041E2B 0%, #020F14 100%)",
                    border: "1px solid rgba(13, 148, 136, 0.15)",
                    boxShadow:
                      "0 0 60px rgba(13, 148, 136, 0.08), 0 25px 50px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-5 pb-0">
                    <div className="flex items-center gap-3">
                      <TypeBadge type={currentStream.type} />
                      <DifficultyBadge level={currentStream.difficulty} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={minimize}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        aria-label="Minimize"
                      >
                        <Minimize2
                          className="w-4 h-4"
                          style={{ color: "var(--text-secondary, #7BA8A0)" }}
                        />
                      </button>
                      <button
                        onClick={close}
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        aria-label="Close player"
                      >
                        <X
                          className="w-4 h-4"
                          style={{ color: "var(--text-muted, #2E5C54)" }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Player area */}
                  <div className="p-5 space-y-5">
                    {/* Audio visualizer for non-YouTube */}
                    {currentStream.type !== "youtube" && (
                      <div
                        className="flex flex-col items-center justify-center gap-4 py-8 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div
                          className="w-24 h-24 rounded-xl bg-cover bg-center"
                          style={{
                            backgroundImage: `url(${currentStream.thumbnailUrl})`,
                            backgroundColor: "rgba(255,255,255,0.05)",
                          }}
                        />
                        <AudioVisualizer isPlaying={isPlaying} />
                      </div>
                    )}

                    {/* YouTube space — the actual player is in the persistent container above */}
                    {currentStream.type === "youtube" && (
                      <div className="aspect-video rounded-xl bg-black/30" />
                    )}

                    {/* Stream info */}
                    <div className="space-y-2">
                      <h2
                        className="text-lg font-semibold"
                        style={{
                          color: "var(--text-primary, #F0FDFA)",
                          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        }}
                      >
                        {currentStream.title}
                      </h2>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-secondary, #7BA8A0)" }}
                      >
                        {currentStream.description}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className="text-xs"
                          style={{
                            color: "var(--text-muted, #2E5C54)",
                            fontFamily:
                              "var(--font-mono, 'JetBrains Mono', monospace)",
                          }}
                        >
                          {currentStream.language_code.toUpperCase()}
                        </span>
                        {currentStream.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              background: "rgba(255,255,255,0.04)",
                              color: "var(--text-muted, #2E5C54)",
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <VolumeSlider volume={volume} onChange={setVolume} />
                      <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
                        style={{
                          background: "var(--teal, #0D9488)",
                          boxShadow: "0 0 20px rgba(13, 148, 136, 0.3)",
                        }}
                        aria-label={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                      <div style={{ width: 120 }} />{" "}
                      {/* Spacer for centering */}
                    </div>

                    {/* Related streams */}
                    <div className="pt-3 border-t border-white/5">
                      <RelatedStreams
                        current={currentStream}
                        onSelect={playStream}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Mini-player bar ──────────────────────────────────────────── */}
            <motion.div
              key="immerse-mini"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50",
                "lg:left-[240px]", // offset for sidebar
              )}
              style={{
                height: 72,
                background:
                  "linear-gradient(180deg, rgba(3, 20, 30, 0.98) 0%, rgba(2, 15, 20, 0.99) 100%)",
                borderTop: "1px solid rgba(13, 148, 136, 0.15)",
                boxShadow: "0 -4px 30px rgba(13, 148, 136, 0.06)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="h-full px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
                {/* Left: Thumbnail + Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial sm:w-[260px]">
                  <div
                    className="w-12 h-12 sm:w-11 sm:h-11 rounded-lg shrink-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${currentStream.thumbnailUrl})`,
                      backgroundColor: "rgba(255,255,255,0.05)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      ref={titleRef}
                      className={cn(
                        "text-sm font-medium truncate",
                        needsMarquee && "animate-marquee",
                      )}
                      style={{
                        color: "var(--text-primary, #F0FDFA)",
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                      }}
                    >
                      {currentStream.title}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <TypeBadge type={currentStream.type} />
                    </div>
                  </div>
                </div>

                {/* Center: Play/Pause */}
                <div className="flex items-center justify-center flex-1 sm:flex-initial">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "var(--teal, #0D9488)",
                      boxShadow: "0 0 16px rgba(13, 148, 136, 0.25)",
                    }}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Right: Volume + Expand + Close */}
                <div className="hidden sm:flex items-center gap-2 sm:w-[260px] justify-end">
                  <VolumeSlider volume={volume} onChange={setVolume} />
                  <button
                    onClick={expand}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    aria-label="Expand player"
                  >
                    <Maximize2
                      className="w-4 h-4"
                      style={{ color: "var(--text-secondary, #7BA8A0)" }}
                    />
                  </button>
                  <button
                    onClick={close}
                    className="p-2 rounded-lg transition-colors hover:bg-white/5"
                    aria-label="Close player"
                  >
                    <X
                      className="w-4 h-4"
                      style={{ color: "var(--text-muted, #2E5C54)" }}
                    />
                  </button>
                </div>

                {/* Mobile: Expand + Close */}
                <div className="flex sm:hidden items-center gap-1">
                  <button
                    onClick={expand}
                    className="p-2.5 rounded-lg transition-colors hover:bg-white/5"
                    aria-label="Expand player"
                  >
                    <Maximize2
                      className="w-4 h-4"
                      style={{ color: "var(--text-secondary, #7BA8A0)" }}
                    />
                  </button>
                  <button
                    onClick={close}
                    className="p-2.5 rounded-lg transition-colors hover:bg-white/5"
                    aria-label="Close player"
                  >
                    <X
                      className="w-4 h-4"
                      style={{ color: "var(--text-muted, #2E5C54)" }}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Volume slider styles ──────────────────────────────────────────── */}
      <style jsx global>{`
        .immerse-volume-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.1);
          outline: none;
          cursor: pointer;
        }
        .immerse-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--teal, #0d9488);
          border: 2px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .immerse-volume-slider::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .immerse-volume-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--teal, #0d9488);
          border: 2px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 12s linear infinite;
        }
      `}</style>
    </>
  );
}
