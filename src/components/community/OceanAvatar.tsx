"use client";

import React from "react";

// Deterministic ocean creature avatars based on user ID hash
const OCEAN_CREATURES = [
  // Jellyfish
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="16" rx="12" ry="10" fill={color} opacity="0.3" />
      <ellipse cx="20" cy="16" rx="10" ry="8" fill={color} opacity="0.6" />
      <path
        d="M12 22 Q10 30 12 36"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M17 22 Q16 32 18 38"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M23 22 Q24 32 22 38"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M28 22 Q30 30 28 36"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      <circle cx="16" cy="14" r="1.5" fill="white" opacity="0.8" />
      <circle cx="24" cy="14" r="1.5" fill="white" opacity="0.8" />
    </svg>
  ),
  // Octopus
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="14" rx="11" ry="9" fill={color} opacity="0.5" />
      <path
        d="M10 20 Q6 28 10 34"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M14 22 Q11 30 14 36"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M20 23 Q20 31 20 38"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M26 22 Q29 30 26 36"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M30 20 Q34 28 30 34"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <circle cx="16" cy="12" r="2" fill="white" opacity="0.8" />
      <circle cx="24" cy="12" r="2" fill="white" opacity="0.8" />
      <circle cx="16" cy="12.5" r="1" fill={color} />
      <circle cx="24" cy="12.5" r="1" fill={color} />
    </svg>
  ),
  // Seahorse
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22 6 Q28 6 28 12 Q28 18 22 20 Q22 26 24 30 Q22 36 18 34 Q14 32 16 28 Q18 24 18 20 Q12 18 12 12 Q12 6 22 6Z"
        fill={color}
        opacity="0.5"
      />
      <circle cx="22" cy="11" r="1.5" fill="white" opacity="0.8" />
      <path
        d="M26 10 Q30 8 28 6"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        opacity="0.4"
      />
    </svg>
  ),
  // Turtle
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="20" rx="12" ry="9" fill={color} opacity="0.4" />
      <ellipse cx="20" cy="20" rx="9" ry="6" fill={color} opacity="0.6" />
      <circle cx="29" cy="16" r="4" fill={color} opacity="0.3" />
      <circle cx="30" cy="15" r="1" fill="white" opacity="0.8" />
      <ellipse
        cx="11"
        cy="14"
        rx="3"
        ry="2"
        fill={color}
        opacity="0.3"
        transform="rotate(-20 11 14)"
      />
      <ellipse
        cx="11"
        cy="26"
        rx="3"
        ry="2"
        fill={color}
        opacity="0.3"
        transform="rotate(20 11 26)"
      />
      <ellipse
        cx="28"
        cy="26"
        rx="3"
        ry="2"
        fill={color}
        opacity="0.3"
        transform="rotate(-20 28 26)"
      />
    </svg>
  ),
  // Starfish
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 4 L23 15 L34 15 L25 22 L28 33 L20 27 L12 33 L15 22 L6 15 L17 15Z"
        fill={color}
        opacity="0.5"
      />
      <path
        d="M20 8 L22 16 L30 16 L24 21 L26 29 L20 25 L14 29 L16 21 L10 16 L18 16Z"
        fill={color}
        opacity="0.3"
      />
      <circle cx="20" cy="18" r="2" fill="white" opacity="0.3" />
    </svg>
  ),
  // Fish
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="20" rx="13" ry="8" fill={color} opacity="0.5" />
      <path d="M6 20 L2 12 L2 28Z" fill={color} opacity="0.4" />
      <circle cx="28" cy="18" r="2" fill="white" opacity="0.8" />
      <circle cx="28.5" cy="18" r="1" fill={color} />
      <path
        d="M14 16 Q20 12 26 16"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />
    </svg>
  ),
  // Crab
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="20" cy="22" rx="10" ry="7" fill={color} opacity="0.5" />
      <circle cx="15" cy="16" r="3" fill={color} opacity="0.4" />
      <circle cx="25" cy="16" r="3" fill={color} opacity="0.4" />
      <circle cx="15" cy="15" r="1.5" fill="white" opacity="0.8" />
      <circle cx="25" cy="15" r="1.5" fill="white" opacity="0.8" />
      <path
        d="M10 20 Q4 16 6 12"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M30 20 Q36 16 34 12"
        stroke={color}
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <circle cx="6" cy="11" r="2" fill={color} opacity="0.3" />
      <circle cx="34" cy="11" r="2" fill={color} opacity="0.3" />
    </svg>
  ),
  // Whale
  (color: string) => (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="18" cy="22" rx="14" ry="8" fill={color} opacity="0.5" />
      <path d="M32 22 Q38 16 36 22 Q38 28 32 22Z" fill={color} opacity="0.4" />
      <circle cx="10" cy="20" r="2" fill="white" opacity="0.8" />
      <circle cx="10" cy="20.5" r="1" fill={color} />
      <path
        d="M18 14 Q20 8 22 14"
        stroke={color}
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />
    </svg>
  ),
];

const CREATURE_COLORS = [
  "#3dd6b5", // turquoise
  "#60a5fa", // blue
  "#a78bfa", // purple
  "#f59e0b", // amber
  "#f472b6", // pink
  "#34d399", // emerald
  "#fb923c", // orange
  "#38bdf8", // sky
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

interface OceanAvatarProps {
  userId: string;
  size?: number;
  isOnline?: boolean;
  className?: string;
}

export function OceanAvatar({
  userId,
  size = 40,
  isOnline,
  className = "",
}: OceanAvatarProps) {
  const hash = hashString(userId);
  const creatureIdx = hash % OCEAN_CREATURES.length;
  const colorIdx = (hash >> 4) % CREATURE_COLORS.length;
  const color = CREATURE_COLORS[colorIdx];
  const CreatureSVG = OCEAN_CREATURES[creatureIdx];

  return (
    <div
      className={`relative shrink-0 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <div style={{ width: size * 0.75, height: size * 0.75 }}>
        {CreatureSVG(color)}
      </div>
      {isOnline && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[var(--midnight)] animate-pulse" />
      )}
    </div>
  );
}
