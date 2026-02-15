"use client";

import React from "react";
import { useParams } from "next/navigation";
import { SentenceTransitionSession } from "@/components/sentence-transition";

// ============================================================================
// SENTENCE SESSION PAGE
// Individual session for sentence transition exercises
// ============================================================================

export default function SentenceSessionPage() {
  const params = useParams();
  const sessionNumber = parseInt(params.sessionId as string, 10) || 1;

  const handleSessionComplete = (results: any) => {
    // Save progress to localStorage
    try {
      const existing = localStorage.getItem("sentence-transition-progress");
      const progress = existing
        ? JSON.parse(existing)
        : { sessionsCompleted: 0 };

      progress.sessionsCompleted = Math.max(
        progress.sessionsCompleted,
        sessionNumber,
      );
      progress.lastSessionDate = new Date().toISOString();

      localStorage.setItem(
        "sentence-transition-progress",
        JSON.stringify(progress),
      );
    } catch (e) {
      console.error("Failed to save session progress:", e);
    }
  };

  return (
    <SentenceTransitionSession
      sessionNumber={sessionNumber}
      onComplete={handleSessionComplete}
    />
  );
}
