"use client";

/**
 * AmbientPlayerContext.tsx
 *
 * Manages a single persistent <audio> element for the lifetime of the app
 * session. Audio survives client-side navigation in the Next.js App Router
 * because this context lives in layout.tsx above all page content.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AmbientStation {
  id: string;
  name: string;
  stream_url: string;
  country: string;
  bitrate: number;
}

export interface AmbientEpisode {
  feed_title: string;
  episode_title: string;
  audio_url: string;
  duration?: string;
  published_at?: string;
  difficulty: string;
}

type AmbientMode = "radio" | "podcast" | null;

interface AmbientPlayerState {
  mode: AmbientMode;
  isPlaying: boolean;
  volume: number;
  currentStation: AmbientStation | null;
  currentEpisode: AmbientEpisode | null;
  stations: AmbientStation[];
  episodes: AmbientEpisode[];
  isLoading: boolean;
  /** True when all available radio streams have been tried and failed */
  streamError: boolean;
}

interface AmbientPlayerActions {
  openAmbient: (mode: "radio" | "podcast") => void;
  closeAmbient: () => void;
  playStation: (station: AmbientStation) => void;
  playEpisode: (episode: AmbientEpisode) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  /** Retry from scratch after all radio streams failed */
  retryStream: () => void;
  /** Retry from scratch after all podcast episodes failed */
  retryEpisode: () => void;
}

type AmbientPlayerContextValue = AmbientPlayerState & AmbientPlayerActions;

// ── Context ──────────────────────────────────────────────────────────────────

const AmbientPlayerContext = createContext<
  AmbientPlayerContextValue | undefined
>(undefined);

const LS_MODE_KEY = "fluensea_ambient_mode";

// ── Provider ─────────────────────────────────────────────────────────────────

