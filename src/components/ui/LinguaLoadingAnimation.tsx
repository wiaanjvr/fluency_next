"use client";

import React, { useEffect, useState } from "react";

interface LinguaLoadingAnimationProps {
  message?: string;
  showProgress?: boolean;
}

export function LinguaLoadingAnimation({
  message = "Loading...",
  showProgress = true,
}: LinguaLoadingAnimationProps) {
  const [progress, setProgress] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Calculate how much of the letters to show based on progress
  const drawProgress = progress / 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <svg
          width="500"
          height="300"
          viewBox="0 0 500 300"
          className="max-w-[90%] h-auto"
        >
          {/* Globe symbol above */}
          <circle
            cx="250"
            cy="60"
            r="30"
            fill="none"
            stroke="hsl(var(--library-brass))"
            strokeWidth="2"
            opacity={drawProgress > 0.9 ? (drawProgress - 0.9) * 10 : 0}
          />
          <line
            x1="250"
            y1="30"
            x2="250"
            y2="90"
            stroke="hsl(var(--library-brass))"
            strokeWidth="2"
            opacity={drawProgress > 0.9 ? (drawProgress - 0.9) * 10 : 0}
          />
          <line
            x1="220"
            y1="60"
            x2="280"
            y2="60"
            stroke="hsl(var(--library-brass))"
            strokeWidth="2"
            opacity={drawProgress > 0.9 ? (drawProgress - 0.9) * 10 : 0}
          />
          <ellipse
            cx="250"
            cy="60"
            rx="15"
            ry="30"
            fill="none"
            stroke="hsl(var(--library-brass))"
            strokeWidth="2"
            opacity={drawProgress > 0.9 ? (drawProgress - 0.9) * 10 : 0}
          />

          {/* Letter F with glow, fixed segment timing */}
          <g>
            {/* Glow for F vertical */}
            <path
              d="M 80 120 L 80 260"
              fill="none"
              stroke="url(#greenGlow)"
              strokeWidth="28"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={140 - 140 * Math.min(drawProgress * 2, 1)}
              opacity="0.25"
              filter="url(#glow)"
            />
            {/* Main F vertical */}
            <path
              d="M 80 120 L 80 260"
              fill="none"
              stroke="url(#greenGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={140 - 140 * Math.min(drawProgress * 2, 1)}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            {/* Top horizontal of F with glow */}
            <path
              d="M 80 120 L 160 120"
              fill="none"
              stroke="url(#greenGlow)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeDasharray="80"
              strokeDashoffset={
                drawProgress > 0.2
                  ? 80 - 80 * Math.min((drawProgress - 0.2) * 5, 1)
                  : 80
              }
              opacity="0.18"
              filter="url(#glow)"
            />
            {/* Main F top horizontal */}
            <path
              d="M 80 120 L 160 120"
              fill="none"
              stroke="url(#greenGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="80"
              strokeDashoffset={
                drawProgress > 0.2
                  ? 80 - 80 * Math.min((drawProgress - 0.2) * 5, 1)
                  : 80
              }
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            {/* Middle horizontal of F with glow */}
            <path
              d="M 80 180 L 140 180"
              fill="none"
              stroke="url(#greenGlow)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset={
                drawProgress > 0.35
                  ? 60 - 60 * Math.min((drawProgress - 0.35) * 5, 1)
                  : 60
              }
              opacity="0.18"
              filter="url(#glow)"
            />
            {/* Main F middle horizontal */}
            <path
              d="M 80 180 L 140 180"
              fill="none"
              stroke="url(#greenGradient)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="60"
              strokeDashoffset={
                drawProgress > 0.35
                  ? 60 - 60 * Math.min((drawProgress - 0.35) * 5, 1)
                  : 60
              }
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </g>

          {/* Letter N with glow, fixed segment timing */}
          <g>
            {/* Glow for N left vertical */}
            <path
              d="M 340 120 L 340 260"
              fill="none"
              stroke="url(#goldGlow)"
              strokeWidth="28"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={
                drawProgress > 0.5
                  ? 140 - 140 * Math.min((drawProgress - 0.5) * 4, 1)
                  : 140
              }
              opacity="0.22"
              filter="url(#glow)"
            />
            {/* Main N left vertical */}
            <path
              d="M 340 120 L 340 260"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={
                drawProgress > 0.5
                  ? 140 - 140 * Math.min((drawProgress - 0.5) * 4, 1)
                  : 140
              }
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            {/* Glow for N diagonal */}
            <path
              d="M 340 120 L 420 260"
              fill="none"
              stroke="url(#goldGlow)"
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray="170"
              strokeDashoffset={
                drawProgress > 0.65
                  ? 170 - 170 * Math.min((drawProgress - 0.65) * 4, 1)
                  : 170
              }
              opacity="0.18"
              filter="url(#glow)"
            />
            {/* Main N diagonal */}
            <path
              d="M 340 120 L 420 260"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="170"
              strokeDashoffset={
                drawProgress > 0.65
                  ? 170 - 170 * Math.min((drawProgress - 0.65) * 4, 1)
                  : 170
              }
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
            {/* Glow for N right vertical */}
            <path
              d="M 420 120 L 420 260"
              fill="none"
              stroke="url(#goldGlow)"
              strokeWidth="28"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={
                drawProgress > 0.8
                  ? 140 - 140 * Math.min((drawProgress - 0.8) * 5, 1)
                  : 140
              }
              opacity="0.22"
              filter="url(#glow)"
            />
            {/* Main N right vertical */}
            <path
              d="M 420 120 L 420 260"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray="140"
              strokeDashoffset={
                drawProgress > 0.8
                  ? 140 - 140 * Math.min((drawProgress - 0.8) * 5, 1)
                  : 140
              }
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient
              id="greenGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#2d5016" />
              <stop offset="50%" stopColor="#4a7c2e" />
              <stop offset="100%" stopColor="#6ba854" />
            </linearGradient>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b8860b" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#f4d03f" />
            </linearGradient>
            <linearGradient id="greenGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b6ffb6" />
              <stop offset="100%" stopColor="#6ba854" />
            </linearGradient>
            <linearGradient id="goldGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff2b2" />
              <stop offset="100%" stopColor="#f4d03f" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Animated shimmer/glow effect at the drawing point */}
          {drawProgress < 0.95 && (
            <>
              {/* Shimmer on F */}
              {drawProgress < 0.5 && (
                <circle
                  cx={
                    drawProgress < 0.25
                      ? 80
                      : drawProgress < 0.4
                        ? drawProgress > 0.25
                          ? 80 + ((drawProgress - 0.25) / 0.15) * 80
                          : 80
                        : 80 + ((drawProgress - 0.4) / 0.1) * 60
                  }
                  cy={
                    drawProgress < 0.25
                      ? 120 + drawProgress * 2.5 * 140
                      : drawProgress < 0.4
                        ? 120
                        : 180
                  }
                  r="8"
                  fill="#6ba854"
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="8;12;8"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;1;0.8"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
              {/* Shimmer on N */}
              {drawProgress >= 0.5 && drawProgress < 0.95 && (
                <circle
                  cx={
                    drawProgress < 0.65
                      ? 340
                      : drawProgress < 0.8
                        ? 340 + ((drawProgress - 0.65) / 0.15) * 80
                        : 420
                  }
                  cy={
                    drawProgress < 0.65
                      ? 120 + ((drawProgress - 0.5) / 0.15) * 140
                      : drawProgress < 0.8
                        ? 120 + ((drawProgress - 0.65) / 0.15) * 140
                        : 120 + ((drawProgress - 0.8) / 0.15) * 140
                  }
                  r="8"
                  fill="#f4d03f"
                  opacity="0.8"
                >
                  <animate
                    attributeName="r"
                    values="8;12;8"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;1;0.8"
                    dur="0.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </>
          )}
        </svg>

        {/* Progress bar */}
        {showProgress && (
          <div className="w-[300px] max-w-[90%] h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-library-brass to-library-gold transition-all duration-100 linear"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px hsl(var(--library-brass) / 0.5)",
              }}
            />
          </div>
        )}

        {/* Loading text */}
        <p className="text-library-brass text-lg font-light tracking-wider">
          {message}
        </p>

        {/* Progress percentage removed as requested */}
      </div>
    </div>
  );
}
