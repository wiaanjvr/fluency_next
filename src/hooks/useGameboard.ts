"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type {
  GameboardPlay,
  GameboardState,
  TileState,
  PrizeType,
  PrizeConfig,
} from "@/types/chart";
import {
  PRIZE_DISTRIBUTION,
  PRIZE_CONFIGS,
  TILE_FRONT_ICONS,
} from "@/types/chart";

/* =============================================================================
   useGameboard — Manages gameboard tile state, selection, and prize reveal
============================================================================= */

interface UseGameboardReturn {
  gameboardState: GameboardState;
  selectTile: (index: number) => Promise<PrizeConfig | null>;
  loading: boolean;
  error: string | null;
}

/** Deterministic shuffle using a seed (month+year+userId) */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const arr = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    const j = hash % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function buildTiles(
  userId: string,
  month: number,
  year: number,
  play: GameboardPlay | null,
): TileState[] {
  const seed = `${userId}-${month}-${year}`;
  const shuffledPrizes = seededShuffle(PRIZE_DISTRIBUTION, seed);
  const shuffledIcons = seededShuffle([...TILE_FRONT_ICONS], seed + "-icons");

  return Array.from({ length: 16 }, (_, i) => ({
    index: i,
    isRevealed: play !== null && play.tile_index === i,
    isSelected: play !== null && play.tile_index === i,
    prize:
      play !== null && play.tile_index === i
        ? PRIZE_CONFIGS[shuffledPrizes[i]]
        : null,
    frontIcon: shuffledIcons[i % shuffledIcons.length],
  }));
}

export function useGameboard(isUnlocked: boolean): UseGameboardReturn {
  const { user } = useAuth();
  const [play, setPlay] = useState<GameboardPlay | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Fetch existing play
  useEffect(() => {
    if (!user?.id || !isUnlocked) {
      setLoading(false);
      return;
    }

    const fetchPlay = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("gameboard_plays")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", month)
          .eq("year", year)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

        if (data) {
          setPlay(data as GameboardPlay);
          setHasPlayed(true);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch gameboard",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPlay();
  }, [user?.id, isUnlocked, month, year]);

  const tiles = useMemo(
    () => buildTiles(user?.id ?? "", month, year, play),
    [user?.id, month, year, play],
  );

  const gameboardState: GameboardState = {
    isUnlocked,
    hasPlayed,
    play,
    tiles,
  };

  const selectTile = useCallback(
    async (index: number): Promise<PrizeConfig | null> => {
      if (!user?.id || hasPlayed || !isUnlocked) return null;

      try {
        const supabase = createClient();
        const seed = `${user.id}-${month}-${year}`;
        const shuffledPrizes = seededShuffle(PRIZE_DISTRIBUTION, seed);
        const prizeType = shuffledPrizes[index];
        const prizeConfig = PRIZE_CONFIGS[prizeType];

        const newPlay: Omit<GameboardPlay, "id"> = {
          user_id: user.id,
          month,
          year,
          tile_index: index,
          prize_type: prizeType,
          prize_value: prizeConfig.value,
          played_at: new Date().toISOString(),
        };

        const { data, error: insertError } = await supabase
          .from("gameboard_plays")
          .insert(newPlay)
          .select()
          .single();

        if (insertError) throw insertError;

        setPlay(data as GameboardPlay);
        setHasPlayed(true);

        return prizeConfig;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to record tile selection",
        );
        return null;
      }
    },
    [user?.id, hasPlayed, isUnlocked, month, year],
  );

  return { gameboardState, selectTile, loading, error };
}
