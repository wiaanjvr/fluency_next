"use client";

import Link from "next/link";
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
              <div className="w-9 h-9 bg-library-brass rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <span className="text-background font-serif font-semibold text-lg">
                  L
                </span>
              </div>
              <span className="text-lg font-light">Lingua</span>
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
        "bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-luxury hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-light tracking-[0.15em] uppercase text-muted-foreground">
          {label}
        </span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div
        className={cn(
          "text-3xl font-light mb-1",
          accent && "text-library-brass",
        )}
      >
        {value}
      </div>
      {subtext && (
        <p className="text-sm text-muted-foreground font-light">{subtext}</p>
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
}

export function ProgressBar({
  value,
  max = 100,
  label,
  valueLabel,
  size = "md",
  accent = true,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" };

  return (
    <div className="space-y-2">
      {(label || valueLabel) && (
        <div className="flex justify-between text-sm">
          {label && (
            <span className="font-light text-muted-foreground">{label}</span>
          )}
          {valueLabel && (
            <span className={cn("font-light", accent && "text-library-brass")}>
              {valueLabel}
            </span>
          )}
        </div>
      )}
      <div
        className={cn("bg-muted rounded-full overflow-hidden", heights[size])}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            accent ? "bg-library-brass" : "bg-foreground",
          )}
          style={{ width: `${percentage}%` }}
        />
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
        "bg-card border border-border rounded-2xl p-6 shadow-luxury transition-all duration-300",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-light tracking-wider uppercase text-muted-foreground">
          {title}
        </span>
        <span className="text-xs text-library-brass font-light">{level}</span>
      </div>

      {/* Content skeleton */}
      <div className="space-y-3 mb-6">
        <div className="h-3 bg-muted rounded-full w-full" />
        <div className="h-3 bg-muted rounded-full w-4/5" />
        <div className="h-3 bg-muted rounded-full w-3/4" />
      </div>

      {/* Audio player preview */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300",
            isPlaying ? "bg-library-brass scale-110" : "bg-library-brass/80",
          )}
        >
          <svg
            className={cn("h-5 w-5 text-background", !isPlaying && "ml-0.5")}
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
          <div className="h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-library-brass rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-light">
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
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-light mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground font-light max-w-sm mb-6">
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
        <p className="text-sm font-light tracking-[0.2em] uppercase text-muted-foreground mb-4">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-muted-foreground font-light max-w-2xl">
          {description}
        </p>
      )}
    </div>
  );
}
