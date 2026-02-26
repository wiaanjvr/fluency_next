"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Animates a number from 0 up to `end` over `duration` ms.
 * Triggers on mount or whenever `end` changes.
 */
export function useCountUp(end: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    if (end === 0) {
      setValue(0);
      return;
    }

    const startVal = 0;
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startVal + (end - startVal) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration]);

  return value;
}

/**
 * Manages floating "+X DP" animation triggers.
 * Returns a trigger function and active floats array.
 */
export function useFloatingPoints() {
  const [floats, setFloats] = useState<
    { id: string; points: number; x: number; y: number }[]
  >([]);

  const trigger = useCallback((points: number, x: number, y: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setFloats((prev) => [...prev, { id, points, x, y }]);
    setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 1200);
  }, []);

  return { floats, trigger };
}
