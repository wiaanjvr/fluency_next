"use client";

import React from "react";
import { BookOpen, Sparkles } from "lucide-react";

export function LessonLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-8 max-w-md">
        {/* Animated icon */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-library-brass/10 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-library-brass" />
          </div>
          {/* Subtle pulse */}
          <div className="absolute inset-0 rounded-2xl bg-library-brass/5 animate-pulse" />
        </div>

        {/* Loading text */}
        <div className="space-y-3">
          <h2 className="text-3xl font-light tracking-tight">
            Preparing your{" "}
            <span className="font-serif italic text-library-brass">lesson</span>
          </h2>
          <p className="text-muted-foreground font-light">
            Loading personalized content based on your vocabulary...
          </p>
        </div>

        {/* Minimal spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-library-brass/20 border-t-library-brass rounded-full animate-spin" />
        </div>

        {/* Tip card */}
        <div className="bg-card border border-border rounded-2xl p-5 text-left">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-library-brass" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Tip</p>
              <p className="text-sm text-muted-foreground font-light">
                Focus on understanding the overall meaning first. You don't need
                to catch every word.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
