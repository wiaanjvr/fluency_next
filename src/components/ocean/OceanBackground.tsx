"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Ocean Background - The Living, Breathing Ocean
// 4 Layers: Sky/Surface, Water Surface Waves, Mid-Water, The Deep
// ============================================================================

interface OceanBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function OceanBackground({ className, children }: OceanBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Generate random bubbles
  const bubbles = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 8 + Math.random() * 7,
    delay: Math.random() * 10,
    opacity: 0.06 + Math.random() * 0.06,
  }));

  // Generate bioluminescent dots for the deep
  const bioDots = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    bottom: 5 + Math.random() * 15,
    size: 2 + Math.random() * 2,
    delay: Math.random() * 4,
  }));

  // Generate light rays
  const lightRays = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    left: 10 + i * 20 + Math.random() * 10,
    delay: i * 2,
    opacity: 0.03 + Math.random() * 0.03,
  }));

  // Generate crepuscular rays
  const crepuscularRays = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    left: 15 + i * 25,
    width: 60 + Math.random() * 40,
    delay: i * 2,
  }));

  return (
    <div
      ref={containerRef}
      className={cn("relative min-h-screen overflow-visible", className)}
      style={{
        // Pressure gradient — background darkens with depth, visible through semi-transparent cards
        background:
          "linear-gradient(180deg, #0d1929 0%, #080f1e 30%, #050b16 65%, #020709 100%)",
      }}
    >
      {/* ===== LAYER 1: Sky/Surface (top 15%) ===== */}
      <div
        className="absolute inset-x-0 top-0 h-[18%] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%)`,
          transform: `translateY(${scrollY * 0.3}px)`,
        }}
      >
        {/* Light Rays */}
        {lightRays.map((ray) => (
          <div
            key={ray.id}
            className="light-ray"
            style={{
              left: `${ray.left}%`,
              top: "-50%",
              opacity: ray.opacity,
              animationDelay: `${ray.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ===== LAYER 2: Water Surface Waves (18-22% from top) ===== */}
      <div
        className="absolute inset-x-0 wave-container pointer-events-none"
        style={{
          top: "17%",
          height: "6%",
          transform: `translateY(${scrollY * 0.25}px)`,
        }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          {/* Wave 1 - primary */}
          <path
            className="wave-path"
            d="M0,30 Q150,10 300,30 T600,30 T900,30 T1200,30"
            fill="none"
            stroke="rgba(61, 214, 181, 0.15)"
            strokeWidth="1.5"
          />
          {/* Wave 2 - secondary */}
          <path
            className="wave-path"
            d="M0,35 Q150,50 300,35 T600,35 T900,35 T1200,35"
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            style={{ animationDelay: "-2s" }}
          />
        </svg>
      </div>

      {/* ===== LAYER 3: Mid-Water (main content zone) ===== */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center 40%, var(--deep-navy) 0%, var(--midnight) 70%)`,
        }}
      >
        {/* Floating Bubbles */}
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="bubble"
            style={{
              left: `${bubble.left}%`,
              bottom: "-20px",
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              opacity: bubble.opacity,
              animationDuration: `${bubble.duration}s`,
              animationDelay: `${bubble.delay}s`,
            }}
          />
        ))}

        {/* Crepuscular Rays */}
        {crepuscularRays.map((ray) => (
          <div
            key={ray.id}
            className="crepuscular-ray"
            style={{
              left: `${ray.left}%`,
              top: "15%",
              width: `${ray.width}px`,
              height: "60%",
              animationDelay: `${ray.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ===== LAYER 4: The Deep (bottom 20%) ===== */}
      <div
        className="absolute inset-x-0 bottom-0 h-[25%] pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 0%, var(--abyss) 100%)`,
          transform: `translateY(${-scrollY * 0.1}px)`,
        }}
      >
        {/* Seabed Silhouette */}
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          style={{ height: "60%" }}
        >
          <path
            d="M0,120 L0,80 Q100,60 200,75 Q350,95 500,70 Q650,45 800,65 Q950,85 1100,55 Q1150,45 1200,60 L1200,120 Z"
            fill="var(--seabed)"
            opacity="0.4"
          />
        </svg>

        {/* Bioluminescent Points */}
        {bioDots.map((dot) => (
          <div
            key={dot.id}
            className="bio-dot"
            style={{
              left: `${dot.left}%`,
              bottom: `${dot.bottom}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: `${dot.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Content Layer */}
      {children && <div className="relative z-10 min-h-screen">{children}</div>}
    </div>
  );
}

export default OceanBackground;
