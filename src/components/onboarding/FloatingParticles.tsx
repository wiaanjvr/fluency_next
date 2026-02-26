"use client";

import { useEffect, useRef } from "react";

const NUM_PARTICLES = 18;

interface Particle {
  x: number;
  y: number;
  radius: number;
  /** px/frame upward speed */
  speed: number;
  /** current rendered opacity */
  opacity: number;
  /** peak white opacity (5–11%, avg ~8%) */
  baseOpacity: number;
  /** opacity step per frame during fade-in / fade-out */
  fadeStep: number;
}

/**
 * Full-screen canvas of slowly-rising white bubbles.
 *
 * Performance notes:
 * - Single canvas element, `will-change: transform` to promote to its own layer
 * - All work runs inside requestAnimationFrame — never blocks the main thread
 * - Particle count: 18 (spec: 15-20)
 * - Dot diameter: 1.5–3px, white at 5–11% opacity (avg ≈ 8%)
 */
export function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let particles: Particle[] = [];

    // ── Helpers ──────────────────────────────────────────────────────────
    const rand = (min: number, max: number) =>
      min + Math.random() * (max - min);

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const spawnParticle = (spreadY = false): Particle => ({
      x: rand(0, canvas.width),
      // On initial spawn, spread vertically so screen isn't empty at start.
      // On respawn, start just below the viewport.
      y: spreadY ? rand(0, canvas.height) : canvas.height + rand(4, 24),
      radius: rand(0.75, 1.5), // 1.5 – 3px diameter
      speed: rand(0.25, 0.55), // gentle drift
      opacity: 0,
      baseOpacity: rand(0.05, 0.11), // 5 – 11%
      fadeStep: rand(0.001, 0.003),
    });

    const initParticles = () => {
      particles = Array.from({ length: NUM_PARTICLES }, () =>
        spawnParticle(true),
      );
    };

    // ── Draw loop ─────────────────────────────────────────────────────────
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Move upward
        p.y -= p.speed;

        // Normalised vertical progress (0 = at bottom, 1 = at top)
        const progress = 1 - p.y / canvas.height;

        // Fade in for the first 20% of travel
        if (progress < 0.2) {
          p.opacity = Math.min(p.baseOpacity, p.opacity + p.fadeStep);
        }
        // Fade out for the last 25% of travel
        else if (progress > 0.75) {
          p.opacity = Math.max(0, p.opacity - p.fadeStep * 1.5);
        }

        // Respawn when fully off-screen
        if (p.y < -p.radius * 2) {
          const next = spawnParticle(false);
          p.x = next.x;
          p.y = next.y;
          p.radius = next.radius;
          p.speed = next.speed;
          p.baseOpacity = next.baseOpacity;
          p.fadeStep = next.fadeStep;
          p.opacity = 0;
        }

        // Paint
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity.toFixed(3)})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    // ── Init ──────────────────────────────────────────────────────────────
    setSize();
    initParticles();
    rafId = requestAnimationFrame(draw);

    const handleResize = () => setSize();
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        willChange: "transform", // compositor layer — keeps animation off main thread
      }}
    />
  );
}
