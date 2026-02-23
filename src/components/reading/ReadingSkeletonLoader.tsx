"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full-screen loading skeleton shown while the reading text
 * and audio are being generated.
 */
export function ReadingSkeletonLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6">
      {/* Animated ocean pulse ring */}
      <div className="relative w-24 h-24">
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-teal-400/30",
            "animate-ping",
          )}
        />
        <div
          className={cn(
            "absolute inset-2 rounded-full border border-teal-400/20",
            "animate-pulse",
          )}
        />
        <div
          className={cn(
            "absolute inset-4 rounded-full bg-teal-400/10",
            "animate-pulse",
          )}
        />
        {/* Center dot */}
        <div className="absolute inset-[38%] rounded-full bg-teal-400/40" />
      </div>

      {/* Loading text */}
      <div className="text-center space-y-2">
        <p className="font-display text-xl text-teal-400/70 tracking-wide">
          Preparing your dive...
        </p>
        <p className="text-sm text-gray-500 font-body">
          Generating a story just for you
        </p>
      </div>

      {/* Skeleton text lines */}
      <div className="w-full max-w-2xl space-y-4 mt-8">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[95%]" />
          <Skeleton className="h-5 w-[88%]" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[92%]" />
          <Skeleton className="h-5 w-[75%]" />
        </div>
        <div className="space-y-3 mt-4">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[90%]" />
          <Skeleton className="h-5 w-[85%]" />
          <Skeleton className="h-5 w-[96%]" />
          <Skeleton className="h-5 w-[60%]" />
        </div>
      </div>

      {/* Skeleton audio player bar */}
      <div className="fixed bottom-0 inset-x-0 h-20 bg-[#0d2137] border-t border-white/10">
        <div className="flex items-center gap-4 h-full px-6 max-w-2xl mx-auto">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