export function AmbientPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [mode, setMode] = useState<AmbientMode>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.4);
  const [currentStation, setCurrentStation] = useState<AmbientStation | null>(
    null,
  );
  const [currentEpisode, setCurrentEpisode] = useState<AmbientEpisode | null>(
    null,
  );
  const [stations, setStations] = useState<AmbientStation[]>([]);
  const [episodes, setEpisodes] = useState<AmbientEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Tracks which IDs/URLs have been tried so we stop cycling once all fail.
  const triedStationIdsRef = useRef<Set<string>>(new Set());
  const triedEpisodeUrlsRef = useRef<Set<string>>(new Set());

  // ── Create the audio element once ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.volume = 0.4;
    audio.preload = "none";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // ── Sync volume changes to audio element ──────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // ── Auto-advance on stream / episode error ───────────────────────────────
  const stationsRef = useRef<AmbientStation[]>([]);
  const currentStationRef = useRef<AmbientStation | null>(null);
  const episodesRef = useRef<AmbientEpisode[]>([]);
  const currentEpisodeRef = useRef<AmbientEpisode | null>(null);
  stationsRef.current = stations;
  currentStationRef.current = currentStation;
  episodesRef.current = episodes;
  currentEpisodeRef.current = currentEpisode;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleError = () => {
      // ── Radio ────────────────────────────────────────────────────────────
      if (currentStationRef.current !== null) {
        const failedId = currentStationRef.current.id;
        triedStationIdsRef.current.add(failedId);

        const untried = stationsRef.current.filter(
          (s) => !triedStationIdsRef.current.has(s.id),
        );

        if (untried.length === 0) {
          console.warn("[Ambient] All radio stations failed. Giving up.");
          setStreamError(true);
          setIsPlaying(false);
          return;
        }

        const next = untried[0];
        console.warn(
          `[Ambient] Station error: "${currentStationRef.current.name}" → trying "${next.name}" (${untried.length - 1} left)`,
        );
        setTimeout(() => {
          audio.src = next.stream_url;
          audio.play().catch(() => {});
          setCurrentStation(next);
          setIsPlaying(true);
        }, 1200);
        return;
      }

      // ── Podcast ──────────────────────────────────────────────────────────
      if (currentEpisodeRef.current !== null) {
        const failedUrl = currentEpisodeRef.current.audio_url;
        triedEpisodeUrlsRef.current.add(failedUrl);

        const untried = episodesRef.current.filter(
          (ep) => !triedEpisodeUrlsRef.current.has(ep.audio_url),
        );

        if (untried.length === 0) {
          console.warn("[Ambient] All podcast episodes failed. Giving up.");
          setStreamError(true);
          setIsPlaying(false);
          return;
        }

        const next = untried[0];
        console.warn(
          `[Ambient] Episode error: "${currentEpisodeRef.current.episode_title}" → trying "${next.episode_title}" (${untried.length - 1} left)`,
        );
        setTimeout(() => {
          audio.src = next.audio_url;
          audio.play().catch(() => {});
          setCurrentEpisode(next);
          setIsPlaying(true);
        }, 1200);
      }
    };

    audio.addEventListener("error", handleError);
    return () => audio.removeEventListener("error", handleError);
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  const fetchStations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ambient/radio");
      if (res.ok) {
        const json = await res.json();
        setStations(json.stations ?? []);
        return json.stations as AmbientStation[];
      }
    } catch (e) {
      console.error("[Ambient] Failed to fetch stations:", e);
    } finally {
      setIsLoading(false);
    }
    return [];
  }, []);

  const fetchEpisodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ambient/podcast");
      if (res.ok) {
        const json = await res.json();
        setEpisodes(json.episodes ?? []);
        return json.episodes as AmbientEpisode[];
      }
    } catch (e) {
      console.error("[Ambient] Failed to fetch episodes:", e);
    } finally {
      setIsLoading(false);
    }
    return [];
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const openAmbient = useCallback(
    async (nextMode: "radio" | "podcast") => {
      setMode(nextMode);
      setStreamError(false);
      triedStationIdsRef.current.clear();
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_MODE_KEY, nextMode);
      }

      if (nextMode === "radio") {
        let list = stations;
        if (list.length === 0) list = await fetchStations();
        // Auto-play first station if nothing is already playing
        if (list.length > 0 && !currentStation) {
          const first = list[0];
          const audio = audioRef.current;
          if (audio) {
            audio.src = first.stream_url;
            audio.play().catch(() => {});
          }
          setCurrentStation(first);
          setIsPlaying(true);
        }
      } else {
        let list = episodes;
        if (list.length === 0) list = await fetchEpisodes();
        // Sort by difficulty — easiest first
        const sorted = [...list].sort((a, b) => {
          const order: Record<string, number> = {
            beginner: 0,
            elementary: 1,
            intermediate: 2,
            advanced: 3,
          };
          return (order[a.difficulty] ?? 2) - (order[b.difficulty] ?? 2);
        });
        if (sorted.length > 0 && !currentEpisode) {
          const first = sorted[0];
          const audio = audioRef.current;
          if (audio) {
            audio.src = first.audio_url;
            audio.play().catch(() => {});
          }
          setCurrentEpisode(first);
          setIsPlaying(true);
        }
      }
    },
    [
      stations,
      episodes,
      currentStation,
      currentEpisode,
      fetchStations,
      fetchEpisodes,
    ],
  );

  const closeAmbient = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setMode(null);
    setIsPlaying(false);
    setCurrentStation(null);
    setCurrentEpisode(null);
    setStreamError(false);
    triedStationIdsRef.current.clear();
    triedEpisodeUrlsRef.current.clear();
  }, []);

  const playStation = useCallback((station: AmbientStation) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Reset the tried-set whenever the user manually picks a station
    triedStationIdsRef.current.clear();
    setStreamError(false);
    audio.src = station.stream_url;
    audio.play().catch(() => {});
    setCurrentStation(station);
    setCurrentEpisode(null);
    setIsPlaying(true);
    setMode("radio");
  }, []);

  const playEpisode = useCallback((episode: AmbientEpisode) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Reset tried set so auto-advance starts fresh from this explicit pick
    triedEpisodeUrlsRef.current.clear();
    setStreamError(false);
    audio.src = episode.audio_url;
    audio.play().catch(() => {});
    setCurrentEpisode(episode);
    setCurrentStation(null);
    setIsPlaying(true);
    setMode("podcast");
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
  }, []);

  /** Retry radio from scratch after all streams failed */
  const retryStream = useCallback(() => {
    triedStationIdsRef.current.clear();
    setStreamError(false);
    const list = stationsRef.current;
    if (list.length === 0) return;
    const first = list[0];
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = first.stream_url;
    audio.play().catch(() => {});
    setCurrentStation(first);
    setCurrentEpisode(null);
    setIsPlaying(true);
  }, []);

  /** Retry podcast from scratch after all episodes failed */
  const retryEpisode = useCallback(() => {
    triedEpisodeUrlsRef.current.clear();
    setStreamError(false);
    const list = episodesRef.current;
    if (list.length === 0) return;
    const first = list[0];
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = first.audio_url;
    audio.play().catch(() => {});
    setCurrentEpisode(first);
    setCurrentStation(null);
    setIsPlaying(true);
  }, []);

  // ── Restore last mode from localStorage on mount ──────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    // We intentionally DON'T auto-play — just cache the preferred mode so the
    // launcher can pre-select it. The user must click to start.
    // (No-op here; mode is only restored when user actively opens the launcher.)
  }, []);

  const value: AmbientPlayerContextValue = {
    mode,
    isPlaying,
    volume,
    currentStation,
    currentEpisode,
    stations,
    episodes,
    isLoading,
    streamError,
    openAmbient,
    closeAmbient,
    playStation,
    playEpisode,
    togglePlay,
    setVolume,
    retryStream,
    retryEpisode,
  };

  return (
    <AmbientPlayerContext.Provider value={value}>
      {children}
    </AmbientPlayerContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAmbientPlayer(): AmbientPlayerContextValue {
  const ctx = useContext(AmbientPlayerContext);
  if (!ctx) {
    throw new Error(
      "useAmbientPlayer must be used inside AmbientPlayerProvider",
    );
  }
  return ctx;
}

export default AmbientPlayerContext;
