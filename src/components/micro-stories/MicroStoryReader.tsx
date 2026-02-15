"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Volume2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  BookOpen,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MicroStory,
  StorySentence,
  StoryWord,
  WordClickEvent,
  ScaffoldingMode,
  StoryReadingPhase,
  MicroStorySession,
  MicroStoryResult,
  StoryComprehensionQuestion,
  ComprehensionQuestionResult,
} from "@/types/micro-stories";
import {
  FadeIn,
  ScaleIn,
  AnimatedCheckmark,
  AnimatedXMark,
} from "@/components/ui/animations";
import { useSoundEffects } from "@/lib/sounds";

// ============================================================================
// INTERACTIVE WORD COMPONENT
// Click any word for instant translation/audio
// ============================================================================

interface InteractiveWordProps {
  word: StoryWord;
  scaffoldingMode: ScaffoldingMode;
  isHighlighted: boolean;
  onClick: (word: StoryWord) => void;
  showTooltip: boolean;
  onTooltipClose: () => void;
}

export function InteractiveWord({
  word,
  scaffoldingMode,
  isHighlighted,
  onClick,
  showTooltip,
  onTooltipClose,
}: InteractiveWordProps) {
  const wordRef = useRef<HTMLSpanElement>(null);

  // Play word audio using TTS
  const playWordAudio = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.cleanText);
      utterance.lang = "fr-FR";
      utterance.rate = 0.7;

      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

      window.speechSynthesis.speak(utterance);
    }
  }, [word.cleanText]);

  const handleClick = () => {
    onClick(word);
    playWordAudio();
  };

  // Determine styling based on scaffolding mode and word status
  const getWordStyles = () => {
    const baseStyles =
      "cursor-pointer transition-all duration-200 rounded px-1 py-0.5";

    if (word.isNew) {
      switch (scaffoldingMode) {
        case "full":
          return cn(
            baseStyles,
            "bg-amber-200/80 text-amber-900 font-medium underline decoration-amber-500 decoration-2",
          );
        case "hints":
          return cn(
            baseStyles,
            "bg-amber-100/60 text-amber-800 border-b-2 border-amber-400 border-dashed",
          );
        case "minimal":
        case "off":
          return cn(baseStyles, "hover:bg-amber-50");
      }
    }

    return cn(baseStyles, "hover:bg-gray-100");
  };

  return (
    <span className="relative inline-block">
      <span
        ref={wordRef}
        className={cn(
          getWordStyles(),
          isHighlighted && "ring-2 ring-primary ring-offset-1",
        )}
        onClick={handleClick}
      >
        {word.text}
        {/* Inline translation for full scaffolding mode on new words */}
        {scaffoldingMode === "full" && word.isNew && (
          <span className="ml-1 text-xs text-amber-600 font-normal">
            ({word.translation})
          </span>
        )}
      </span>

      {/* Tooltip popup */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[180px]"
          onClick={(e) => e.stopPropagation()}
        >
          <FadeIn>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">
                  {word.cleanText}
                </span>
                <button
                  onClick={onTooltipClose}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-gray-700 mb-1">{word.translation}</p>
              <p className="text-xs text-gray-500 italic">
                {word.partOfSpeech}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={playWordAudio}
                className="mt-2 w-full gap-1 text-xs"
              >
                <Volume2 className="w-3 h-3" /> Play Audio
              </Button>
            </div>
          </FadeIn>
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white" />
        </div>
      )}
    </span>
  );
}

// ============================================================================
// INTERACTIVE SENTENCE COMPONENT
// Renders a sentence with clickable words
// ============================================================================

interface InteractiveSentenceProps {
  sentence: StorySentence;
  scaffoldingMode: ScaffoldingMode;
  onWordClick: (word: StoryWord, sentenceId: string) => void;
  activeWordIndex: number | null;
  onActiveWordChange: (index: number | null) => void;
  isCurrentSentence: boolean;
}

