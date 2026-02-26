"use client";

import React, { useRef, useEffect, useCallback } from "react";

// ============================================================================
// YouTubePlayer — embeds and controls a YouTube IFrame
//
// Uses the YouTube IFrame API directly (no external package required).
// ============================================================================

/* ---------- YouTube IFrame API type declarations ---------- */
interface YTPlayerState {
  UNSTARTED: number;
  ENDED: number;
  PLAYING: number;
  PAUSED: number;
  BUFFERING: number;
  CUED: number;
}

interface YTPlayerInstance {
  getCurrentTime: () => number;
  destroy: () => void;
}

interface YTPlayerEvent {
  data: number;
}

interface YTPlayerConstructor {
  new (
    elementId: string,
    options: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onStateChange?: (event: YTPlayerEvent) => void;
        onReady?: (event: { target: YTPlayerInstance }) => void;
      };
    },
  ): YTPlayerInstance;
}

interface YTNamespace {
  Player: YTPlayerConstructor;
  PlayerState: YTPlayerState;
}

declare global {
  interface Window {
    YT: YTNamespace;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onTimeUpdate?: (timeMs: number) => void;
  onEnded?: () => void;
  className?: string;
}

export default function YouTubePlayer({
  videoId,
  onTimeUpdate,
  onEnded,
  className,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        const timeMs = playerRef.current.getCurrentTime() * 1000;
        onTimeUpdate?.(timeMs);
      }
    }, 250);
  }, [onTimeUpdate]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Load the IFrame API script if not already loaded
    const loadApi = () => {
      return new Promise<void>((resolve) => {
        if (window.YT && window.YT.Player) {
          resolve();
          return;
        }
        const existing = document.getElementById("yt-iframe-api");
        if (!existing) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
        window.onYouTubeIframeAPIReady = () => resolve();
      });
    };

    let cancelled = false;

    loadApi().then(() => {
      if (cancelled || !containerRef.current) return;

      // Create a child div for the player to target
      const playerId = `yt-player-${videoId}`;
      let el = document.getElementById(playerId);
      if (!el) {
        el = document.createElement("div");
        el.id = playerId;
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(el);
      }

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onStateChange: (event: YTPlayerEvent) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              startPolling();
            } else {
              stopPolling();
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded?.();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      if (
        playerRef.current &&
        typeof playerRef.current.destroy === "function"
      ) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div
      ref={containerRef}
      className={className ?? "aspect-video w-full rounded-xl overflow-hidden"}
    />
  );
}
