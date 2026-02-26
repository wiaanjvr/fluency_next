"use client";

/**
 * ImmerseProvider.tsx
 *
 * Global context for the persistent Immerse mini-player.
 * Wraps the entire dashboard layout so playback survives client-side navigation.
 *
 * Manages:
 * - Current stream selection
 * - Play/pause, volume, minimized/expanded/open state
 * - A persistent <audio> element (for radio/podcast) via ref
 * - YouTube IFrame API readiness flag
 * - Volume persistence to localStorage
 * - Last-played stream memory
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { ImmerseStream } from "@/lib/immerse/immerseRegistry";

// ── Types ────────────────────────────────────────────────────────────────────

interface ImmerseState {
  currentStream: ImmerseStream | null;
  isPlaying: boolean;
  isMinimized: boolean;
  isOpen: boolean;
  volume: number;
  playerReady: boolean;
  /** The ID of the last-played stream (for highlighting in the selection modal) */
  lastPlayedId: string | null;
  /** Whether the stream selection modal is open */
  isSelectModalOpen: boolean;
}

interface ImmerseActions {
  playStream: (stream: ImmerseStream) => void;
  togglePlay: () => void;
  minimize: () => void;
  expand: () => void;
  close: () => void;
  setVolume: (v: number) => void;
  openSelectModal: () => void;
  closeSelectModal: () => void;
  /** Ref for the persistent <audio> element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Ref for a YouTube player instance */
  ytPlayerRef: React.MutableRefObject<YTPlayerInstance | null>;
  setPlayerReady: (ready: boolean) => void;
}

export type ImmerseContextValue = ImmerseState & ImmerseActions;

/** Minimal YouTube IFrame Player contract we interact with */
export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
  getPlayerState: () => number;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ImmerseContext = createContext<ImmerseContextValue | undefined>(
  undefined,
);

export function useImmerse(): ImmerseContextValue {
  const ctx = useContext(ImmerseContext);
  if (!ctx) throw new Error("useImmerse must be used within ImmerseProvider");
  return ctx;
}

// ── localStorage keys ────────────────────────────────────────────────────────

const LS_VOLUME_KEY = "fluensea_immerse_volume";
const LS_LAST_STREAM_KEY = "fluensea_immerse_last_stream";

// ── Provider ─────────────────────────────────────────────────────────────────

export function ImmerseProvider({ children }: { children: ReactNode }) {
  // Persistent audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);

  // Stream state
  const [currentStream, setCurrentStream] = useState<ImmerseStream | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);

  // Volume — initialise from localStorage
  const [volume, setVolumeState] = useState(0.5);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedVol = localStorage.getItem(LS_VOLUME_KEY);
    if (storedVol !== null) {
      const v = parseFloat(storedVol);
      if (!isNaN(v) && v >= 0 && v <= 1) setVolumeState(v);
    }
    const storedLast = localStorage.getItem(LS_LAST_STREAM_KEY);
    if (storedLast) setLastPlayedId(storedLast);
  }, []);

  // ── Create persistent <audio> once ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Sync volume to audio element and YouTube player
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(volume * 100);
  }, [volume]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const playStream = useCallback(
    (stream: ImmerseStream) => {
      // Stop any existing playback first
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {
          // player may not be initialized
        }
      }

      setCurrentStream(stream);
      setIsOpen(true);
      setIsMinimized(true);
      setIsPlaying(true);
      setLastPlayedId(stream.id);

      // Persist last played
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_LAST_STREAM_KEY, stream.id);
      }

      // Start audio playback for non-YouTube streams
      if (stream.type !== "youtube" && stream.streamUrl && audioRef.current) {
        audioRef.current.src = stream.streamUrl;
        audioRef.current.volume = volume;
        audioRef.current.play().catch(() => {
          // autoplay may be blocked
          setIsPlaying(false);
        });
      }
      // YouTube playback is handled by the player component once it loads
    },
    [volume],
  );

  const togglePlay = useCallback(() => {
    if (!currentStream) return;

    if (currentStream.type === "youtube") {
      if (ytPlayerRef.current) {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
        } else {
          ytPlayerRef.current.playVideo();
        }
      }
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(() => {});
        }
      }
    }

    setIsPlaying((p) => !p);
  }, [currentStream, isPlaying]);

  const minimize = useCallback(() => setIsMinimized(true), []);
  const expand = useCallback(() => setIsMinimized(false), []);

  const close = useCallback(() => {
    // Stop everything
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        // noop
      }
    }
    setIsPlaying(false);
    setIsOpen(false);
    setIsMinimized(true);
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_VOLUME_KEY, String(clamped));
    }
  }, []);

  const openSelectModal = useCallback(() => setIsSelectModalOpen(true), []);
  const closeSelectModal = useCallback(() => setIsSelectModalOpen(false), []);

  // ── Immersion time tracking (mirrors existing ambient logic) ───────────────
  const immersionStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (isPlaying && currentStream) {
      if (!immersionStartRef.current) {
        immersionStartRef.current = Date.now();
      }
    } else if (!isPlaying && immersionStartRef.current) {
      const elapsedMs = Date.now() - immersionStartRef.current;
      const elapsedMinutes = Math.round(elapsedMs / 60000);
      immersionStartRef.current = null;
      if (elapsedMinutes >= 1) {
        fetch("/api/goals/log-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "immersion_listened",
            value: elapsedMinutes,
            metadata: { mode: currentStream?.type },
          }),
        }).catch(() => {});
      }
    }
  }, [isPlaying, currentStream]);

  // ── Context value ──────────────────────────────────────────────────────────

  const value: ImmerseContextValue = {
    currentStream,
    isPlaying,
    isMinimized,
    isOpen,
    volume,
    playerReady,
    lastPlayedId,
    isSelectModalOpen,
    playStream,
    togglePlay,
    minimize,
    expand,
    close,
    setVolume,
    openSelectModal,
    closeSelectModal,
    audioRef,
    ytPlayerRef,
    setPlayerReady,
  };

  return (
    <ImmerseContext.Provider value={value}>{children}</ImmerseContext.Provider>
  );
}
