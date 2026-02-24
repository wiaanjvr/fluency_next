"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

// =============================================================================
// FLUENSEA MOTION SYSTEM
// Premium micro-interactions, entrance animations, and scroll-triggered effects
// Inspired by Linear, Vercel, Stripe, Apple design systems
// =============================================================================

// --- Easing constants ---
const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const EASE_OUT_SPRING = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";

// =============================================================================
// AnimatedCounter — Smooth number animation for stats/metrics
// =============================================================================
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Exponential ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// =============================================================================
// FadeIn — Generic entrance animation wrapper
// =============================================================================
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  scale?: number;
  once?: boolean;
  threshold?: number;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 700,
  direction = "up",
  distance = 24,
  scale = 1,
  once = true,
  threshold = 0.15,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );

    // Check if already visible on mount
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true);
    }

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const getTransform = () => {
    if (isVisible) return `translate3d(0,0,0) scale(${1})`;
    const s = scale !== 1 ? scale : 0.97;
    switch (direction) {
      case "up":
        return `translate3d(0, ${distance}px, 0) scale(${s})`;
      case "down":
        return `translate3d(0, -${distance}px, 0) scale(${s})`;
      case "left":
        return `translate3d(${distance}px, 0, 0) scale(${s})`;
      case "right":
        return `translate3d(-${distance}px, 0, 0) scale(${s})`;
      default:
        return `translate3d(0, 0, 0) scale(${s})`;
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transform: mounted ? getTransform() : "translate3d(0,0,0) scale(1)",
        opacity: mounted ? (isVisible ? 1 : 0) : 1,
        transition: mounted
          ? `transform ${duration}ms ${EASE_OUT_EXPO} ${delay}ms, opacity ${duration}ms ${EASE_OUT_EXPO} ${delay}ms`
          : "none",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// StaggerChildren — Orchestrate staggered entrance animations
// =============================================================================
interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  baseDelay?: number;
}

export function StaggerChildren({
  children,
  className,
  staggerDelay = 80,
  baseDelay = 0,
}: StaggerChildrenProps) {
  const items = React.Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, i) => (
        <FadeIn key={i} delay={baseDelay + i * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
}

// =============================================================================
// ShimmerSkeleton — Premium loading skeleton with ocean shimmer
// =============================================================================
interface ShimmerSkeletonProps {
  className?: string;
  lines?: number;
  circle?: boolean;
  width?: string;
  height?: string;
}

export function ShimmerSkeleton({
  className,
  lines = 1,
  circle = false,
  width,
  height,
}: ShimmerSkeletonProps) {
  if (circle) {
    return (
      <div
        className={cn(
          "rounded-full bg-white/[0.04] relative overflow-hidden",
          className,
        )}
        style={{ width: width || "48px", height: height || "48px" }}
      >
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-white/[0.04] relative overflow-hidden"
          style={{
            width: i === lines - 1 && lines > 1 ? "75%" : width || "100%",
            height: height || "14px",
          }}
        >
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CardSkeleton — Full card-shaped loading skeleton
// =============================================================================
interface CardSkeletonProps {
  className?: string;
  hasHeader?: boolean;
  hasImage?: boolean;
  lines?: number;
}

export function CardSkeleton({
  className,
  hasHeader = true,
  hasImage = false,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4",
        className,
      )}
    >
      {hasImage && (
        <ShimmerSkeleton className="!rounded-2xl" width="100%" height="160px" />
      )}
      {hasHeader && (
        <div className="flex items-center gap-3">
          <ShimmerSkeleton circle width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <ShimmerSkeleton width="60%" height="16px" />
            <ShimmerSkeleton width="40%" height="12px" />
          </div>
        </div>
      )}
      <ShimmerSkeleton lines={lines} />
    </div>
  );
}

// =============================================================================
// ProgressBarAnimated — Smooth animated progress bar
// =============================================================================
interface ProgressBarAnimatedProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  height?: string;
  showGlow?: boolean;
}

export function ProgressBarAnimated({
  value,
  max = 100,
  className,
  barClassName,
  height = "8px",
  showGlow = true,
}: ProgressBarAnimatedProps) {
  const [width, setWidth] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div
      className={cn(
        "w-full rounded-full bg-white/[0.06] overflow-hidden relative",
        className,
      )}
      style={{ height }}
    >
      <div
        className={cn(
          "h-full rounded-full bg-ocean-turquoise transition-all duration-1000 relative overflow-hidden",
          barClassName,
        )}
        style={{
          width: `${width}%`,
          transitionTimingFunction: EASE_OUT_EXPO,
        }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>
      {/* Glow at tip */}
      {showGlow && width > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-ocean-turquoise/40 blur-md transition-all duration-1000"
          style={{
            left: `calc(${width}% - 8px)`,
            transitionTimingFunction: EASE_OUT_EXPO,
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// HoverGlow — Subtle glow effect that follows cursor on hover
// =============================================================================
interface HoverGlowProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  glowSize?: number;
  borderRadius?: string;
}

export function HoverGlow({
  children,
  className,
  glowColor = "rgba(42, 169, 160, 0.15)",
  glowSize = 200,
  borderRadius = "1.5rem",
}: HoverGlowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ borderRadius }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Glow orb */}
      <div
        className="pointer-events-none absolute -z-0 transition-opacity duration-300"
        style={{
          width: glowSize,
          height: glowSize,
          left: position.x - glowSize / 2,
          top: position.y - glowSize / 2,
          background: `radial-gradient(circle, ${glowColor}, transparent 70%)`,
          opacity: isHovering ? 1 : 0,
          borderRadius: "50%",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// =============================================================================
// TextReveal — Character-by-character or word-by-word text reveal
// =============================================================================
interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  charDelay?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export function TextReveal({
  text,
  className,
  delay = 0,
  charDelay = 30,
  as: Tag = "span",
}: TextRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const words = text.split(" ");
  let charIndex = 0;

  return (
    <Tag ref={ref as any} className={cn("inline", className)}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block">
          {word.split("").map((char, ci) => {
            const currentDelay = delay + charIndex * charDelay;
            charIndex++;
            return (
              <span
                key={ci}
                className="inline-block"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(8px)",
                  transition: `opacity 0.4s ${EASE_OUT_EXPO} ${currentDelay}ms, transform 0.4s ${EASE_OUT_EXPO} ${currentDelay}ms`,
                }}
              >
                {char}
              </span>
            );
          })}
          {wi < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

// =============================================================================
// GlassPanel — Frosted glass panel with enhanced depth
// =============================================================================
interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  intensity?: "light" | "medium" | "heavy";
  hoverLift?: boolean;
}

export function GlassPanel({
  children,
  className,
  intensity = "medium",
  hoverLift = false,
}: GlassPanelProps) {
  const intensityStyles = {
    light: "bg-white/[0.03] backdrop-blur-md border-white/[0.06]",
    medium: "bg-white/[0.05] backdrop-blur-xl border-white/[0.08]",
    heavy: "bg-white/[0.08] backdrop-blur-2xl border-white/[0.12]",
  };

  return (
    <div
      className={cn(
        "rounded-3xl border transition-all duration-400",
        intensityStyles[intensity],
        hoverLift &&
          "hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_0_1px_rgba(42,169,160,0.15)]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// Tooltip — Polished, animated tooltip
// =============================================================================
interface TooltipSimpleProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function TooltipSimple({
  children,
  content,
  position = "top",
  className,
}: TooltipSimpleProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <div
        className={cn(
          "absolute z-50 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none",
          "bg-foreground/95 text-background backdrop-blur-sm",
          "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
          "transition-all duration-200",
          positionClasses[position],
          show ? "opacity-100 scale-100" : "opacity-0 scale-95",
        )}
        style={{ transitionTimingFunction: EASE_OUT_SPRING }}
      >
        {content}
      </div>
    </div>
  );
}

// =============================================================================
// Divider — Subtle visual separator with optional label
// =============================================================================
interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  return (
    <div className={cn("relative flex items-center py-4", className)}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      {label && (
        <span className="px-4 text-xs font-light tracking-widest uppercase text-muted-foreground/60">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}