export function InteractiveSentence({
  sentence,
  scaffoldingMode,
  onWordClick,
  activeWordIndex,
  onActiveWordChange,
  isCurrentSentence,
}: InteractiveSentenceProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Play sentence audio
  const playSentenceAudio = useCallback(() => {
    if (isPlaying) return;

    setIsPlaying(true);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence.french);
      utterance.lang = "fr-FR";
      utterance.rate = 0.75;

      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [sentence.french, isPlaying]);

  const handleWordClick = (word: StoryWord) => {
    onActiveWordChange(word.position);
    onWordClick(word, sentence.id);
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl transition-all duration-300",
        isCurrentSentence && "bg-primary/5 border border-primary/20",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Sentence number indicator */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-medium">
          {sentence.order}
        </span>

        <div className="flex-1">
          {/* French sentence with interactive words */}
          <div className="text-lg leading-relaxed mb-2">
            {sentence.words.map((word, index) => (
              <React.Fragment key={`${sentence.id}-${index}`}>
                <InteractiveWord
                  word={word}
                  scaffoldingMode={scaffoldingMode}
                  isHighlighted={activeWordIndex === word.position}
                  onClick={handleWordClick}
                  showTooltip={activeWordIndex === word.position}
                  onTooltipClose={() => onActiveWordChange(null)}
                />
                {index < sentence.words.length - 1 && " "}
              </React.Fragment>
            ))}
          </div>

          {/* Audio button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={playSentenceAudio}
            disabled={isPlaying}
            className="gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <Volume2 className={cn("w-3 h-3", isPlaying && "animate-pulse")} />
            {isPlaying ? "Playing..." : "Listen"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPREHENSION CHECK COMPONENT
// Quick questions to verify understanding
// ============================================================================

interface ComprehensionCheckProps {
  questions: StoryComprehensionQuestion[];
  onComplete: (results: ComprehensionQuestionResult[]) => void;
}

export function ComprehensionCheck({
  questions,
  onComplete,
}: ComprehensionCheckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ComprehensionQuestionResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | boolean | null>(
    null,
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const { playSuccess, playError } = useSoundEffects();

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (answer: number | boolean) => {
    setSelectedAnswer(answer);
    setShowFeedback(true);

    let correct = false;
    if (currentQuestion.questionType === "true-false") {
      correct = answer === currentQuestion.correctAnswer;
    } else if (currentQuestion.questionType === "multiple-choice") {
      correct = answer === currentQuestion.correctOptionIndex;
    } else if (currentQuestion.questionType === "word-meaning") {
      correct = answer === currentQuestion.correctMeaningIndex;
    }

    correct ? playSuccess() : playError();

    const result: ComprehensionQuestionResult = {
      questionId: currentQuestion.id,
      correct,
      selectedAnswer: answer,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    const newResults = [...results, result];
    setResults(newResults);

    // Move to next question or complete
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      } else {
        onComplete(newResults);
      }
    }, 2000);
  };

  const renderTrueFalse = () => (
    <div className="flex gap-4 justify-center">
      <Button
        variant={
          selectedAnswer === true
            ? currentQuestion.correctAnswer
              ? "default"
              : "destructive"
            : "outline"
        }
        size="lg"
        onClick={() => handleAnswer(true)}
        disabled={showFeedback}
        className="min-w-[100px]"
      >
        True
      </Button>
      <Button
        variant={
          selectedAnswer === false
            ? !currentQuestion.correctAnswer
              ? "default"
              : "destructive"
            : "outline"
        }
        size="lg"
        onClick={() => handleAnswer(false)}
        disabled={showFeedback}
        className="min-w-[100px]"
      >
        False
      </Button>
    </div>
  );

  const renderMultipleChoice = () => {
    const options =
      currentQuestion.questionType === "word-meaning"
        ? currentQuestion.meaningOptions
        : currentQuestion.options;
    const correctIndex =
      currentQuestion.questionType === "word-meaning"
        ? currentQuestion.correctMeaningIndex
        : currentQuestion.correctOptionIndex;

    return (
      <div className="grid grid-cols-2 gap-3">
        {options?.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === correctIndex;

          let variant: "outline" | "default" | "destructive" = "outline";
          if (showFeedback && isSelected) {
            variant = isCorrect ? "default" : "destructive";
          } else if (showFeedback && isCorrect) {
            variant = "default";
          }

          return (
            <Button
              key={index}
              variant={variant}
              onClick={() => handleAnswer(index)}
              disabled={showFeedback}
              className="h-auto py-3 px-4 text-left justify-start"
            >
              {option}
            </Button>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Comprehension Check ({currentIndex + 1}/{questions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FadeIn key={currentQuestion.id}>
          <p className="text-lg font-medium text-center mb-6">
            {currentQuestion.questionText}
          </p>

          {currentQuestion.questionType === "true-false" && renderTrueFalse()}
          {(currentQuestion.questionType === "multiple-choice" ||
            currentQuestion.questionType === "word-meaning") &&
            renderMultipleChoice()}

          {showFeedback && currentQuestion.explanation && (
            <FadeIn delay={300}>
              <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <Info className="w-4 h-4 inline mr-2" />
                {currentQuestion.explanation}
              </div>
            </FadeIn>
          )}
        </FadeIn>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// NEW WORDS REVIEW COMPONENT
// Review new and clicked words at the end
// ============================================================================

interface WordReviewProps {
  newWords: StoryWord[];
  clickedWords: StoryWord[];
  onComplete: () => void;
}

export function WordReview({
  newWords,
  clickedWords,
  onComplete,
}: WordReviewProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const allWords = [
    ...newWords,
    ...clickedWords.filter((w) => !newWords.some((nw) => nw.lemma === w.lemma)),
  ];

  const playWordAudio = (word: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "fr-FR";
      utterance.rate = 0.7;

      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

      window.speechSynthesis.speak(utterance);
    }
  };

  if (allWords.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium mb-4">Great job!</p>
          <p className="text-muted-foreground mb-6">
            You read this story without needing extra help!
          </p>
          <Button onClick={onComplete}>Continue</Button>
        </CardContent>
      </Card>
    );
  }

  const currentWord = allWords[currentWordIndex];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RotateCcw className="w-5 h-5" />
          Word Review ({currentWordIndex + 1}/{allWords.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FadeIn key={currentWord.text}>
          <div className="text-center space-y-4">
            <div
              className={cn(
                "text-4xl font-serif cursor-pointer hover:text-primary transition-colors",
                currentWord.isNew && "text-amber-600",
              )}
              onClick={() => playWordAudio(currentWord.cleanText)}
            >
              {currentWord.cleanText}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => playWordAudio(currentWord.cleanText)}
              className="gap-2"
            >
              <Volume2 className="w-4 h-4" /> Listen
            </Button>

            <div className="pt-4 border-t">
              <p className="text-xl text-muted-foreground">
                {currentWord.translation}
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                {currentWord.partOfSpeech}
              </p>
            </div>

            {currentWord.isNew && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">
                <Sparkles className="w-3 h-3" />
                New Word
              </div>
            )}
          </div>
        </FadeIn>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() =>
              setCurrentWordIndex(Math.max(0, currentWordIndex - 1))
            }
            disabled={currentWordIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {currentWordIndex < allWords.length - 1 ? (
            <Button onClick={() => setCurrentWordIndex(currentWordIndex + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onComplete}>
              Complete
              <Check className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN MICRO STORY READER COMPONENT
// ============================================================================

interface MicroStoryReaderProps {
  story: MicroStory;
  initialScaffoldingMode?: ScaffoldingMode;
  comprehensionQuestions?: StoryComprehensionQuestion[];
  onComplete: (result: MicroStoryResult) => void;
  onWordClick?: (event: WordClickEvent) => void;
}

export function MicroStoryReader({
  story,
  initialScaffoldingMode = "hints",
  comprehensionQuestions = [],
  onComplete,
  onWordClick,
}: MicroStoryReaderProps) {
  const [phase, setPhase] = useState<StoryReadingPhase>("intro");
  const [scaffoldingMode, setScaffoldingMode] = useState<ScaffoldingMode>(
    initialScaffoldingMode,
  );
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [wordClicks, setWordClicks] = useState<WordClickEvent[]>([]);
  const [clickedWords, setClickedWords] = useState<StoryWord[]>([]);
  const [audioPlayCount, setAudioPlayCount] = useState(0);
  const [comprehensionResults, setComprehensionResults] = useState<
    ComprehensionQuestionResult[]
  >([]);
  const [startTime] = useState(Date.now());
  const { playSuccess, playTap } = useSoundEffects();

  // Get new words from the story
  const newWords = story.sentences
    .flatMap((s) => s.words)
    .filter((w) => w.isNew);

  // Handle word click
  const handleWordClick = useCallback(
    (word: StoryWord, sentenceId: string) => {
      playTap();

      const clickEvent: WordClickEvent = {
        id: `click-${Date.now()}`,
        userId: "current-user", // Replace with actual user ID
        storyId: story.id,
        sentenceId,
        wordText: word.text,
        wordLemma: word.lemma,
        wordPosition: word.position,
        timestamp: new Date().toISOString(),
        timeInStoryMs: Date.now() - startTime,
      };

      setWordClicks((prev) => [...prev, clickEvent]);

      // Track unique clicked words
      if (!clickedWords.some((w) => w.lemma === word.lemma)) {
        setClickedWords((prev) => [...prev, word]);
      }

      onWordClick?.(clickEvent);
    },
    [story.id, startTime, clickedWords, onWordClick, playTap],
  );

  // Play full story audio
  const playStoryAudio = useCallback(() => {
    const fullText = story.sentences.map((s) => s.french).join(". ");

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(fullText);
      utterance.lang = "fr-FR";
      utterance.rate = 0.7;

      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find((v) => v.lang.startsWith("fr"));
      if (frenchVoice) utterance.voice = frenchVoice;

      window.speechSynthesis.speak(utterance);
      setAudioPlayCount((prev) => prev + 1);
    }
  }, [story.sentences]);

  // Complete the story
  const completeStory = useCallback(() => {
    const result: MicroStoryResult = {
      storyId: story.id,
      completedAt: new Date().toISOString(),
      totalReadingTimeMs: Date.now() - startTime,
      audioListenCount: audioPlayCount,
      sentenceRereadCount: 0,
      totalWordClicks: wordClicks.length,
      uniqueWordsClicked: clickedWords.length,
      newWordsEncountered: newWords.length,
      wordsNeedingReview: clickedWords
        .filter(
          (w) => wordClicks.filter((c) => c.wordLemma === w.lemma).length >= 2,
        )
        .map((w) => w.lemma),
      comprehensionScore:
        comprehensionResults.length > 0
          ? Math.round(
              (comprehensionResults.filter((r) => r.correct).length /
                comprehensionResults.length) *
                100,
            )
          : 100,
      comprehensionQuestionResults: comprehensionResults,
      newWordsLearned: newWords.map((w) => w.lemma),
      wordsForExtraReview: clickedWords
        .filter(
          (w) => wordClicks.filter((c) => c.wordLemma === w.lemma).length >= 3,
        )
        .map((w) => w.lemma),
    };

    playSuccess();
    onComplete(result);
  }, [
    story.id,
    startTime,
    audioPlayCount,
    wordClicks,
    clickedWords,
    newWords,
    comprehensionResults,
    onComplete,
    playSuccess,
  ]);

  // Render based on current phase
  const renderPhase = () => {
    switch (phase) {
      case "intro":
        return (
          <Card>
            <CardContent className="py-8 text-center space-y-6">
              <FadeIn>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif text-primary">
                    {story.title}
                  </h2>
                  <p className="text-muted-foreground">
                    {story.titleTranslation}
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={200}>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {story.sentenceCount} sentences
                  </span>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {story.theme}
                  </span>
                  {newWords.length > 0 && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                      {newWords.length} new word{newWords.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Click any word for instant translation and audio
                  </p>
                  <Button size="lg" onClick={() => setPhase("scaffolded-read")}>
                    Start Reading
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </FadeIn>
            </CardContent>
          </Card>
        );

      case "scaffolded-read":
      case "free-read":
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{story.title}</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Scaffolding toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setScaffoldingMode(
                        scaffoldingMode === "off" ? "hints" : "off",
                      )
                    }
                    className="gap-1 text-xs"
                  >
                    {scaffoldingMode !== "off" ? (
                      <>
                        <Eye className="w-3 h-3" /> Hints On
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" /> Hints Off
                      </>
                    )}
                  </Button>

                  {/* Audio button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={playStoryAudio}
                    className="gap-1"
                  >
                    <Volume2 className="w-3 h-3" /> Listen
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {story.sentences.map((sentence, index) => (
                <FadeIn key={sentence.id} delay={index * 100}>
                  <InteractiveSentence
                    sentence={sentence}
                    scaffoldingMode={scaffoldingMode}
                    onWordClick={handleWordClick}
                    activeWordIndex={
                      currentSentenceIndex === index ? activeWordIndex : null
                    }
                    onActiveWordChange={(idx) => {
                      setCurrentSentenceIndex(index);
                      setActiveWordIndex(idx);
                    }}
                    isCurrentSentence={currentSentenceIndex === index}
                  />
                </FadeIn>
              ))}

              {/* Reading progress */}
              <div className="pt-4 flex justify-between items-center border-t">
                <div className="text-sm text-muted-foreground">
                  {clickedWords.length > 0 && (
                    <span>
                      {clickedWords.length} word
                      {clickedWords.length > 1 ? "s" : ""} looked up
                    </span>
                  )}
                </div>

                <Button
                  onClick={() => {
                    if (comprehensionQuestions.length > 0) {
                      setPhase("comprehension-check");
                    } else {
                      setPhase("word-review");
                    }
                  }}
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "comprehension-check":
        return (
          <ComprehensionCheck
            questions={comprehensionQuestions}
            onComplete={(results) => {
              setComprehensionResults(results);
              setPhase("word-review");
            }}
          />
        );

      case "word-review":
        return (
          <WordReview
            newWords={newWords}
            clickedWords={clickedWords}
            onComplete={() => setPhase("completed")}
          />
        );

      case "completed":
        return (
          <Card>
            <CardContent className="py-8 text-center space-y-6">
              <ScaleIn>
                <div className="w-16 h-16 mx-auto rounded-full bg-feedback-success flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </ScaleIn>

              <FadeIn delay={300}>
                <div className="space-y-2">
                  <h2 className="text-2xl font-serif">Story Complete!</h2>
                  <p className="text-muted-foreground">
                    {comprehensionResults.length > 0 && (
                      <>
                        Comprehension:{" "}
                        {Math.round(
                          (comprehensionResults.filter((r) => r.correct)
                            .length /
                            comprehensionResults.length) *
                            100,
                        )}
                        %
                        <br />
                      </>
                    )}
                    Words looked up: {clickedWords.length}
                  </p>
                </div>
              </FadeIn>

              <FadeIn delay={500}>
                <Button size="lg" onClick={completeStory}>
                  Finish
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </FadeIn>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return <div className="max-w-2xl mx-auto">{renderPhase()}</div>;
}

export default MicroStoryReader;
