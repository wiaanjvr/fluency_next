"use client";

import React, { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getDepthLevel, type DepthLevel } from "@/lib/progression/depthLevels";

// ============================================================================
// DepthAmbience — Fixed full-screen ambient background layer
// Radial gradient + floating particles that change with depth level.
// pointer-events: none, z-index: 0.
// Performance: max 30 particles, will-change only on animated elements.
// ============================================================================

interface DepthAmbienceProps {
  wordCount: number;
}

// ─── Particle types ─────────────────────────────────────────────────────────

interface ParticleConfig {
  id: number;
  x: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  opacity: number;
  drift: number; // horizontal drift in px
}

function generateParticles(count: number): ParticleConfig[] {
  const particles: ParticleConfig[] = [];
  const capped = Math.min(count, 30); // Performance cap

  for (let i = 0; i < capped; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 4 + 1.5,
      duration: Math.random() * 12 + 8, // 8-20s
      delay: Math.random() * 6,
      opacity: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 60,
    });
  }

  return particles;
}

// ─── Floating particle ─────────────────────────────────────────────────────

function AmbientParticle({
  config,
  color,
}: {
  config: ParticleConfig;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: `${config.x}%`,
        bottom: -10,
        width: config.size,
        height: config.size,
        background: color,
        opacity: 0,
        willChange: "transform",
      }}
      animate={{
        y: [
          0,
          -(typeof window !== "undefined" ? window.innerHeight + 20 : 900),
        ],
        x: [0, config.drift],
        opacity: [0, config.opacity, config.opacity, 0],
      }}
      transition={{
        duration: config.duration,
        delay: config.delay,
        repeat: Infinity,
        ease: "linear",
      }}
      aria-hidden="true"
    />
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DepthAmbience({ wordCount }: DepthAmbienceProps) {
  const level = getDepthLevel(wordCount);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Stable particle configs — only regenerate when particle count changes
  const particles = useMemo(
    () => generateParticles(level.ambientParticleCount),
    [level.ambientParticleCount],
  );

  // Choose particle color — mix of primary and secondary
  const particleColor = useMemo(() => {
    // Deeper levels get dimmer particles
    const alpha = level.id <= 2 ? "40" : level.id <= 3 ? "30" : "20";
    return `${level.colorPrimaryHex}${alpha}`;
  }, [level]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        pointerEvents: "none",
        zIndex: 0,
        // The gradient shift uses CSS transition for smooth 2s change
        background: level.backgroundGradient,
        transition: "background 2s ease",
      }}
      aria-hidden="true"
    >
      {/* Particles */}
      {particles.map((p) => (
        <AmbientParticle key={p.id} config={p} color={particleColor} />
      ))}

      {/* Subtle vignette overlay — more pronounced at deeper levels */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,${0.1 + level.id * 0.08}) 100%)`,
          transition: "background 2s ease",
        }}
      />
    </div>
  );
}

export default DepthAmbience;
