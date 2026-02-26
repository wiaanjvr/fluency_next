"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/ui/LoadingScreen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INTEREST_TOPICS, ProficiencyLevel } from "@/types";
import {
  TestResponse,
  PlacementTestResults,
  AudioTestItem,
  ReadingTestItem,
} from "@/types/placement-test";
import {
  AudioListeningTest,
  ReadingComprehensionTest,
} from "@/components/placement";
import { ProgressDepthMeter } from "@/components/ocean";
import {
  calculatePlacementResults,
  getLevelDescription,
  getResultsMessage,
} from "@/lib/placement/scoring";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  seedUserVocabulary,
  LEVEL_WORD_ALLOCATION,
} from "@/lib/srs/seed-vocabulary";
import {
  Headphones,
  BookOpen,
  Trophy,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Globe,
  Target,
  Brain,
  Volume2,
  MessageSquare,
  GraduationCap,
  Layers,
  Zap,
  Star,
  Lock,
  Unlock,
  Loader2,
  Waves,
  Dumbbell,
  Briefcase,
  FlaskConical,
  Palette,
  Compass,
  Cpu,
  Landmark,
  Heart,
  ChefHat,
  Check,
} from "lucide-react";
import Image from "next/image";
import {
  SupportedLanguage,
  getLanguageConfig,
  getLanguageList,
  getPlacementTest,
} from "@/lib/languages";
import {
  OnboardingStepTransition,
  FloatingParticles,
} from "@/components/onboarding";

type OnboardingStep =
  | "language-select"
  | "welcome"
  | "audio-test"
  | "reading-test"
  | "results"
  | "interests"
  | "roadmap"
  | "complete";

const TOPIC_ICONS: Record<string, React.ElementType> = {
  philosophy: Brain,
  fitness: Dumbbell,
  business: Briefcase,
  science: FlaskConical,
  art: Palette,
  travel: Compass,
  technology: Cpu,
  history: Landmark,
  psychology: Heart,
  cooking: ChefHat,
};

