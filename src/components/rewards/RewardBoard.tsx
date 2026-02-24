"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";

/* =============================================================================
   REWARD GAMEBOARD
   
   A 4×4 grid of 16 tiles. The user flips exactly ONE tile to reveal a
   discount percentage. All other tiles become disabled after selection.
   
   Visual states per tile:
   - 'hidden'   → decorative ocean-themed back face
   - 'flipped'  → discount percentage with celebration animation
   - 'disabled' → greyed out after another tile is chosen
   
   Tile values are NEVER known to the client — the server reveals the
   discount only after the user submits their chosen index.
============================================================================= */

// ── Decorative tile back patterns (ocean theme) ─────────────────────────────
const TILE_ICONS = [
  "🐚",
  "🌊",
  "🐠",
  "🦈",
  "🐙",
  "🪸",
  "🐋",
  "🦑",
  "🏝️",
  "⚓",
  "🧭",
  "🦐",
  "🐬",
  "🪼",
  "🌅",
  "🐡",
];

interface RewardBoardProps {
  /** Whether the board is interactive (false = locked/preview state) */
  interactive?: boolean;
  /** Whether the board is in locked state (free/tide users) */
  locked?: boolean;
  /** Callback when user selects a tile. Returns the chosen index (0-15). */
  onSelectTile?: (index: number) => Promise<number | null>;
  /** If the user already claimed, show which tile was picked + discount */
  claimedIndex?: number | null;
  claimedDiscount?: number | null;
  /** Whether a claim request is in flight */
  loading?: boolean;
}

type TileState = "hidden" | "flipped" | "disabled";

