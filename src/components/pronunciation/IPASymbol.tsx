"use client";

import { cn } from "@/lib/utils";

interface IPASymbolProps {
  symbol: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-5xl md:text-6xl",
};

export default function IPASymbol({
  symbol,
  size = "lg",
  className,
}: IPASymbolProps) {
  return (
    <span
      className={cn(
        "font-serif font-bold tracking-wide select-none",
        sizeClasses[size],
        className,
      )}
      style={{ color: "var(--turquoise)" }}
      aria-label={`IPA symbol ${symbol}`}
    >
      /{symbol}/
    </span>
  );
}
