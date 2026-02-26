"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Particle } from "@/hooks/useParticleBurst";

/* =============================================================================
   ParticleBurst — Renders animated particle divs for celebration effects
   
   Uses absolute positioning with randomized trajectories. Each particle
   flies outward from the origin point with physics-based movement.
============================================================================= */

interface ParticleBurstProps {
  particles: Particle[];
  isActive: boolean;
}

export function ParticleBurst({ particles, isActive }: ParticleBurstProps) {
  if (!isActive || particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => {
          const rad = (p.angle * Math.PI) / 180;
          const endX = Math.cos(rad) * p.speed;
          const endY = Math.sin(rad) * p.speed - 100; // bias upward

          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 0.2,
                x: endX,
                y: endY,
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.6,
                delay: p.delay / 1000,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
