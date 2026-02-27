"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DepthLevel } from "@/lib/progression/depthLevels";

// ============================================================================
// LevelUpModal — Full-screen celebration when crossing a depth threshold
// Dramatic depth-transition: color shift, particles, level name reveal.
// ============================================================================

interface LevelUpModalProps {
  isOpen: boolean;
  previousLevel: DepthLevel | null;
  newLevel: DepthLevel;
  onDismiss: () => void;
}

// ─── Simple CSS particle system ─────────────────────────────────────────────

function DescendingParticles({ level }: { level: DepthLevel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      color: string;
    }

    const particleCount = Math.min(level.ambientParticleCount * 2, 60);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedY: -(Math.random() * 1.5 + 0.3), // Rise upward (bubbles)
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color:
          Math.random() > 0.5 ? level.colorPrimaryHex : level.colorSecondaryHex,
      });
    }

    let rafId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX;

        // Wrap around
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [level]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────

export function LevelUpModal({
  isOpen,
  previousLevel,
  newLevel,
  onDismiss,
}: LevelUpModalProps) {
  // Trap focus when open
  const dismissRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && dismissRef.current) {
      // Focus the button after animations settle
      const timer = setTimeout(() => dismissRef.current?.focus(), 1600);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onDismiss]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Level up! You've reached ${newLevel.name}`}
        >
          {/* Background color transition */}
          <motion.div
            className="absolute inset-0"
            initial={{
              background: previousLevel
                ? `radial-gradient(ellipse at 50% 50%, ${previousLevel.colorPrimaryHex}30 0%, #020F14 70%)`
                : "#020F14",
            }}
            animate={{
              background: `radial-gradient(ellipse at 50% 50%, ${newLevel.colorPrimaryHex}20 0%, #020F14 70%)`,
            }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />

          {/* Particle canvas */}
          <DescendingParticles level={newLevel} />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-lg">
            {/* Depth marker line */}
            <motion.div
              className="w-px bg-gradient-to-b mb-8"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 80, opacity: 0.4 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{
                backgroundImage: `linear-gradient(to bottom, transparent, ${newLevel.colorPrimaryHex})`,
              }}
            />

            {/* Depth number */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{
                  fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
                  color: newLevel.colorPrimaryHex,
                  opacity: 0.6,
                }}
              >
                Depth {newLevel.id}
              </span>
            </motion.div>

            {/* Level name — dramatic entrance */}
            <motion.h1
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.9,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="mt-3 mb-4"
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                fontWeight: 700,
                fontStyle: "italic",
                color: "var(--text-primary, #F0FDFA)",
                textShadow: `0 0 40px ${newLevel.colorPrimaryHex}40`,
                lineHeight: 1.1,
              }}
            >
              {newLevel.name}
            </motion.h1>

            {/* Environment description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.3 }}
              className="mb-2"
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontSize: "clamp(0.875rem, 2vw, 1rem)",
                fontStyle: "italic",
                color: "var(--text-secondary, #7BA8A0)",
                lineHeight: 1.8,
                maxWidth: 400,
              }}
            >
              {newLevel.environmentDescription}
            </motion.p>

            {/* Level description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.6 }}
              className="text-sm mb-10"
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                color: "var(--text-ghost, #2D5A52)",
                lineHeight: 1.7,
                maxWidth: 360,
              }}
            >
              {newLevel.description}
            </motion.p>

            {/* Continue diving button */}
            <motion.button
              ref={dismissRef}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.8 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onDismiss}
              className="px-8 py-3-5 rounded-xl text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                padding: "14px 32px",
                color: "#020F14",
                background: `linear-gradient(135deg, ${newLevel.colorPrimaryHex}, ${newLevel.colorSecondaryHex})`,
                boxShadow: `0 4px 24px ${newLevel.colorPrimaryHex}40, 0 0 48px ${newLevel.colorPrimaryHex}15`,
              }}
            >
              Continue diving
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LevelUpModal;
