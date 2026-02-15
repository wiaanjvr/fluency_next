"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PremiumNavProps {
  currentPath?: string;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
}

export function PremiumNav({ showLogo = true, rightContent }: PremiumNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {showLogo && (
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Fluency Next"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-light">Fluency Next</span>
            </Link>
          )}
          {rightContent}
        </div>
      </div>
    </nav>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  accent = false,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-3xl p-7 transition-all duration-300 card-hover-lift shadow-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground">
          {label}
        </span>
        {icon && (
          <div className="text-muted-foreground icon-interactive">{icon}</div>
        )}
      </div>
      <div
        className={cn(
          "text-4xl font-light mb-2",
          accent && "text-library-brass",
        )}
      >
        {value}
      </div>
      {subtext && (
        <p className="text-base text-muted-foreground font-light">{subtext}</p>
      )}
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  valueLabel?: string;
  size?: "sm" | "md" | "lg";
  accent?: boolean;
  animated?: boolean;
  showShine?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  size = "md",
  accent = true,
  animated = true,
  showShine = true,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const heights = { sm: "h-1.5", md: "h-3", lg: "h-4" };

  return (
    <div className="space-y-3">
      {(label || valueLabel) && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="font-light text-muted-foreground">{label}</span>
          )}
          {valueLabel && (
            <span className={cn("font-medium", accent && "text-library-brass")}>
              {valueLabel}
            </span>
          )}
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
            "h-full rounded-full relative overflow-hidden",
            accent
              ? "bg-gradient-to-r from-library-brass to-library-gold"
              : "bg-foreground",
            animated && "transition-all duration-1000 ease-out",
          )}
          style={{ width: `${percentage}%` }}
        >
          {showShine && percentage > 0 && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                animation: "progressShine 2s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface LessonPreviewCardProps {
  title?: string;
  level?: string;
  duration?: string;
  progress?: number;
  isPlaying?: boolean;
  className?: string;
}

export function LessonPreviewCard({
  title = "Lesson Preview",
  level = "A1",
  duration = "0:47",
  progress = 33,
  isPlaying = false,
  className,
}: LessonPreviewCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-3xl p-7 shadow-soft card-hover-lift transition-all duration-300",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-7">
        <span className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
        <span className="px-3 py-1 rounded-full bg-library-brass/10 text-xs text-library-brass font-medium">
          {level}
        </span>
      </div>

      {/* Content skeleton */}
      <div className="space-y-4 mb-7">
        <div className="h-3.5 bg-muted rounded-full w-full" />
        <div className="h-3.5 bg-muted rounded-full w-4/5" />
        <div className="h-3.5 bg-muted rounded-full w-3/4" />
      </div>

      {/* Audio player preview */}
      <div className="flex items-center gap-5 p-5 bg-muted/50 rounded-2xl">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 tap-squish",
            isPlaying
              ? "bg-library-brass scale-105"
              : "bg-library-brass/80 hover:bg-library-brass",
          )}
        >
          <svg
            className={cn("h-6 w-6 text-background", !isPlaying && "ml-0.5")}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            {isPlaying ? (
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            ) : (
              <path d="M8 5v14l11-7z" />
            )}
          </svg>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-library-brass to-library-gold rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-muted-foreground font-light">
          {duration}
        </span>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      {icon && (
        <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-8 text-muted-foreground animate-scale-bounce">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-light mb-3">{title}</h3>
      {description && (
        <p className="text-lg text-muted-foreground font-light max-w-md mb-8">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  centered = false,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(centered && "text-center", className)}>
      {eyebrow && (
        <p className="text-sm font-medium tracking-[0.2em] uppercase text-muted-foreground mb-5">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight mb-5">
        {title}
      </h2>
      {description && (
        <p className="text-lg sm:text-xl text-muted-foreground font-light max-w-2xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
