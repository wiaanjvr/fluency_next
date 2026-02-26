"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getDepthLevel,
  checkLevelUp,
  type DepthLevel,
} from "@/lib/progression/depthLevels";
import { LevelUpModal } from "./LevelUpModal";

// ============================================================================
// ProgressionProvider — Manages depth level state and level-up celebrations
//
// Wraps the dashboard layout. Monitors word count changes and triggers the
// LevelUpModal when a depth threshold is crossed. Persists the last
// acknowledged level in localStorage to prevent re-triggering on refresh.
// ============================================================================

const STORAGE_KEY = "fluensea:lastAcknowledgedDepthLevel";

// ─── Context ────────────────────────────────────────────────────────────────

interface ProgressionContextType {
  /** Current depth level based on word count */
  currentLevel: DepthLevel;
  /** Update the word count — triggers level-up check */
  updateWordCount: (count: number) => void;
  /** Current known word count */
  wordCount: number;
}

const ProgressionContext = createContext<ProgressionContextType>({
  currentLevel: getDepthLevel(0),
  updateWordCount: () => {},
  wordCount: 0,
});

// ─── Storage helpers ────────────────────────────────────────────────────────

function getLastAcknowledgedLevel(): number {
  if (typeof window === "undefined") return 0;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function setLastAcknowledgedLevel(levelId: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(levelId));
  } catch {
    // localStorage may be unavailable
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface ProgressionProviderProps {
  children: ReactNode;
  /** Initial word count from server-side data */
  initialWordCount?: number;
}

export function ProgressionProvider({
  children,
  initialWordCount = 0,
}: ProgressionProviderProps) {
  const [wordCount, setWordCount] = useState(initialWordCount);
  const previousWordCountRef = useRef(initialWordCount);
  const [currentLevel, setCurrentLevel] = useState(() =>
    getDepthLevel(initialWordCount),
  );

  // Level-up modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [celebratingLevel, setCelebratingLevel] = useState<DepthLevel | null>(
    null,
  );
  const [previousLevel, setPreviousLevel] = useState<DepthLevel | null>(null);

  // Check on mount if user has leveled up since last acknowledgement
  useEffect(() => {
    const level = getDepthLevel(initialWordCount);
    setCurrentLevel(level);

    const lastAcked = getLastAcknowledgedLevel();
    if (level.id > lastAcked && lastAcked > 0) {
      // User has leveled up since last visit
      const prevLevelIndex = lastAcked - 1;
      const prevLevel =
        prevLevelIndex >= 0
          ? getDepthLevel(
              // Use the previous level's unlock threshold
              level.unlocksAt - 1,
            )
          : null;
      setPreviousLevel(prevLevel);
      setCelebratingLevel(level);
      setModalOpen(true);
    } else if (lastAcked === 0) {
      // First visit — record current level without celebrating
      setLastAcknowledgedLevel(level.id);
    }
  }, [initialWordCount]);

  const updateWordCount = useCallback((newCount: number) => {
    const prev = previousWordCountRef.current;
    previousWordCountRef.current = newCount;
    setWordCount(newCount);

    const newLevel = getDepthLevel(newCount);
    setCurrentLevel(newLevel);

    // Check for level-up
    const leveledUp = checkLevelUp(prev, newCount);
    if (leveledUp) {
      const oldLevel = getDepthLevel(prev);
      setPreviousLevel(oldLevel);
      setCelebratingLevel(leveledUp);
      setModalOpen(true);
    }
  }, []);

  const handleDismissModal = useCallback(() => {
    setModalOpen(false);
    if (celebratingLevel) {
      setLastAcknowledgedLevel(celebratingLevel.id);
    }
    setCelebratingLevel(null);
    setPreviousLevel(null);
  }, [celebratingLevel]);

  return (
    <ProgressionContext.Provider
      value={{ currentLevel, updateWordCount, wordCount }}
    >
      {children}

      {/* Level-Up Celebration Modal */}
      {celebratingLevel && (
        <LevelUpModal
          isOpen={modalOpen}
          previousLevel={previousLevel}
          newLevel={celebratingLevel}
          onDismiss={handleDismissModal}
        />
      )}
    </ProgressionContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useProgression() {
  const ctx = useContext(ProgressionContext);
  if (!ctx) {
    throw new Error("useProgression must be used within a ProgressionProvider");
  }
  return ctx;
}
