"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MicroStory,
  StoryMatch,
  MicroStoryProgress,
  MicroStoryResult,
  StorySelectionParams,
  StoryTheme,
} from "@/types/micro-stories";
import { FadeIn, ScaleIn } from "@/components/ui/animations";
import {
  selectStoriesForUser,
  getMicroStoryProgress,
  getRecommendedScaffoldingMode,
} from "@/lib/micro-stories/utils";
import microStoriesData from "@/data/micro-stories.json";

// ============================================================================
// STORY CARD COMPONENT
// Display a story option for selection
// ============================================================================

interface StoryCardProps {
  match: StoryMatch;
  onSelect: (story: MicroStory) => void;
  isSelected?: boolean;
}

function StoryCard({ match, onSelect, isSelected }: StoryCardProps) {
  const {
    story,
    matchScore,
    knownWordPercentage,
    newWordCount,
    isRecommended,
  } = match;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        isRecommended && "border-primary/50",
      )}
      onClick={() => onSelect(story)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-medium text-lg">{story.title}</h3>
            <p className="text-sm text-muted-foreground">
              {story.titleTranslation}
            </p>
          </div>
          {isRecommended && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              <Sparkles className="w-3 h-3" />
              Recommended
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {story.sentenceCount} sentences
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
            {story.theme.replace("-", " ")}
          </span>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {story.difficulty}
          </span>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                knownWordPercentage >= 95
                  ? "bg-green-500"
                  : knownWordPercentage >= 85
                    ? "bg-yellow-500"
                    : "bg-orange-500",
              )}
            />
            <span className="text-muted-foreground">
              {Math.round(knownWordPercentage)}% known
            </span>
          </div>

          {newWordCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              {newWordCount} new word{newWordCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// STORY SELECTOR COMPONENT
// Select a story to read
// ============================================================================

interface StorySelectorProps {
  knownWordCount: number;
  knownWordLemmas: Set<string>;
  completedStoryIds: string[];
  onSelectStory: (story: MicroStory) => void;
  onCancel?: () => void;
}

export function StorySelector({
  knownWordCount,
  knownWordLemmas,
  completedStoryIds,
  onSelectStory,
  onCancel,
}: StorySelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<StoryTheme | null>(null);
  const [storyMatches, setStoryMatches] = useState<StoryMatch[]>([]);
  const [selectedStory, setSelectedStory] = useState<MicroStory | null>(null);

  // Load and filter stories
  useEffect(() => {
    const allStories = microStoriesData.stories as MicroStory[];

    const params: StorySelectionParams = {
      userId: "current-user",
      knownWordCount,
      knownWordLemmas,
      completedStoryIds,
      recentlyViewedStoryIds: [],
      preferredThemes: selectedTheme ? [selectedTheme] : undefined,
      maxNewWords: 2,
    };

    const matches = selectStoriesForUser(allStories, params);
    setStoryMatches(matches);
  }, [knownWordCount, knownWordLemmas, completedStoryIds, selectedTheme]);

  const themes: StoryTheme[] = [
    "daily-life",
    "family",
    "food",
    "animals",
    "work",
    "travel",
  ];

  const handleSelectStory = () => {
    if (selectedStory) {
      onSelectStory(selectedStory);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Choose a Story
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme filters */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Filter by theme:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedTheme === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTheme(null)}
            >
              All
            </Button>
            {themes.map((theme) => (
              <Button
                key={theme}
                variant={selectedTheme === theme ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTheme(theme)}
                className="capitalize"
              >
                {theme.replace("-", " ")}
              </Button>
            ))}
          </div>
        </div>

        {/* Story list */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {storyMatches.length > 0 ? (
            storyMatches.slice(0, 6).map((match, index) => (
              <FadeIn key={match.story.id} delay={index * 50}>
                <StoryCard
                  match={match}
                  onSelect={setSelectedStory}
                  isSelected={selectedStory?.id === match.story.id}
                />
              </FadeIn>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stories available for your current vocabulary level.</p>
              <p className="text-sm mt-2">
                Keep learning more words to unlock new stories!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSelectStory}
            disabled={!selectedStory}
            className="ml-auto"
          >
            Start Reading
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MICRO STORY SESSION COMPONENT
// Manages a full micro-story learning session
// ============================================================================

import { MicroStoryReader } from "./MicroStoryReader";
import {
  recordStoryCompletion,
  recordWordClick,
  getWordClickHistory,
} from "@/lib/micro-stories/utils";

interface MicroStorySessionProps {
  knownWordCount: number;
  knownWordLemmas: Set<string>;
  onSessionComplete: (progress: MicroStoryProgress) => void;
  onExit?: () => void;
}

export function MicroStorySession({
  knownWordCount,
  knownWordLemmas,
  onSessionComplete,
  onExit,
}: MicroStorySessionProps) {
  const [phase, setPhase] = useState<"select" | "read" | "summary">("select");
  const [currentStory, setCurrentStory] = useState<MicroStory | null>(null);
  const [progress, setProgress] = useState<MicroStoryProgress | null>(null);
  const [sessionResults, setSessionResults] = useState<MicroStoryResult[]>([]);
  const [clickHistory, setClickHistory] = useState(getWordClickHistory());

  // Load progress on mount
  useEffect(() => {
    setProgress(getMicroStoryProgress());
  }, []);

  const completedStoryIds = progress?.completedStoryIds || [];

  // Handle story selection
  const handleSelectStory = (story: MicroStory) => {
    setCurrentStory(story);
    setPhase("read");
  };

  // Handle story completion
  const handleStoryComplete = (result: MicroStoryResult) => {
    // Record in progress
    const updatedProgress = recordStoryCompletion(
      result,
      progress,
      knownWordCount,
    );
    setProgress(updatedProgress);
    setSessionResults((prev) => [...prev, result]);

    // Move to summary phase
    setPhase("summary");
  };

  // Handle word click
  const handleWordClick = (event: any) => {
    const updatedHistory = recordWordClick(event, clickHistory);
    setClickHistory(updatedHistory);
  };

  // Continue to next story
  const handleContinue = () => {
    setCurrentStory(null);
    setPhase("select");
  };

  // End session
  const handleEndSession = () => {
    if (progress) {
      onSessionComplete(progress);
    }
  };

  // Get comprehension questions for the current story
  const getComprehensionQuestions = () => {
    if (!currentStory) return [];

    const storyData = microStoriesData.stories.find(
      (s: any) => s.id === currentStory.id,
    ) as any;

    return storyData?.comprehensionQuestions || [];
  };

  // Render based on phase
  const renderPhase = () => {
    switch (phase) {
      case "select":
        return (
          <StorySelector
            knownWordCount={knownWordCount}
            knownWordLemmas={knownWordLemmas}
            completedStoryIds={completedStoryIds}
            onSelectStory={handleSelectStory}
            onCancel={onExit}
          />
        );

      case "read":
        if (!currentStory) return null;

        const scaffoldingMode = getRecommendedScaffoldingMode(
          progress,
          currentStory.newWords?.length || 0,
        );

        return (
          <MicroStoryReader
            story={currentStory}
            initialScaffoldingMode={scaffoldingMode}
            comprehensionQuestions={getComprehensionQuestions()}
            onComplete={handleStoryComplete}
            onWordClick={handleWordClick}
          />
        );

      case "summary":
        const lastResult = sessionResults[sessionResults.length - 1];

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Session Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FadeIn>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <p className="text-3xl font-bold text-primary">
                      {progress?.storiesCompleted || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Stories Completed
                    </p>
                  </div>
                  <div className="text-center p-4 bg-primary/5 rounded-xl">
                    <p className="text-3xl font-bold text-primary">
                      {lastResult?.comprehensionScore || 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Comprehension
                    </p>
                  </div>
                </div>
              </FadeIn>

              {lastResult && (
                <FadeIn delay={200}>
                  <div className="p-4 bg-muted rounded-xl space-y-2">
                    <h4 className="font-medium">Last Story Stats:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {Math.round(lastResult.totalReadingTimeMs / 1000)}s
                        reading time
                      </div>
                      <div>{lastResult.uniqueWordsClicked} words looked up</div>
                      <div>
                        {lastResult.newWordsEncountered} new words encountered
                      </div>
                      <div>{lastResult.audioListenCount}x audio played</div>
                    </div>
                  </div>
                </FadeIn>
              )}

              {progress?.readyForPhase3 && (
                <FadeIn delay={400}>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                    <p className="font-medium text-amber-800">
                      You're ready for Phase 3: Longer Passages!
                    </p>
                  </div>
                </FadeIn>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleEndSession}
                  className="flex-1"
                >
                  End Session
                </Button>
                <Button onClick={handleContinue} className="flex-1 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Read Another
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      {progress && phase !== "select" && (
        <div className="mb-4 text-center text-sm text-muted-foreground">
          Stories this session: {sessionResults.length} | Total completed:{" "}
          {progress.storiesCompleted}
        </div>
      )}

      {renderPhase()}
    </div>
  );
}

export default MicroStorySession;
