"use client";

import { motion } from "framer-motion";

interface DepthGaugeProps {
  value: number; // current ELO or score
  max?: number;
  label?: string;
  unit?: string;
  height?: number;
}

function getRankTitle(elo: number): string {
  if (elo >= 1400) return "Abyssal Champion";
  if (elo >= 1201) return "Bathypelagic Challenger";
  if (elo >= 1001) return "Open Water Diver";
  if (elo >= 801) return "Reef Explorer";
  return "Surface Swimmer";
}

export default function DepthGauge({
  value,
  max = 2000,
  label = "Pressure Rating",
  unit = "atm",
  height = 280,
}: DepthGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const rankTitle = getRankTitle(value);

  return (
    <div className="flex flex-col items-center gap-3" style={{ height }}>
      {/* Label */}
      <div className="text-center">
        <span
          className="font-body text-[10px] uppercase tracking-widest block"
          style={{ color: "#718096" }}
        >
          {label}
        </span>
        <span
          className="font-body text-[10px] block mt-0.5"
          style={{ color: "rgba(61, 214, 181, 0.6)" }}
        >
          {rankTitle}
        </span>
      </div>

      {/* Gauge */}
      <div
        className="relative w-3 flex-1 rounded-full overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Fill */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          initial={{ height: "0%" }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          style={{
            background:
              "linear-gradient(to top, #1e6b72 0%, #3dd6b5 60%, #3dd6b5 100%)",
            boxShadow: "0 0 12px rgba(61, 214, 181, 0.4)",
          }}
        />

        {/* Tick marks */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 h-px"
            style={{
              bottom: `${tick}%`,
              background: "rgba(255, 255, 255, 0.1)",
            }}
          />
        ))}

        {/* Glow dot at top of fill */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          initial={{ bottom: "0%" }}
          animate={{ bottom: `${percentage}%` }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          style={{
            background: "#3dd6b5",
            boxShadow: "0 0 8px rgba(61, 214, 181, 0.8)",
            marginBottom: "-4px",
          }}
        />
      </div>

      {/* Value */}
      <div className="text-center">
        <span
          className="font-display text-xl font-bold block"
          style={{ color: "#f7fafc" }}
        >
          {value}
        </span>
        <span
          className="font-body text-[10px] uppercase tracking-wider"
          style={{ color: "#718096" }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
