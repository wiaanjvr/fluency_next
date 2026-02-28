"use client";

import { cn } from "@/lib/utils";

/**
 * Immersive loading screen — atmospheric, no spinners.
 * "Surfacing your text…" with gentle pulse + rising bubble dots.
 */
export function ReadingSkeletonLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6">
      {/* Pulsing editorial text */}
      <p className="font-display text-2xl text-[var(--sand)] tracking-wide animate-pulse">
        Surfacing your text…
      </p>

      {/* Three rising bubble dots */}
      <div className="flex items-end gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-[#3dd6b5]/40 animate-[bubbleUp_1.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </div>

      {/* Subtle skeleton text lines for spatial context */}
      <div className="w-full max-w-2xl space-y-4 mt-8 opacity-20">
        <div className="h-6 w-3/4 mx-auto rounded bg-white/[0.06]" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded bg-white/[0.04]" />
          <div className="h-4 w-[95%] rounded bg-white/[0.04]" />
          <div className="h-4 w-[88%] rounded bg-white/[0.04]" />
          <div className="h-4 w-full rounded bg-white/[0.04]" />
          <div className="h-4 w-[75%] rounded bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
