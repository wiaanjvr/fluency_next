"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { DuelCategory } from "@/types/duel";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/duel";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryWheelProps {
  categories: DuelCategory[];
  results?: (boolean | null)[];
  size?: number;
  label?: string;
  mini?: boolean;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

/** Closed donut arc path — fill-able segment */
function donutPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const s = rad(startDeg);
  const e = rad(endDeg);
  const la = endDeg - startDeg > 180 ? 1 : 0;
  const ox1 = cx + outerR * Math.cos(s);
  const oy1 = cy + outerR * Math.sin(s);
  const ox2 = cx + outerR * Math.cos(e);
  const oy2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(e);
  const iy1 = cy + innerR * Math.sin(e);
  const ix2 = cx + innerR * Math.cos(s);
  const iy2 = cy + innerR * Math.sin(s);
  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${la} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${la} 0 ${ix2} ${iy2}`,
    `Z`,
  ].join(" ");
}

/** Open arc stroke — used for Framer Motion pathLength animation */
function arcStroke(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const s = rad(startDeg);
  const e = rad(endDeg);
  const la = endDeg - startDeg > 180 ? 1 : 0;
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${la} 1 ${x2} ${y2}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoryWheel({
  categories,
  results,
  size = 160,
  label,
  mini = false,
}: CategoryWheelProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const cx = size / 2;
  const cy = size / 2;

  const segments = useMemo(() => {
    const count = categories.length;
    const sweep = 360 / count;
    const gap = mini ? 2 : 3;
    const innerR = cx * (mini ? 0.5 : 0.42);
    const outerR = cx * (mini ? 0.95 : 0.92);

    return categories.map((cat, i) => {
      const startDeg = i * sweep - 90 + gap / 2;
      const endDeg = startDeg + sweep - gap;
      const midRad = (((startDeg + endDeg) / 2) * Math.PI) / 180;
      const labelR = (innerR + outerR) / 2;
      return {
        i,
        cat,
        color: CATEGORY_COLORS[cat],
        result: results?.[i] ?? null,
        fillPath: donutPath(cx, cy, innerR, outerR, startDeg, endDeg),
        outerArc: arcStroke(cx, cy, outerR - 1.5, startDeg, endDeg),
        innerArc: arcStroke(cx, cy, innerR + 1, startDeg, endDeg),
        lx: cx + labelR * Math.cos(midRad),
        ly: cy + labelR * Math.sin(midRad),
      };
    });
  }, [categories, results, cx, cy, mini]);

  // ─── Mini variant ─────────────────────────────────────────────────────────

  if (mini) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {segments.map((seg) => (
          <path
            key={seg.i}
            d={seg.fillPath}
            fill={
              seg.result === true
                ? seg.color
                : seg.result === false
                  ? `${seg.color}22`
                  : "rgba(255,255,255,0.04)"
            }
            stroke={
              seg.result === true ? `${seg.color}90` : "rgba(255,255,255,0.07)"
            }
            strokeWidth={0.5}
          />
        ))}
      </svg>
    );
  }

  // ─── Full variant ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-3 relative select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        overflow="visible"
        aria-label="Category progress wheel"
      >
        {/* ── Per-segment SVG filters ── */}
        <defs>
          {/* Colour glow — applied to correct fills */}
          {segments.map((seg) => (
            <filter
              key={`gf-${seg.i}`}
              id={`segGlow-${seg.i}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="5"
                result="blur"
              />
              <feFlood
                floodColor={seg.color}
                floodOpacity="0.65"
                result="flood"
              />
              <feComposite in="flood" in2="blur" operator="in" result="halo" />
              <feMerge>
                <feMergeNode in="halo" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          {/* Soft blur — applied to pathLength arc strokes */}
          {segments.map((seg) => (
            <filter
              key={`ag-${seg.i}`}
              id={`arcGlow-${seg.i}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="2.5"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Layer 0 — ghost track (always visible) */}
        {segments.map((seg) => (
          <path
            key={`ghost-${seg.i}`}
            d={seg.fillPath}
            fill="rgba(255,255,255,0.025)"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={0.5}
          />
        ))}

        {/* Layer 1 — animated fills + pathLength arc edges */}
        {segments.map((seg) => {
          const isCorrect = seg.result === true;
          const isWrong = seg.result === false;
          const isHov = hovered === seg.i;

          return (
            <motion.g
              key={`seg-${seg.i}`}
              onMouseEnter={() => setHovered(seg.i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Filled donut path */}
              <motion.path
                d={seg.fillPath}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                fill={seg.color}
                stroke={
                  isCorrect
                    ? `${seg.color}bb`
                    : isHov
                      ? `${seg.color}44`
                      : "transparent"
                }
                strokeWidth={isCorrect ? 1 : 1.5}
                filter={isCorrect ? `url(#segGlow-${seg.i})` : undefined}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{
                  opacity: isCorrect ? 0.88 : isWrong ? 0.22 : isHov ? 0.12 : 0,
                  scale: isHov && !isCorrect ? 1.04 : 1,
                }}
                transition={{
                  opacity: {
                    duration: 0.55,
                    delay: seg.i * 0.07,
                    ease: [0.4, 0, 0.2, 1],
                  },
                  scale: { type: "spring", stiffness: 380, damping: 22 },
                }}
              />

              {/* pathLength outer arc sweep — correct segments */}
              {isCorrect && (
                <motion.path
                  d={seg.outerArc}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  filter={`url(#arcGlow-${seg.i})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    pathLength: {
                      duration: 0.75,
                      delay: seg.i * 0.07 + 0.25,
                      ease: "easeOut",
                    },
                    opacity: { duration: 0.25, delay: seg.i * 0.07 + 0.25 },
                  }}
                />
              )}

              {/* pathLength inner arc — wrong segments (dashed) */}
              {isWrong && (
                <motion.path
                  d={seg.innerArc}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray="3 5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.45 }}
                  transition={{
                    pathLength: {
                      duration: 0.5,
                      delay: seg.i * 0.07 + 0.1,
                      ease: "easeOut",
                    },
                    opacity: { duration: 0.25, delay: seg.i * 0.07 + 0.1 },
                  }}
                />
              )}

              {/* Label icons */}
              {isCorrect && (
                <motion.text
                  x={seg.lx}
                  y={seg.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.082}
                  fill="white"
                  fontWeight="700"
                  style={{ transformOrigin: `${seg.lx}px ${seg.ly}px` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: seg.i * 0.07 + 0.55,
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                  }}
                >
                  ✓
                </motion.text>
              )}

              {isWrong && (
                <motion.text
                  x={seg.lx}
                  y={seg.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={size * 0.072}
                  fill={seg.color}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.65 }}
                  transition={{ delay: seg.i * 0.07 + 0.2, duration: 0.3 }}
                >
                  ✗
                </motion.text>
              )}

              {!isCorrect && !isWrong && (
                <motion.circle
                  cx={seg.lx}
                  cy={seg.ly}
                  r={size * 0.022}
                  fill={seg.color}
                  style={{ transformOrigin: `${seg.lx}px ${seg.ly}px` }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 0.28, scale: 1 }}
                  transition={{
                    delay: seg.i * 0.07 + 0.1,
                    type: "spring",
                    stiffness: 300,
                    damping: 18,
                  }}
                />
              )}
            </motion.g>
          );
        })}

        {/* Centre disc */}
        <circle
          cx={cx}
          cy={cy}
          r={cx * 0.33}
          fill="#0a0f1e"
          stroke="rgba(61,214,181,0.12)"
          strokeWidth={1}
        />
        <motion.text
          x={cx}
          y={cy + 1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.15}
          fill="#3dd6b5"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            duration: 0.45,
            delay: 0.1,
            ease: [0.34, 1.56, 0.64, 1],
          }}
        >
          ⚔
        </motion.text>
      </svg>

      {/* Hover tooltip */}
      {hovered !== null && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full px-3 py-1.5 rounded-lg font-body text-xs whitespace-nowrap z-10 pointer-events-none"
          style={{
            background: "rgba(13,27,42,0.96)",
            border: `1px solid ${segments[hovered].color}44`,
            color: segments[hovered].color,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          }}
        >
          {CATEGORY_LABELS[segments[hovered].cat]}
        </div>
      )}

      {label && (
        <span
          className="font-body text-xs font-medium"
          style={{ color: "#718096" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
