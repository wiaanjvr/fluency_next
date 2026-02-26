"use client";

import { useEffect, useState } from "react";

/**
 * Ocean ambient background: subtle light rays + floating bubbles.
 * Renders behind all content, purely CSS-driven for performance.
 */
export function OceanAmbient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Light rays */}
      {[0, 1, 2].map((i) => (
        <div
          key={`ray-${i}`}
          className="absolute top-0 opacity-[0.03]"
          style={{
            left: `${20 + i * 30}%`,
            width: "2px",
            height: "100%",
            background:
              "linear-gradient(180deg, rgba(61,214,181,0.6) 0%, transparent 70%)",
            transform: `rotate(${-8 + i * 8}deg)`,
            transformOrigin: "top center",
            animation: `lightRayDrift ${12 + i * 4}s ease-in-out infinite alternate`,
          }}
        />
      ))}

      {/* Bubbles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`bubble-${i}`}
          className="absolute rounded-full bg-teal-400/[0.05] border border-teal-400/[0.08]"
          style={{
            left: `${10 + ((i * 11) % 80)}%`,
            bottom: `-${4 + ((i * 7) % 20)}px`,
            width: `${3 + (i % 4) * 2}px`,
            height: `${3 + (i % 4) * 2}px`,
            animation: `bubbleRise ${15 + i * 3}s linear infinite`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes lightRayDrift {
          0% {
            transform: rotate(-10deg) translateX(-20px);
            opacity: 0.02;
          }
          50% {
            opacity: 0.04;
          }
          100% {
            transform: rotate(10deg) translateX(20px);
            opacity: 0.02;
          }
        }
        @keyframes bubbleRise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.06;
          }
          90% {
            opacity: 0.04;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
