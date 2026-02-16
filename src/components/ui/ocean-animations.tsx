"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Dive-In Wrapper - Content slides up/fades like submerging into water
// ============================================================================
interface DiveInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  duration?: "fast" | "normal" | "slow";
}

export function DiveIn({
  children,
  delay = 0,
  className,
  duration = "normal",
}: DiveInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const durationClasses = {
    fast: "duration-500",
    normal: "duration-700",
    slow: "duration-1000",
  };

  return (
    <div
      className={cn(
        "transition-all ease-out transform",
        durationClasses[duration],
        isVisible
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-8 blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Wave Progress Bar - Learning streaks visualized as rising waves
// ============================================================================
interface WaveProgressProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  className?: string;
  height?: "sm" | "md" | "lg";
}

export function WaveProgress({
  value,
  max = 100,
  showLabel = true,
  label,
  className,
  height = "md",
}: WaveProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const heightClasses = {
    sm: "h-3",
    md: "h-4",
    lg: "h-6",
  };

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label || "Progress"}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-ocean-midnight/30 backdrop-blur-sm",
          heightClasses[height],
        )}
      >
        {/* Wave fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background:
              "linear-gradient(90deg, hsl(var(--ocean-turquoise)) 0%, hsl(var(--ocean-teal)) 100%)",
          }}
        >
          {/* Animated wave overlay */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `repeating-linear-gradient(
                90deg,
                transparent 0px,
                rgba(255, 255, 255, 0.1) 10px,
                rgba(255, 255, 255, 0.2) 20px,
                rgba(255, 255, 255, 0.1) 30px,
                transparent 40px
              )`,
              animation: "currentFlow 3s linear infinite",
            }}
          />
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
              animation: "shimmer 2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Rising Bubbles - Correct answers trigger bubble animations
// ============================================================================
interface BubbleProps {
  show: boolean;
  count?: number;
  size?: "sm" | "md" | "lg";
  variant?: "success" | "milestone" | "neutral";
  duration?: number;
}

export function RisingBubbles({
  show,
  count = 5,
  size = "md",
  variant = "success",
  duration = 3000,
}: BubbleProps) {
  const [bubbles, setBubbles] = useState<
    Array<{ id: number; left: number; delay: number; size: number }>
  >([]);

  useEffect(() => {
    if (show) {
      const newBubbles = Array.from({ length: count }, (_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 80 + 10, // 10-90%
        delay: Math.random() * 500,
        size: Math.random() * 0.5 + 0.75, // 0.75-1.25x base size
      }));
      setBubbles(newBubbles);

      setTimeout(() => setBubbles([]), duration);
    }
  }, [show, count, duration]);

  if (!show || bubbles.length === 0) return null;

  const baseSizes = {
    sm: 8,
    md: 12,
    lg: 16,
  };

  const colors = {
    success: "bg-feedback-success/60",
    milestone: "bg-ocean-turquoise/70",
    neutral: "bg-ocean-teal/60",
  };

  const baseSize = baseSizes[size];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={cn(
            "absolute bottom-0 rounded-full blur-[1px]",
            colors[variant],
            "animate-bubble-rise",
          )}
          style={{
            left: `${bubble.left}%`,
            width: `${baseSize * bubble.size}px`,
            height: `${baseSize * bubble.size}px`,
            animationDelay: `${bubble.delay}ms`,
            boxShadow: "inset -2px -2px 4px rgba(255, 255, 255, 0.5)",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Splash Effect - Milestone celebrations
// ============================================================================
interface SplashProps {
  show: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Splash({ show, size = "md", className }: SplashProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setTimeout(() => setVisible(false), 1000);
    }
  }, [show]);

  if (!visible) return null;

  const sizes = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center pointer-events-none z-50",
        className,
      )}
    >
      <div className={cn("relative", sizes[size])}>
        {/* Multiple ripple rings */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0 rounded-full border-4 border-ocean-turquoise opacity-70"
            style={{
              animation: `ripple 1s ease-out ${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Audio Waveform - Visualization for shadowing/speech
// ============================================================================
interface WaveformProps {
  isActive: boolean;
  bars?: number;
  className?: string;
  color?: string;
}

export function Waveform({
  isActive,
  bars = 5,
  className,
  color = "hsl(var(--ocean-turquoise))",
}: WaveformProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1 h-8", className)}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-300",
            isActive ? "animate-audio-wave" : "h-2",
          )}
          style={{
            backgroundColor: color,
            animationDelay: `${i * 0.1}s`,
            height: isActive ? undefined : "8px",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Ripple Button Effect - Hover micro-animations
// ============================================================================
interface RippleButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  disabled?: boolean;
}

export function RippleButton({
  children,
  onClick,
  className,
  disabled = false,
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: Date.now() };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);

    onClick?.(e);
  };

  return (
    <div
      ref={buttonRef}
      onClick={handleClick}
      className={cn(
        "relative overflow-hidden cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            animation: "ripple 0.6s ease-out",
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Current Flow - Horizontal scrolling sections
// ============================================================================
interface CurrentFlowProps {
  children: React.ReactNode;
  direction?: "left" | "right";
  speed?: "slow" | "normal" | "fast";
  className?: string;
}

export function CurrentFlow({
  children,
  direction = "left",
  speed = "normal",
  className,
}: CurrentFlowProps) {
  const speeds = {
    slow: "20s",
    normal: "10s",
    fast: "5s",
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="flex gap-4 whitespace-nowrap"
        style={{
          animation: `currentFlow ${speeds[speed]} linear infinite`,
          animationDirection: direction === "right" ? "reverse" : "normal",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Depth Transition - Page/component transitions with depth effect
// ============================================================================
interface DepthTransitionProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
}

export function DepthTransition({
  children,
  show,
  className,
}: DepthTransitionProps) {
  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        show
          ? "opacity-100 translate-y-0 scale-100 blur-0"
          : "opacity-0 translate-y-4 scale-95 blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Floating Elements - Gentle floating animation for cards/elements
// ============================================================================
interface FloatingProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function Floating({ children, delay = 0, className }: FloatingProps) {
  return (
    <div
      className={cn("animate-float", className)}
      style={{
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
