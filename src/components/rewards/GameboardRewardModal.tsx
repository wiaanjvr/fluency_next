"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RewardBoard } from "./RewardBoard";
import { cn } from "@/lib/utils";
import type { GameboardStatus, GameboardTier } from "@/types/gameboard";

/* =============================================================================
   GAMEBOARD REWARD MODAL
   
   Full-screen modal that appears when an unclaimed reward gameboard is
   available. Contains the RewardBoard and handles claim API calls.
   
   States:
   - Pending: user can flip one tile
   - Claimed: shows the discount with celebration
   - Expired: sorry message
   - Locked: free/tide users see blurred preview
============================================================================= */

interface GameboardRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current reward status */
  status: GameboardStatus | "not_eligible" | "no_reward";
  /** User's subscription tier */
  tier?: GameboardTier | "snorkeler" | string;
  /** If already claimed */
  claimedIndex?: number | null;
  claimedDiscount?: number | null;
  /** ISO string */
  expiresAt?: string | null;
  /** The month name for display (e.g. "February 2026") */
  rewardMonth?: string;
  /** Callback after successful claim */
  onClaimed?: (discountPercent: number) => void;
}

function formatMonthLabel(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getExpiryCountdown(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

const TIER_BADGE: Record<string, { label: string; color: string }> = {
  diver: {
    label: "Diver",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  submariner: {
    label: "Submariner",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
};

export function GameboardRewardModal({
  isOpen,
  onClose,
  status,
  tier,
  claimedIndex = null,
  claimedDiscount = null,
  expiresAt,
  rewardMonth,
  onClaimed,
}: GameboardRewardModalProps) {
  const [claiming, setClaiming] = useState(false);
  const [resultDiscount, setResultDiscount] = useState<number | null>(
    claimedDiscount,
  );
  const [resultIndex, setResultIndex] = useState<number | null>(claimedIndex);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [expiryText, setExpiryText] = useState("");

  const isLocked = !tier || tier === "snorkeler";
  const isPending = status === "pending";
  const isClaimed = status === "claimed" || resultDiscount !== null;
  const isExpired = status === "expired";

  const monthLabel = formatMonthLabel(rewardMonth);
  const badge = tier ? TIER_BADGE[tier] : null;

  // ── Update expiry countdown every minute ──────────────────────────────────
  useEffect(() => {
    if (!expiresAt || isClaimed || isExpired) return;
    const update = () => setExpiryText(getExpiryCountdown(expiresAt));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt, isClaimed, isExpired]);

  // ── Handle tile selection — calls the claim API ───────────────────────────
  const handleSelectTile = useCallback(
    async (index: number): Promise<number | null> => {
      setClaiming(true);
      setError(null);

      try {
        const res = await fetch("/api/rewards/gameboard/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chosenIndex: index }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const data = await res.json();
        const discount = data.discountPercent as number;

        setResultDiscount(discount);
        setResultIndex(index);
        setShowCelebration(true);
        onClaimed?.(discount);

        return discount;
      } catch (err) {
        console.error("Claim error:", err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        return null;
      } finally {
        setClaiming(false);
      }
    },
    [onClaimed],
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="gameboard-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      >
        <motion.div
          key="gameboard-modal"
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className={cn(
            "relative w-full max-w-md rounded-2xl overflow-hidden",
            "bg-gradient-to-b from-[var(--deep-navy)] to-[var(--midnight)]",
            "border border-white/10 shadow-2xl",
          )}
        >
          {/* ── Close button ──────────────────────────────────────── */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-[var(--seafoam)]/60 hover:text-[var(--sand)] hover:bg-white/5 transition-colors z-20"
          >
            <X className="h-5 w-5" />
          </button>

          {/* ── Header ────────────────────────────────────────────── */}
          <div className="px-6 pt-6 pb-3 text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-14 h-14 rounded-full bg-[var(--turquoise)]/15 flex items-center justify-center"
            >
              {isLocked ? (
                <Lock className="h-7 w-7 text-[var(--seafoam)]" />
              ) : (
                <Trophy className="h-7 w-7 text-[var(--turquoise)]" />
              )}
            </motion.div>

            {!isLocked && !isExpired && !isClaimed && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--sand)]">
                  You completed all your goals!
                </h2>
                <p className="text-sm text-[var(--seafoam)] mt-1">
                  {monthLabel}
                </p>
              </div>
            )}

            {isClaimed && showCelebration && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-xl font-semibold text-[var(--sand)]">
                  🎉 You won {resultDiscount}% off next month!
                </h2>
                <p className="text-sm text-[var(--seafoam)] mt-1">
                  The discount will be applied to your next billing cycle
                </p>
              </motion.div>
            )}

            {isClaimed && !showCelebration && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--sand)]">
                  Reward Claimed
                </h2>
                <p className="text-sm text-[var(--seafoam)] mt-1">
                  {resultDiscount}% off applied to {monthLabel}
                </p>
              </div>
            )}

            {isExpired && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--sand)]">
                  Reward Expired
                </h2>
                <p className="text-sm text-[var(--seafoam)] mt-1">
                  This reward for {monthLabel} has expired. Keep completing your
                  goals for next month!
                </p>
              </div>
            )}

            {isLocked && (
              <div>
                <h2 className="text-xl font-semibold text-[var(--sand)]">
                  Monthly Rewards
                </h2>
                <p className="text-sm text-[var(--seafoam)] mt-1">
                  Upgrade to Diver or Submariner to unlock monthly rewards
                </p>
              </div>
            )}

            {/* Tier badge */}
            {badge && !isLocked && (
              <div className="flex justify-center">
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    badge.color,
                  )}
                >
                  {badge.label}
                </span>
              </div>
            )}
          </div>

          {/* ── Gameboard ─────────────────────────────────────────── */}
          <div className="px-6 py-4">
            {!isExpired ? (
              <div className="relative">
                <RewardBoard
                  interactive={isPending && !isLocked}
                  locked={isLocked}
                  onSelectTile={handleSelectTile}
                  claimedIndex={resultIndex}
                  claimedDiscount={resultDiscount}
                  loading={claiming}
                />
              </div>
            ) : (
              <div className="py-8 text-center">
                <Clock className="h-12 w-12 text-[var(--seafoam)]/30 mx-auto mb-3" />
                <p className="text-sm text-[var(--seafoam)]/60">
                  Complete all goals next month for another chance!
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="px-6 pb-6 space-y-2">
            {/* Expiry countdown */}
            {isPending && expiryText && !isLocked && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--seafoam)]/60">
                <Clock className="h-3.5 w-3.5" />
                <span>{expiryText}</span>
              </div>
            )}

            {/* Instructions */}
            {isPending && !isLocked && !isClaimed && (
              <p className="text-center text-xs text-[var(--seafoam)]/50">
                Tap a tile to reveal your discount. You get one flip!
              </p>
            )}

            {/* Error message */}
            {error && (
              <p className="text-center text-xs text-red-400">{error}</p>
            )}

            {/* Locked CTA */}
            {isLocked && (
              <Button
                variant="ocean"
                size="lg"
                className="w-full"
                onClick={() => {
                  onClose();
                  // Navigate to upgrade page
                  window.location.href = "/pricing";
                }}
              >
                Upgrade to unlock
              </Button>
            )}

            {/* Close / Done button */}
            {(isClaimed || isExpired) && (
              <Button
                variant="outline"
                className="w-full border-white/10 text-[var(--sand)] hover:bg-white/5"
                onClick={onClose}
              >
                {isClaimed ? "Done" : "Close"}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
