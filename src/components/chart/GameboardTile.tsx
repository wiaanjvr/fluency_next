"use client";

import { useState } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  Shell,
  Anchor,
  Ship,
  Fish,
  Waves,
  Compass,
  Gem,
  Crown,
  Star,
  Heart,
  Sparkles,
  Flame,
  Palmtree,
  Sailboat,
  Telescope,
  Map,
  Trophy,
  Award,
  Snowflake,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TileState, PrizeConfig } from "@/types/chart";

/* =============================================================================
   GameboardTile — Individual tile with 3D flip animation
   
   Uses CSS perspective + Framer Motion rotateY for card flip.
   Front face: ocean icon. Back face: prize display.
============================================================================= */

interface GameboardTileProps {
  tile: TileState;
  disabled: boolean;
  staggerIndex: number;
  onSelect: (index: number) => void;
}

const FRONT_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Shell,
  Anchor,
  Ship,
  Fish,
  Waves,
  Compass,
  Gem,
  Crown,
  Star,
  Heart,
  Sparkles,
  Flame,
  Palmtree,
  Sailboat,
  Telescope,
  Map,
};

const PRIZE_ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Trophy,
  Star,
  Award,
  Snowflake,
  Zap,
  Waves,
};

const tileEntranceVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 18,
      delay: i * 0.05,
    },
  }),
} as const;

const floatVariants = {
  float: (i: number) => ({
    y: [0, -4, 0],
    transition: {
      duration: 2.5 + (i % 4) * 0.3,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: (i % 8) * 0.2,
    },
  }),
} as const;

export function GameboardTile({
  tile,
  disabled,
  staggerIndex,
  onSelect,
}: GameboardTileProps) {
  const [isFlipped, setIsFlipped] = useState(tile.isRevealed);
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimation();

  const FrontIcon = FRONT_ICON_MAP[tile.frontIcon] ?? Gem;
  const prizeIcon = tile.prize?.icon ?? "Star";
  const PrizeIcon = PRIZE_ICON_MAP[prizeIcon] ?? Star;

  const handleClick = async () => {
    if (disabled || isFlipped) return;
    setIsFlipped(true);
    onSelect(tile.index);
  };

  const isOtherRevealed = !tile.isSelected && tile.isRevealed;
  const isDimmed = disabled && !tile.isSelected && !isFlipped;

  return (
    <motion.div
      custom={staggerIndex}
      variants={tileEntranceVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        custom={staggerIndex}
        variants={floatVariants}
        animate={!isFlipped && !disabled ? "float" : undefined}
        onHoverStart={() => !disabled && !isFlipped && setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        onClick={handleClick}
        className={cn(
          "relative cursor-pointer",
          disabled && !tile.isSelected && "cursor-default",
          isDimmed && "opacity-30",
        )}
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
          }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
          {/* ── Front Face ─────────────────────────────────── */}
          <div
            className={cn(
              "w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-xl",
              "flex items-center justify-center",
              "bg-[var(--bg-elevated,#052030)] border border-white/[0.06]",
              "backdrop-blur-sm transition-shadow duration-300",
              isHovering && "shadow-[0_0_20px_rgba(13,148,136,0.3)]",
              tile.isSelected &&
                "shadow-[0_0_16px_rgba(13,148,136,0.5)] border-teal-500/40",
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <FrontIcon
              className={cn(
                "w-8 h-8 text-[var(--text-muted,#2e5c54)] transition-colors",
                isHovering && "text-teal-400",
              )}
            />

            {/* Hover shimmer effect */}
            {isHovering && (
              <motion.div
                className="absolute inset-0 rounded-xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* ── Back Face (Prize) ──────────────────────────── */}
          <div
            className={cn(
              "absolute inset-0 w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-xl",
              "flex flex-col items-center justify-center gap-1.5 p-2",
              "border border-white/[0.08]",
              tile.prize
                ? `bg-gradient-to-br ${tile.prize.gradient}`
                : "bg-[var(--bg-elevated,#052030)]",
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {tile.prize && (
              <>
                <PrizeIcon className="w-7 h-7 text-white/90" />
                <span className="text-[10px] sm:text-xs font-bold text-white text-center leading-tight">
                  {tile.prize.label}
                </span>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
