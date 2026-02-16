"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { RisingBubbles } from "./ocean-animations";

// ============================================================================
// Animated Checkmark - Bounces in on success
// ============================================================================
interface AnimatedCheckmarkProps {
  show: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBubbles?: boolean;
}

export function AnimatedCheckmark({
  show,
  size = "md",
  className,
  showBubbles = true,
}: AnimatedCheckmarkProps) {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  if (!show) return null;

  return (
    <>
      {showBubbles && <RisingBubbles show={show} count={5} variant="success" />}
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-feedback-success animate-bounce-in",
          sizes[size],
          className,
        )}
      >
        <svg
          className="w-2/3 h-2/3 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
            className="animate-checkmark-draw"
            style={{
              strokeDasharray: 100,
              strokeDashoffset: 0,
            }}
          />
        </svg>
      </div>
    </>
  );
}

// ============================================================================
// Animated X Mark - For incorrect answers
// ============================================================================
interface AnimatedXMarkProps {
  show: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AnimatedXMark({
  show,
  size = "md",
  className,
}: AnimatedXMarkProps) {
  const sizes = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-feedback-error animate-shake-gentle",
        sizes[size],
        className,
      )}
    >
      <svg
        className="w-2/3 h-2/3 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Circular Progress Ring (iOS-style)
