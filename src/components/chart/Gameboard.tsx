"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameboardGrid } from "./GameboardGrid";
import { PrizeSummaryModal } from "./PrizeSummaryModal";
import { ParticleBurst } from "./ParticleBurst";
import { useParticleBurst } from "@/hooks/useParticleBurst";
import type { GameboardState, PrizeConfig } from "@/types/chart";
import { PRIZE_CONFIGS } from "@/types/chart";

/* =============================================================================
   Gameboard — Section 4: The Treasure Board with locked/unlocked states
============================================================================= */

interface GameboardProps {
  gameboardState: GameboardState;
  onSelectTile: (index: number) => Promise<PrizeConfig | null>;
  loading: boolean;
}

function GameboardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.04] bg-[var(--bg-surface,#031820)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="space-y-2">
          <div className="h-5 w-40 rounded bg-white/[0.04] animate-pulse" />
          <div className="h-3 w-64 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 16 }, (_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-white/[0.04] animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function LockedState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 20 }}
      className={cn(
        "relative rounded-2xl border border-white/[0.04] overflow-hidden",
        "bg-[var(--bg-surface,#031820)] backdrop-blur-sm",
      )}
    >
      {/* Blurred teaser grid */}
      <div className="absolute inset-0 p-6 opacity-20 blur-sm pointer-events-none">
        <div className="grid grid-cols-4 gap-3 mt-16">
          {Array.from({ length: 16 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-white/[0.04] border border-white/[0.02]"
            />
          ))}
        </div>
      </div>

      {/* Frosted overlay */}
      <div className="relative flex flex-col items-center justify-center py-20 px-6 text-center">
        <motion.div
          className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-5"
          animate={{
            boxShadow: [
              "0 0 16px rgba(13,148,136,0.2)",
              "0 0 32px rgba(13,148,136,0.4)",
              "0 0 16px rgba(13,148,136,0.2)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Lock className="w-7 h-7 text-teal-400" />
        </motion.div>
        <h3 className="text-base font-semibold text-[var(--text-primary,#edf6f4)] mb-2">
          The Treasure Board
        </h3>
        <p className="text-sm text-[var(--text-secondary,#6b9e96)] max-w-[280px]">
          Complete all 4 weeks to unlock the Gameboard
        </p>
      </div>
    </motion.div>
  );
}

export function Gameboard({
  gameboardState,
  onSelectTile,
  loading,
}: GameboardProps) {
  const [revealedPrize, setRevealedPrize] = useState<PrizeConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { particles, isActive, triggerBurst } = useParticleBurst();

  if (loading) return <GameboardSkeleton />;

  if (!gameboardState.isUnlocked) return <LockedState />;

  const handleSelectTile = useCallback(
    async (index: number) => {
      const prize = await onSelectTile(index);
      if (prize) {
        setRevealedPrize(prize);

        // Trigger particle burst at viewport center
        triggerBurst(window.innerWidth / 2, window.innerHeight / 2);

        // Show modal after flip animation
        setTimeout(() => setShowModal(true), 800);
      }
    },
    [onSelectTile, triggerBurst],
  );

  // Already played — find active prize from play data
  const alreadyPlayedPrize = gameboardState.play
    ? (PRIZE_CONFIGS[gameboardState.play.prize_type] ?? null)
    : null;

  return (
    <>
      <ParticleBurst particles={particles} isActive={isActive} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 20, delay: 0.3 }}
        className={cn(
          "rounded-2xl border border-teal-500/10 backdrop-blur-sm overflow-hidden",
          "bg-[var(--bg-surface,#031820)]",
          "shadow-[0_0_20px_rgba(13,148,136,0.08)]",
        )}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Anchor className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
              The Treasure Board
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary,#6b9e96)] mb-6 pl-[52px]">
            Choose 1 of 16 tiles. One hides a 25% discount on next month&apos;s
            premium — others hold bonus rewards.
          </p>

          {/* Tile grid */}
          <GameboardGrid
            tiles={gameboardState.tiles}
            hasPlayed={gameboardState.hasPlayed}
            onSelectTile={handleSelectTile}
          />

          {/* Post-reveal summary */}
          <AnimatePresence>
            {gameboardState.hasPlayed && alreadyPlayedPrize && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={cn(
                  "mt-6 p-4 rounded-xl border border-white/[0.06]",
                  `bg-gradient-to-br ${alreadyPlayedPrize.gradient}`,
                )}
              >
                <p className="text-sm font-medium text-white/90">
                  You won: {alreadyPlayedPrize.label}
                </p>
                <p className="text-xs text-white/60 mt-1">
                  {alreadyPlayedPrize.description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Prize reveal modal */}
      <PrizeSummaryModal
        prize={revealedPrize}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
