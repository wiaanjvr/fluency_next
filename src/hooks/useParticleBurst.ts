"use client";

import { useState, useCallback, useRef } from "react";

/* =============================================================================
   useParticleBurst — Manages particle animation state for celebration effects
   
   Spawns 30–50 absolutely positioned divs with randomized trajectories
   and fade-out transitions. Used for reward claims and gameboard reveals.
============================================================================= */

export interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  delay: number;
}

interface UseParticleBurstReturn {
  particles: Particle[];
  isActive: boolean;
  triggerBurst: (originX: number, originY: number) => void;
  clearParticles: () => void;
}

const PARTICLE_COLORS = [
  "#0d9488", // teal
  "#06b6d4", // cyan
  "#14b8a6", // teal-400
  "#22d3ee", // cyan-400
  "#67e8f9", // cyan-300
  "#5eead4", // teal-300
  "#a7f3d0", // emerald-200
  "#fcd34d", // amber-300
];

export function useParticleBurst(): UseParticleBurstReturn {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idCounter = useRef(0);

  const triggerBurst = useCallback((originX: number, originY: number) => {
    const count = 30 + Math.floor(Math.random() * 20); // 30–50
    const newParticles: Particle[] = Array.from({ length: count }, () => {
      idCounter.current += 1;
      return {
        id: idCounter.current,
        x: originX,
        y: originY,
        angle: Math.random() * 360,
        speed: 80 + Math.random() * 200,
        size: 4 + Math.random() * 8,
        color:
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        delay: Math.random() * 100,
      };
    });

    setParticles(newParticles);
    setIsActive(true);

    // Auto-clear after animation completes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setParticles([]);
      setIsActive(false);
    }, 1500);
  }, []);

  const clearParticles = useCallback(() => {
    setParticles([]);
    setIsActive(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { particles, isActive, triggerBurst, clearParticles };
}