export function RewardBoard({
  interactive = true,
  locked = false,
  onSelectTile,
  claimedIndex = null,
  claimedDiscount = null,
  loading = false,
}: RewardBoardProps) {
  const [tileStates, setTileStates] = useState<TileState[]>(
    Array(16).fill("hidden"),
  );
  const [revealedDiscount, setRevealedDiscount] = useState<number | null>(
    claimedDiscount,
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    claimedIndex,
  );
  const [animatingFlip, setAnimatingFlip] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [countUpValue, setCountUpValue] = useState(0);

  // ── Restore claimed state on mount ────────────────────────────────────────
  useEffect(() => {
    if (claimedIndex !== null && claimedDiscount !== null) {
      const newStates: TileState[] = Array(16).fill("disabled");
      newStates[claimedIndex] = "flipped";
      setTileStates(newStates);
      setRevealedDiscount(claimedDiscount);
      setSelectedIndex(claimedIndex);
    }
  }, [claimedIndex, claimedDiscount]);

  // ── Count-up animation for revealed discount ─────────────────────────────
  useEffect(() => {
    if (revealedDiscount === null) return;
    const duration = 1200;
    const start = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCountUpValue(Math.round(eased * revealedDiscount));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [revealedDiscount]);

  // ── Confetti burst ────────────────────────────────────────────────────────
  const fireConfetti = useCallback(() => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Ocean-themed confetti colors
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { x, y },
      colors: ["#3dd6b5", "#1e6b72", "#a8d5c2", "#e8dcc8", "#0d1b2a"],
      shapes: ["circle", "square"],
      gravity: 0.8,
      ticks: 200,
    });

    // Secondary burst
    setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { x, y: y - 0.05 },
        colors: ["#3dd6b5", "#e8dcc8", "#ffffff"],
        startVelocity: 25,
        gravity: 1,
      });
    }, 200);
  }, []);

  // ── Handle tile click ─────────────────────────────────────────────────────
  const handleTileClick = useCallback(
    async (index: number) => {
      if (
        !interactive ||
        locked ||
        loading ||
        animatingFlip ||
        selectedIndex !== null ||
        tileStates[index] !== "hidden"
      ) {
        return;
      }

      setAnimatingFlip(true);
      setSelectedIndex(index);

      // Optimistically start the flip animation
      setTileStates((prev) => {
        const next = [...prev];
        next[index] = "flipped";
        return next;
      });

      // Call the server to reveal the tile value
      const discount = await onSelectTile?.(index);

      if (discount !== null && discount !== undefined) {
        setRevealedDiscount(discount);

        // Disable all other tiles
        setTileStates((prev) =>
          prev.map((s, i) => (i === index ? "flipped" : "disabled")),
        );

        // Fire celebration
        setTimeout(() => fireConfetti(), 400);
      } else {
        // Server error — revert
        setTileStates(Array(16).fill("hidden"));
        setSelectedIndex(null);
      }

      setAnimatingFlip(false);
    },
    [
      interactive,
      locked,
      loading,
      animatingFlip,
      selectedIndex,
      tileStates,
      onSelectTile,
      fireConfetti,
    ],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={boardRef}
      className={cn(
        "grid grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-[380px] mx-auto",
        locked && "opacity-40 blur-sm pointer-events-none select-none",
      )}
    >
      {Array.from({ length: 16 }, (_, i) => (
        <GameboardTile
          key={i}
          index={i}
          state={tileStates[i]}
          icon={TILE_ICONS[i]}
          discount={i === selectedIndex ? countUpValue : null}
          onClick={() => handleTileClick(i)}
          interactive={
            interactive && !locked && !loading && selectedIndex === null
          }
          loading={loading && i === selectedIndex}
        />
      ))}

      {/* Locked overlay for free/tide users */}
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="bg-[var(--midnight)]/80 backdrop-blur-md rounded-2xl p-6 text-center space-y-3 border border-white/10">
            <Lock className="h-8 w-8 text-[var(--seafoam)] mx-auto" />
            <p className="text-sm text-[var(--sand)] font-medium">
              Upgrade to Diver or Submariner
              <br />
              to unlock monthly rewards
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual Tile ─────────────────────────────────────────────────────────

interface GameboardTileProps {
  index: number;
  state: TileState;
  icon: string;
  discount: number | null;
  onClick: () => void;
  interactive: boolean;
  loading: boolean;
}

function GameboardTile({
  index,
  state,
  icon,
  discount,
  onClick,
  interactive,
  loading,
}: GameboardTileProps) {
  const isFlipped = state === "flipped";
  const isDisabled = state === "disabled";

  return (
    <motion.button
      onClick={onClick}
      disabled={!interactive || isFlipped || isDisabled}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.3, ease: "easeOut" }}
      whileHover={
        interactive && !isFlipped && !isDisabled
          ? { scale: 1.06, y: -2 }
          : undefined
      }
      whileTap={
        interactive && !isFlipped && !isDisabled ? { scale: 0.95 } : undefined
      }
      className={cn(
        "relative aspect-square rounded-xl cursor-pointer",
        "transition-shadow duration-200",
        // Interactive hover glow
        interactive &&
          !isFlipped &&
          !isDisabled &&
          "hover:shadow-[0_0_20px_rgba(61,214,181,0.25)] hover:ring-1 hover:ring-[var(--turquoise)]/30",
        // Disabled state
        isDisabled && "opacity-30 cursor-not-allowed",
        // Loading pulse
        loading && "animate-pulse",
      )}
      style={{ perspective: "600px" }}
      aria-label={
        isFlipped
          ? `Tile ${index + 1}: ${discount}% discount`
          : `Tile ${index + 1}: hidden`
      }
    >
      {/* 3D flip container */}
      <div
        className="relative w-full h-full transition-transform duration-[600ms]"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Back face (hidden tile) ──────────────────────────────── */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl flex items-center justify-center",
            "bg-gradient-to-br from-[var(--deep-navy)] to-[var(--ocean-mid)]",
            "border border-white/10",
            "text-2xl select-none",
          )}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="drop-shadow-lg">{icon}</span>
          {/* Subtle wave shimmer */}
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background:
                  "linear-gradient(135deg, transparent 30%, rgba(61,214,181,0.3) 50%, transparent 70%)",
                animation: `shimmer ${3 + index * 0.2}s ease-in-out infinite`,
              }}
            />
          </div>
        </div>

        {/* ── Front face (revealed discount) ───────────────────────── */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl flex flex-col items-center justify-center",
            "bg-gradient-to-br from-[var(--turquoise)]/20 to-[var(--surface-teal)]/40",
            "border-2 border-[var(--turquoise)]/50",
          )}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <AnimatePresence>
            {isFlipped && discount !== null && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="text-center"
              >
                <span className="text-2xl sm:text-3xl font-bold text-[var(--turquoise)] drop-shadow-lg">
                  {discount}%
                </span>
                <p className="text-[10px] text-[var(--seafoam)] mt-0.5">OFF</p>
              </motion.div>
            )}
          </AnimatePresence>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-[var(--turquoise)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

/* ── Shimmer keyframes (injected via style tag) ──────────────────────────── */
if (typeof document !== "undefined") {
  const styleId = "gameboard-shimmer";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes shimmer {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
  }
}