function getOceanMessage(level: ProficiencyLevel): string {
  switch (level) {
    case "A0":
      return "You're standing at the shore. Your ocean awaits.";
    case "A1":
    case "A2":
      return "You've waded in. The current is starting to pull.";
    case "B1":
    case "B2":
      return "You're beneath the surface now. Dive deeper.";
    default: // C1, C2
      return "You swim with ease. Master the abyss.";
  }
}

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("language-select");
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>("fr");
  const [audioIndex, setAudioIndex] = useState(0);
  const [readingIndex, setReadingIndex] = useState(0);
  const [audioResponses, setAudioResponses] = useState<TestResponse[]>([]);
  const [readingResponses, setReadingResponses] = useState<TestResponse[]>([]);
  const [testResults, setTestResults] = useState<PlacementTestResults | null>(
    null,
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [completingOnboarding, setCompletingOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChosenLanguage, setHasChosenLanguage] = useState(false);

  // Get placement test data based on selected language
  const placementTestData = useMemo(
    () => getPlacementTest(selectedLanguage),
    [selectedLanguage],
  );
  const languageConfig = useMemo(
    () => getLanguageConfig(selectedLanguage),
    [selectedLanguage],
  );

  const audioItems = placementTestData.audioItems as AudioTestItem[];
  const readingItems = placementTestData.readingItems as ReadingTestItem[];

  // Check auth and onboarding status on mount
  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        // Check if user already completed onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("interests")
          .eq("id", user.id)
          .single();

        // If profile exists and has interests (3 or more), onboarding is complete
        if (profile?.interests && profile.interests.length >= 3) {
          console.log("User has already completed onboarding, redirecting");
          // If there's a redirect URL, go there; otherwise go to dashboard
          const redirectUrl =
            redirect && redirect.startsWith("/") ? redirect : "/dashboard";
          router.replace(redirectUrl);
          return;
        }

        // User needs to complete onboarding
        setAuthChecked(true);
      } catch (error) {
        console.error("Error checking auth:", error);
        setAuthChecked(true);
      } finally {
        setLoading(false);
      }
    };

    // Only run the check once on mount
    if (!authChecked && !completingOnboarding) {
      checkAuthAndOnboarding();
    }
  }, []); // Empty dependency array - only run once on mount

  const totalSteps = 8;
  const currentStepNumber = {
    "language-select": 1,
    welcome: 2,
    "audio-test": 3,
    "reading-test": 4,
    results: 5,
    interests: 6,
    roadmap: 7,
    complete: 8,
  }[step];

  const stepHeadline = {
    "language-select": (
      <>
        Choose your{" "}
        <em className="font-serif italic text-teal-300">language</em>.
      </>
    ),
    welcome: (
      <>
        Discover your <em className="font-serif italic text-teal-300">depth</em>
        .
      </>
    ),
    "audio-test": (
      <>
        Listen to the{" "}
        <em className="font-serif italic text-teal-300">current</em>.
      </>
    ),
    "reading-test": (
      <>
        Listen to the{" "}
        <em className="font-serif italic text-teal-300">current</em>.
      </>
    ),
    results: (
      <>
        Your depth is{" "}
        <em className="font-serif italic text-teal-300">
          {testResults?.determinedLevel ?? "..."}
        </em>
        .
      </>
    ),
    interests: (
      <>
        What <em className="font-serif italic text-teal-300">moves</em> you?
      </>
    ),
    roadmap: (
      <>
        Your path to{" "}
        <em className="font-serif italic text-teal-300">fluency</em>.
      </>
    ),
    complete: (
      <>
        Your path to{" "}
        <em className="font-serif italic text-teal-300">fluency</em>.
      </>
    ),
  }[step];

  // Handle audio test answer
  const handleAudioAnswer = (response: TestResponse) => {
    const newResponses = [...audioResponses, response];
    setAudioResponses(newResponses);

    if (audioIndex < audioItems.length - 1) {
      setAudioIndex(audioIndex + 1);
    } else {
      // Move to reading test
      setStep("reading-test");
    }
  };

  // Handle reading test answer
  const handleReadingAnswer = (response: TestResponse) => {
    const newResponses = [...readingResponses, response];
    setReadingResponses(newResponses);

    if (readingIndex < readingItems.length - 1) {
      setReadingIndex(readingIndex + 1);
    } else {
      // Calculate results
      const audioDifficulties = audioItems.map((item) => item.difficulty);
      const readingDifficulties = readingItems.map((item) => item.difficulty);

      const results = calculatePlacementResults(
        newResponses.length > 0 ? [...audioResponses] : audioResponses,
        newResponses,
        audioDifficulties as any,
        readingDifficulties as any,
      );

      // Recalculate with all audio responses
      const finalResults = calculatePlacementResults(
        audioResponses,
        newResponses,
        audioDifficulties as any,
        readingDifficulties as any,
      );

      setTestResults(finalResults);
      setStep("results");
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      }
      // Enforce exactly 3 interests max
      if (prev.length >= 3) return prev;
      return [...prev, interest];
    });
  };

  const handleComplete = async () => {
    if (!testResults) return;

    // Validate exactly 3 interests are selected
    if (selectedInterests.length !== 3) {
      setError("Please select exactly 3 interests to continue.");
      return;
    }

    setSaving(true);
    setCompletingOnboarding(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Save user preferences to Supabase and verify it was saved
      const { data: updatedProfile, error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email || "",
          proficiency_level: testResults.determinedLevel,
          target_language: selectedLanguage,
          interests: selectedInterests,
          updated_at: new Date().toISOString(),
        })
        .select("interests, proficiency_level, target_language")
        .single();

      if (updateError) {
        console.error("Error saving preferences:", updateError);
        setError("Failed to save preferences. Please try again.");
        setCompletingOnboarding(false);
        return;
      }

      // Verify interests were actually saved
      if (!updatedProfile?.interests || updatedProfile.interests.length === 0) {
        console.error("Interests were not saved properly");
        setError("Failed to save interests. Please try again.");
        setCompletingOnboarding(false);
        return;
      }

      console.log("Profile updated successfully:", updatedProfile);

      console.log("Profile updated successfully:", updatedProfile);

      // ============================================================
      // VOCABULARY SEEDING BASED ON PLACEMENT TEST
      // ============================================================
      // Seed known vocabulary proportional to assessed proficiency:
      // - A0: 0 words (complete beginner)
      // - A1: 100 words (elementary)
      // - A2: 200 words (pre-intermediate)
      // - B1: 500 words (intermediate)
      // - B2+: 1000 words (upper-intermediate+)
      //
      // This gives users a realistic starting point and ensures they
      // begin with appropriate lesson difficulty. Words are marked as
      // "known" with solid SRS parameters so they won't be re-taught.
      // ============================================================
      try {
        const wordCount = await seedUserVocabulary(
          user.id,
          testResults.determinedLevel,
          "fr",
        );
        console.log(
          `Seeded ${wordCount} words for level ${testResults.determinedLevel}`,
        );
      } catch (seedError) {
        // Non-fatal: log but continue to dashboard
        console.error("Error seeding vocabulary:", seedError);
      }

      // Set a flag in sessionStorage to indicate onboarding just completed
      // This helps the dashboard know not to redirect back
      if (typeof window !== "undefined") {
        sessionStorage.setItem("onboarding_completed", "true");
      }

      // Small delay to ensure database is fully committed before redirect
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("Redirecting after onboarding completion");

      // Use replace instead of push to prevent back navigation to onboarding
      // If there's a redirect URL, go there; otherwise go to dashboard
      let redirectUrl = "/dashboard";
      if (
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("/pricing")
      ) {
        // Use redirect URL if it's not a pricing page (payment should happen BEFORE onboarding)
        redirectUrl = redirect;
      }
      router.replace(redirectUrl);
    } catch (err) {
      console.error("Onboarding error:", err);
      setError("An error occurred. Please try again.");
      setCompletingOnboarding(false);
    } finally {
      setSaving(false);
    }
  };

  const getLevelColor = (level: ProficiencyLevel) => {
    const colors: Record<ProficiencyLevel, string> = {
      A0: "text-slate-500",
      A1: "text-green-500",
      A2: "text-emerald-500",
      B1: "text-blue-500",
      B2: "text-indigo-500",
      C1: "text-purple-500",
      C2: "text-pink-500",
    };
    return colors[level];
  };

  // Show loading state until auth is checked
  if (!authChecked || loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="onboarding-page py-12 px-4">
      {/* Floating bubble particles — fixed canvas layer behind all content */}
      <FloatingParticles />
      <div className="container mx-auto max-w-3xl onboarding-glow">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-[2rem] font-semibold leading-tight">
            {stepHeadline}
          </h1>
          <p className="text-[0.95rem] text-gray-400">
            {step === "language-select" && "Choose your target language"}
            {step === "welcome" &&
              `Let's discover your depth in ${languageConfig.name}`}
            {step === "audio-test" && "Listen carefully and answer"}
            {step === "reading-test" && "Read and answer"}
            {step === "results" && "Your assessment is complete!"}
            {step === "interests" && "Almost there!"}
            {step === "roadmap" && "Your personalized learning journey"}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 px-2">
          <ProgressDepthMeter
            currentStep={currentStepNumber ?? 1}
            totalSteps={totalSteps}
          />
        </div>

        <OnboardingStepTransition stepKey={step}>
          {/* Step 1: Language Selection */}
          {step === "language-select" && (
            <Card className="ocean-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Globe className="h-6 w-6" />
                  Choose Your Language
                </CardTitle>
                <CardDescription className="text-[0.95rem] text-gray-400">
                  Select the language you want to learn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm text-gray-300">
                <div className="grid gap-3">
                  {(() => {
                    const subtitles: Record<string, string> = {
                      fr: "Romance, culture, and Parisian elegance",
                      de: "Precision, philosophy, and timeless literature",
                      it: "Passion, art, and the music of speech",
                    };
                    return getLanguageList().map((lang) => {
                      const isSelected = selectedLanguage === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setHasChosenLanguage(true);
                          }}
                          className={cn(
                            "lang-card relative overflow-hidden",
                            isSelected && "lang-card--selected",
                          )}
                        >
                          {/* Culturally-tinted ghost gradient */}
                          <div
                            className={`lang-card-gradient lang-card-gradient--${lang.code}`}
                            aria-hidden="true"
                          />

                          {/* Content row */}
                          <div className="relative z-10 flex items-center gap-4">
                            <span className="text-4xl leading-none">
                              {lang.flag}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold text-lg leading-tight">
                                  {lang.name}
                                </span>
                                <span className="lang-code-badge">
                                  {lang.code.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {lang.nativeName}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 italic">
                                {subtitles[lang.code]}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "lang-check-icon",
                                isSelected && "lang-check-icon--visible",
                              )}
                            >
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>

                <div
                  className={cn(
                    "lang-continue-wrapper",
                    hasChosenLanguage && "lang-continue-wrapper--visible",
                  )}
                >
                  <Button
                    size="lg"
                    onClick={() => setStep("welcome")}
                    className="w-full btn-teal-cta"
                  >
                    Continue with{" "}
                    <span key={selectedLanguage} className="lang-btn-text">
                      {languageConfig.name}
                    </span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Placement Assessment Intro */}
          {step === "welcome" && (
            <Card className="ocean-card placement-intro-enter">
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center mb-3">
                  <span className="text-3xl">{languageConfig.flag}</span>
                </div>
                <CardTitle className="text-2xl tracking-tight">
                  Find your <em className="placement-depth-word">depth</em>
                </CardTitle>
                <CardDescription className="text-[0.95rem] text-gray-400 mt-2">
                  A quick 10-question dive tells us exactly where your journey
                  begins.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Sonar / radar scan animation */}
                <div className="flex flex-col items-center gap-3 py-4">
                  <svg
                    viewBox="0 0 120 120"
                    width="120"
                    height="120"
                    className="overflow-visible"
                    aria-hidden="true"
                  >
                    {/* Static inner ring */}
                    <circle
                      cx="60"
                      cy="60"
                      r="20"
                      fill="none"
                      stroke="rgba(0,212,184,0.45)"
                      strokeWidth="1.5"
                    />
                    {/* Pulsing rings */}
                    <circle
                      cx="60"
                      cy="60"
                      r="20"
                      fill="none"
                      stroke="rgba(0,212,184,0.3)"
                      strokeWidth="1"
                      className="sonar-ring sonar-ring-1"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="20"
                      fill="none"
                      stroke="rgba(0,212,184,0.2)"
                      strokeWidth="1"
                      className="sonar-ring sonar-ring-2"
                    />
                    {/* Center dot */}
                    <circle cx="60" cy="60" r="4" fill="rgba(0,212,184,0.85)" />
                  </svg>
                  <p className="text-sm text-teal-300/80 tracking-wide">
                    5 listening + 5 reading questions
                  </p>
                </div>

                {/* Ocean-tinted info card */}
                <div className="placement-info-card flex items-start gap-3 rounded-lg p-4">
                  <Waves
                    className="h-4 w-4 mt-0.5 flex-shrink-0 text-teal-400"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-teal-200">
                    All questions are in {languageConfig.name} at varying
                    difficulty levels. Don&apos;t worry if some seem
                    challenging—that&apos;s exactly how we find your level.
                  </p>
                </div>

                <Button
                  size="lg"
                  onClick={() => setStep("audio-test")}
                  className="w-full btn-teal-cta"
                >
                  Begin the dive →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Audio Listening Test */}
          {step === "audio-test" && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Question {audioIndex + 1} of {audioItems.length}
              </div>
              <AudioListeningTest
                item={audioItems[audioIndex]}
                itemIndex={audioIndex}
                totalItems={audioItems.length}
                onAnswer={handleAudioAnswer}
              />
            </div>
          )}

          {/* Step 3: Reading Comprehension Test */}
          {step === "reading-test" && (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Question {readingIndex + 1} of {readingItems.length}
              </div>
              <ReadingComprehensionTest
                item={readingItems[readingIndex]}
                itemIndex={readingIndex}
                totalItems={readingItems.length}
                onAnswer={handleReadingAnswer}
              />
            </div>
          )}

          {/* Step 4: Results */}
          {step === "results" && testResults && (
            <Card className="ocean-card">
              <CardHeader className="text-center">
                {/* 0ms — trophy icon scales in */}
                <div className="results-anim-trophy mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Trophy className="h-8 w-8 text-primary" />
                </div>
                {/* 300ms — heading & sub-heading fade up */}
                <CardTitle className="results-anim-heading text-2xl">
                  Assessment Complete!
                </CardTitle>
                <CardDescription className="results-anim-heading text-[0.95rem] text-gray-400">
                  {getResultsMessage(testResults)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm text-gray-300">
                {/* Level Result */}
                <div className="text-center p-6 rounded-xl bg-muted/50">
                  <p className="results-anim-heading text-sm text-muted-foreground mb-4">
                    Your determined level
                  </p>

                  {/* 600ms — level code with glow ring */}
                  <div className="relative flex items-center justify-center mb-4">
                    {/* Soft glow ring behind the level text */}
                    <div className="absolute blur-3xl bg-teal-500/20 w-32 h-32 rounded-full" />
                    <div className="results-anim-level relative z-10 text-7xl font-serif italic text-teal-300">
                      {testResults.determinedLevel}
                    </div>
                  </div>

                  {/* 900ms — level description + ocean metaphor */}
                  <p className="results-anim-description text-sm text-muted-foreground">
                    {getLevelDescription(testResults.determinedLevel)}
                  </p>
                  <p className="results-anim-description mt-2 text-sm text-gray-400 italic font-serif">
                    {getOceanMessage(testResults.determinedLevel)}
                  </p>
                </div>

                {/* 1100ms — scores + progress bars */}
                <div className="results-anim-scores space-y-4">
                  {/* Listening progress bar */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Headphones className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Listening {testResults.audioScore}/{audioItems.length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="results-listening-bar h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-300"
                        style={
                          {
                            "--target-width": `${
                              audioItems.length > 0
                                ? (testResults.audioScore / audioItems.length) *
                                  100
                                : 0
                            }%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </div>

                  {/* Reading progress bar */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Reading {testResults.readingScore}/{readingItems.length}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="results-reading-bar h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-300"
                        style={
                          {
                            "--target-width": `${
                              readingItems.length > 0
                                ? (testResults.readingScore /
                                    readingItems.length) *
                                  100
                                : 0
                            }%`,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setStep("interests")}
                    className="w-full mt-2 btn-teal-cta"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Interests */}
          {step === "interests" && (
            <Card className="ocean-card">
              <CardHeader>
                <CardTitle className="text-2xl">
                  What{" "}
                  <em className="font-serif not-italic italic text-teal-300">
                    moves
                  </em>{" "}
                  you?
                </CardTitle>
                <CardDescription className="text-[0.95rem] text-gray-400">
                  Choose 3 passions. Your lessons will be built entirely around
                  them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm text-gray-300">
                {/* Counter badge */}
                <div className="flex justify-end">
                  <span
                    className={cn(
                      "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-200",
                      selectedInterests.length === 3
                        ? "border-teal-400/50 bg-teal-500/10 text-teal-300"
                        : "border-white/10 bg-white/5 text-gray-400",
                    )}
                  >
                    {selectedInterests.length} / 3 selected
                  </span>
                </div>

                {/* Topic grid */}
                <div className="grid grid-cols-2 gap-3">
                  {INTEREST_TOPICS.map((topic) => {
                    const isSelected = selectedInterests.includes(topic);
                    const limitReached = selectedInterests.length === 3;
                    const Icon = TOPIC_ICONS[topic] ?? Brain;
                    return (
                      <button
                        key={topic}
                        onClick={() => toggleInterest(topic)}
                        className={cn(
                          "interest-card",
                          isSelected && "interest-card--selected",
                          !isSelected &&
                            limitReached &&
                            "interest-card--dimmed",
                        )}
                      >
                        <Icon
                          className={cn(
                            "interest-card-icon h-5 w-5 flex-shrink-0 transition-colors duration-150",
                            isSelected ? "text-teal-300" : "text-teal-500/70",
                          )}
                        />
                        <span className="capitalize">{topic}</span>
                        {isSelected && (
                          <span className="interest-card-check">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <div className="mt-2">
                  <Button
                    onClick={() => {
                      if (selectedInterests.length !== 3) {
                        setError(
                          "Please select exactly 3 interests to continue.",
                        );
                        return;
                      }
                      setError(null);
                      setStep("roadmap");
                    }}
                    disabled={selectedInterests.length !== 3}
                    className={cn(
                      "w-full transition-opacity duration-200 btn-teal-cta",
                      selectedInterests.length !== 3 &&
                        "opacity-40 pointer-events-none",
                    )}
                    size="lg"
                  >
                    <Compass className="mr-2 h-4 w-4" />
                    Continue to Roadmap
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Learning Roadmap */}
          {step === "roadmap" && testResults && (
            <Card className="ocean-card overflow-hidden">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Target className="h-6 w-6" />
                  Your Path to B2 Fluency
                </CardTitle>
                <CardDescription className="text-[0.95rem] text-gray-400">
                  Based on your{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      getLevelColor(testResults.determinedLevel),
                    )}
                  >
                    {testResults.determinedLevel}
                  </span>{" "}
                  level, here's your learning journey
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 text-sm text-gray-300">
                {/* Starting Point Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-l-4 border-primary">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        Starting at {testResults.determinedLevel}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {testResults.determinedLevel === "A0" &&
                          "You'll begin with the fundamentals"}
                        {testResults.determinedLevel === "A1" &&
                          "Building on your basic foundation"}
                        {testResults.determinedLevel === "A2" &&
                          "Expanding your solid foundation"}
                        {testResults.determinedLevel === "B1" &&
                          "You're already halfway to B2!"}
                        {testResults.determinedLevel === "B2" &&
                          "Perfect! Focus on mastery"}
                        {(testResults.determinedLevel === "C1" ||
                          testResults.determinedLevel === "C2") &&
                          "Advanced learning awaits"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Roadmap with Nodes */}
                <div className="relative py-6">
                  {/* Mobile/Tablet optimized vertical path */}
                  <div className="flex flex-col items-center space-y-0">
                    {/* Node 1: Foundation Vocabulary */}
                    <div className="flex flex-col items-center w-full">
                      <div className="relative z-10 group">
                        <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center shadow-lg roadmap-node-start roadmap-node-intermediate cursor-pointer border-4 border-background">
                          <div className="text-center">
                            <Image
                              src="/logo.png"
                              alt="Fluensea Logo"
                              width={32}
                              height={32}
                              className="h-8 w-8 mx-auto object-contain"
                              priority
                            />
                            <div className="text-xs text-ocean-sand font-bold mt-1">
                              START
                            </div>
                          </div>
                        </div>
                        {/* Unlock indicator */}
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <Unlock className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      {/* Info Card */}
                      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-ocean-teal/30 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            Foundation Vocabulary
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-teal/20 text-ocean-turquoise border border-ocean-teal/30">
                            0-100 words
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Learn essential words with images and audio. Build
                          your core vocabulary foundation.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="feature-tag-pill">
                            <Volume2 className="h-3 w-3" />
                            Audio
                          </span>
                          <span className="feature-tag-pill">
                            <Image
                              src="/logo.png"
                              alt="Fluensea Logo"
                              width={12}
                              height={12}
                              className="h-3 w-3 object-contain"
                            />
                            Images
                          </span>
                          <span className="feature-tag-pill">
                            <Brain className="h-3 w-3" />
                            SRS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connecting Line */}
                    <div className="roadmap-path-line" />

                    {/* Node 2: Sentence Practice */}
                    <div className="flex flex-col items-center w-full">
                      <div className="relative z-10 group">
                        <span className="roadmap-tooltip">
                          Connect words into living sentences
                        </span>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ocean-turquoise to-ocean-turquoise/80 flex items-center justify-center shadow-lg roadmap-node-intermediate cursor-pointer border-4 border-background">
                          <MessageSquare className="h-10 w-10 text-ocean-midnight" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-ocean-turquoise flex items-center justify-center">
                          <Star className="h-4 w-4 text-ocean-turquoise fill-ocean-turquoise" />
                        </div>
                      </div>
                      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-ocean-turquoise/30 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            Sentence Practice
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-turquoise/20 text-ocean-turquoise border border-ocean-turquoise/30">
                            100-300 words
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Build sentences with your vocabulary. Learn natural
                          patterns and structures.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="feature-tag-pill">
                            <MessageSquare className="h-3 w-3" />
                            Sentences
                          </span>
                          <span className="feature-tag-pill">
                            <Zap className="h-3 w-3" />
                            Patterns
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connecting Line */}
                    <div className="roadmap-path-line" />

                    {/* Node 3: Micro Stories */}
                    <div className="flex flex-col items-center w-full">
                      <div className="relative z-10 group">
                        <span className="roadmap-tooltip">
                          Absorb language through vivid short stories
                        </span>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg roadmap-node-intermediate cursor-pointer border-4 border-background">
                          <BookOpen className="h-10 w-10 text-accent-foreground" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-background border-2 border-accent flex items-center justify-center">
                          <Star className="h-4 w-4 text-accent fill-accent" />
                        </div>
                      </div>
                      <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-accent/30 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            Micro Stories
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                            300-500 words
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Short stories with 95%+ known words. Learn through
                          engaging context.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="feature-tag-pill">
                            <BookOpen className="h-3 w-3" />
                            Stories
                          </span>
                          <span className="feature-tag-pill">
                            <Headphones className="h-3 w-3" />
                            Listen
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Connecting Line */}
                    <div className="roadmap-path-line" />

                    {/* Node 4: Full Acquisition */}
                    <div className="flex flex-col items-center w-full">
                      <div className="relative z-10 group">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-ocean-turquoise to-ocean-teal flex items-center justify-center shadow-xl roadmap-node-goal cursor-pointer border-4 border-background">
                          <div className="text-center">
                            <span className="roadmap-grad-cap-rotate">
                              <GraduationCap className="h-12 w-12 text-background" />
                            </span>
                            <div className="text-xs text-background font-bold mt-1">
                              B2 GOAL
                            </div>
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        {/* Sparkles effect */}
                        <Sparkles className="absolute -top-2 -left-2 h-6 w-6 text-primary animate-pulse" />
                        <Sparkles className="absolute -bottom-2 -right-2 h-6 w-6 text-ocean-turquoise animate-pulse" />
                      </div>
                      <p className="mt-2 text-[0.7rem] text-teal-400 font-medium tracking-wide">
                        Your Destination
                      </p>
                      <div className="mt-4 p-4 rounded-xl bg-muted/50 border-2 border-primary/40 max-w-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">
                            Full Acquisition Mode
                          </h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                            500+ words → B2
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Complete immersion with full stories tailored to your
                          interests. Natural language acquisition.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="feature-tag-pill">
                            <Volume2 className="h-3 w-3" />
                            Listen
                          </span>
                          <span className="feature-tag-pill">
                            <MessageSquare className="h-3 w-3" />
                            Speak
                          </span>
                          <span className="feature-tag-pill">
                            <BookOpen className="h-3 w-3" />
                            Read
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Info Card */}
                <div className="roadmap-info-box">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                      <Waves className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-teal-300">
                        Smart Progress System
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Your path breathes with you. As you master each wave of
                        vocabulary, the current carries you deeper —
                        automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <Button
                    onClick={handleComplete}
                    disabled={saving}
                    className="w-full btn-journey btn-teal-cta"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Waves className="mr-2 h-5 w-5" />
                        Start Your Journey!
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </OnboardingStepTransition>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingPageContent />
    </Suspense>
  );
}
