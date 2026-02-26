"use client";

import { GameboardTile } from "./GameboardTile";
import type { TileState } from "@/types/chart";

/* =============================================================================
   GameboardGrid — 4x4 tile grid for the gameboard
============================================================================= */

interface GameboardGridProps {
  tiles: TileState[];
  hasPlayed: boolean;
  onSelectTile: (index: number) => void;
}

export function GameboardGrid({
  tiles,
  hasPlayed,
  onSelectTile,
}: GameboardGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-4 justify-items-center">
      {tiles.map((tile, i) => (
        <GameboardTile
          key={tile.index}
          tile={tile}
          disabled={hasPlayed && !tile.isSelected}
          staggerIndex={i}
          onSelect={onSelectTile}
        />
      ))}
    </div>
  );
}