// ============================================================================
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  animated?: boolean;
  className?: string;
  color?: string;
  backgroundColor?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  animated = true,
  className,
  color = "#5fd4a0",
  backgroundColor = "rgba(191, 165, 99, 0.2)",
}: CircularProgressProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((displayValue / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setDisplayValue(value), 100);
      return () => clearTimeout(timer);
    }
  }, [value, animated]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      <svg className="progress-ring" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className="progress-ring-circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={
            animated
              ? strokeDashoffset
              : circumference - (value / max) * circumference
          }
          style={{
            transition: animated
              ? "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedCounter
            value={Math.round(percentage)}
            suffix="%"
            animated={animated}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Animated Counter
// ============================================================================
interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  animated?: boolean;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  animated = true,
  duration = 1000,
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const endValue = value;
    const diff = endValue - startValue;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * easeOut);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration, animated]);

  return (
    <span className={cn("text-3xl font-light tabular-nums", className)}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

// ============================================================================
// Sparkle Effect Component
// ============================================================================
interface SparkleEffectProps {
  active: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SparkleEffect({
  active,
  children,
  className,
}: SparkleEffectProps) {
  return (
    <div
      className={cn("relative", active && "sparkle-effect active", className)}
    >
      {children}
      {active && (
        <>
          <span className="absolute -top-2 -right-2 text-xl animate-sparkle">
            ✨
          </span>
          <span
            className="absolute -top-1 -left-2 text-lg animate-sparkle"
            style={{ animationDelay: "0.2s" }}
          >
            ✨
          </span>
          <span
            className="absolute -bottom-1 right-0 text-base animate-sparkle"
            style={{ animationDelay: "0.4s" }}
          >
            ✨
          </span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Fade In On Scroll Component
// ============================================================================
interface FadeInOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function FadeInOnScroll({
  children,
  className,
  delay = 0,
  threshold = 0.1,
}: FadeInOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Streak Indicator (Visual bar growth)
// ============================================================================
interface StreakIndicatorProps {
  currentStreak: number;
  maxStreak?: number;
  className?: string;
}

export function StreakIndicator({
  currentStreak,
  maxStreak = 7,
  className,
}: StreakIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxStreak }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-8 rounded-full transition-all duration-500 ease-out streak-bar",
            index < currentStreak
              ? "w-3 bg-feedback-success"
              : "w-2 bg-muted-foreground/20",
          )}
          style={{
            transitionDelay: `${index * 50}ms`,
          }}
        />
      ))}
      {currentStreak > 0 && (
        <span className="ml-2 text-sm font-medium text-feedback-success">
          {currentStreak} day streak! 🔥
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Encouraging Feedback Message
// ============================================================================
interface FeedbackMessageProps {
  type: "success" | "error" | "info";
  title: string;
  message?: string;
  className?: string;
  animate?: boolean;
}

const feedbackMessages = {
  success: [
    "Great work!",
    "Excellent!",
    "Amazing job!",
    "You're on fire!",
    "Fantastic!",
    "Well done!",
    "Perfect!",
    "Superb!",
  ],
  error: [
    "Almost there!",
    "Try again!",
    "Keep going!",
    "You've got this!",
    "So close!",
    "Don't give up!",
    "Practice makes perfect!",
  ],
  info: ["Here's a tip:", "Did you know?", "Pro tip:", "Helpful hint:"],
};

export function FeedbackMessage({
  type,
  title,
  message,
  className,
  animate = true,
}: FeedbackMessageProps) {
  const baseStyles = {
    success: "feedback-success border animate-pulse-success",
    error: "feedback-error border animate-shake-gentle",
    info: "feedback-info border",
  };

  const iconStyles = {
    success: "text-feedback-success",
    error: "text-feedback-error",
    info: "text-feedback-info",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl flex items-start gap-3",
        baseStyles[type],
        animate && type === "success" && "glow-success",
        animate && type === "error" && "glow-error",
        className,
      )}
    >
      <div className={cn("shrink-0 mt-0.5", iconStyles[type])}>
        {type === "success" && <AnimatedCheckmark show size="sm" />}
        {type === "error" && <AnimatedXMark show size="sm" />}
        {type === "info" && (
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {message && <p className="text-sm opacity-80 mt-1">{message}</p>}
      </div>
    </div>
  );
}

// Helper to get random encouraging message
export function getEncouragingMessage(
  type: "success" | "error" | "info",
): string {
  const messages = feedbackMessages[type];
  return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================================================
// Animated Progress Bar
// ============================================================================
interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  showShine?: boolean;
  className?: string;
}

export function AnimatedProgressBar({
  value,
  max = 100,
  showLabel = true,
  label,
  size = "md",
  animated = true,
  showShine = true,
  className,
}: AnimatedProgressBarProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const percentage = Math.min((displayValue / max) * 100, 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setDisplayValue(value), 100);
      return () => clearTimeout(timer);
    }
  }, [value, animated]);

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="font-light text-muted-foreground">{label}</span>
          )}
          <span className="font-medium text-ocean-turquoise">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "bg-muted rounded-full overflow-hidden relative",
          heights[size],
        )}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-ocean-turquoise to-ocean-teal",
            animated && "transition-all duration-1000 ease-out",
          )}
          style={{ width: `${percentage}%` }}
        >
          {showShine && percentage > 0 && (
            <div className="absolute inset-0 overflow-hidden rounded-full">
              <div
                className="h-full w-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  animation: "progressShine 2s ease-in-out infinite",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FadeIn - Simple fade in animation
// ============================================================================
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className,
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all ease-out",
        mounted
          ? isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
          : "opacity-100 translate-y-0",
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// ScaleIn - Scale up animation with fade
// ============================================================================
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className,
}: ScaleInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all ease-out",
        mounted
          ? isVisible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-90"
          : "opacity-100 scale-100",
        className,
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// ShakeHorizontal - Shake animation for wrong answers
// ============================================================================
interface ShakeHorizontalProps {
  children: React.ReactNode;
  trigger: boolean;
  className?: string;
}

export function ShakeHorizontal({
  children,
  trigger,
  className,
}: ShakeHorizontalProps) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={cn(shaking && "animate-shake-gentle", className)}>
      {children}
    </div>
  );
}

// ============================================================================
// Completion Celebration
// ============================================================================
interface CompletionCelebrationProps {
  show: boolean;
  percentage: number;
  onComplete?: () => void;
  className?: string;
}

export function CompletionCelebration({
  show,
  percentage,
  onComplete,
  className,
}: CompletionCelebrationProps) {
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (show && percentage >= 100) {
      setShowSparkles(true);
      const timer = setTimeout(() => {
        setShowSparkles(false);
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, percentage, onComplete]);

  if (!show) return null;

  return (
    <div className={cn("relative", className)}>
      <SparkleEffect active={showSparkles}>
        <div
          className={cn(
            "p-6 rounded-3xl bg-gradient-to-br from-ocean-turquoise/20 to-ocean-teal/10 border border-ocean-turquoise/30",
            showSparkles && "animate-celebration glow-success",
          )}
        >
          <div className="text-center">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-2xl font-light">Congratulations!</h3>
            <p className="text-muted-foreground mt-1">
              You've completed this section!
            </p>
          </div>
        </div>
      </SparkleEffect>
    </div>
  );
}
