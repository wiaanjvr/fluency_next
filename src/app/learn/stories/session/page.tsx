"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MicroStorySession } from "@/components/micro-stories";
import {
  getFoundationProgress,
  getLearnedWords,
} from "@/lib/srs/foundation-srs";
import { MicroStoryProgress } from "@/types/micro-stories";
import { checkMicroStoriesUnlock } from "@/lib/micro-stories/utils";

// ============================================================================
// MICRO-STORIES SESSION PAGE
// Active reading session for Phase 2: Micro-Stories
// ============================================================================

export default function MicroStoriesSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [knownWordCount, setKnownWordCount] = useState(0);
  const [knownWordLemmas, setKnownWordLemmas] = useState<Set<string>>(
    new Set(),
  );
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Load user vocabulary on mount
  useEffect(() => {
    const loadVocabulary = async () => {
      try {
        // Get foundation progress
        const progress = await getFoundationProgress();
        const wordCount = progress?.totalWordsLearned || 0;

        // Check unlock status
        const unlocked = checkMicroStoriesUnlock(wordCount);
        setIsUnlocked(unlocked);

        if (!unlocked) {
          router.replace("/learn/stories");
          return;
        }

        // Get learned words for vocabulary matching
        const learnedWords = getLearnedWords();
        const lemmas = new Set<string>();

        learnedWords.forEach((word, key) => {
          lemmas.add(word.lemma.toLowerCase());
        });

        // Add common function words that are always "known"
        const commonWords = [
          "le",
          "la",
          "les",
          "un",
          "une",
          "des",
          "de",
          "du",
          "à",
          "au",
          "aux",
          "et",
          "ou",
          "mais",
          "donc",
          "car",
          "ni",
          "je",
          "tu",
          "il",
          "elle",
          "nous",
          "vous",
          "ils",
          "elles",
          "on",
          "ce",
          "cette",
          "ces",
          "mon",
          "ma",
          "mes",
          "ton",
          "ta",
          "tes",
          "son",
          "sa",
          "ses",
          "notre",
          "votre",
          "leur",
          "qui",
          "que",
          "quoi",
          "dont",
          "où",
          "être",
          "avoir",
          "faire",
          "aller",
          "venir",
          "voir",
          "pouvoir",
          "vouloir",
          "devoir",
          "savoir",
          "ne",
          "pas",
          "plus",
          "très",
          "bien",
          "aussi",
          "encore",
          "toujours",
        ];
        commonWords.forEach((w) => lemmas.add(w));

        setKnownWordCount(wordCount);
        setKnownWordLemmas(lemmas);
        setLoading(false);
      } catch (error) {
        console.error("Error loading vocabulary:", error);
        setLoading(false);
      }
    };

    loadVocabulary();
  }, [router]);

  // Handle session completion
  const handleSessionComplete = (progress: MicroStoryProgress) => {
    console.log("Session completed:", progress);
    router.push("/learn/stories");
  };

  // Handle exit
  const handleExit = () => {
    router.push("/learn/stories");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading stories...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/learn/stories">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Exit
            </Button>
          </Link>
          <h1 className="font-serif text-xl">Reading Session</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <MicroStorySession
          knownWordCount={knownWordCount}
          knownWordLemmas={knownWordLemmas}
          onSessionComplete={handleSessionComplete}
          onExit={handleExit}
        />
      </main>
    </div>
  );
}
