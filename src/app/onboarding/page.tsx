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
} from "lucide-react";
import Image from "next/image";
import {
  SupportedLanguage,
  getLanguageConfig,
  getLanguageList,
  getPlacementTest,
} from "@/lib/languages";

type OnboardingStep =
  | "language-select"
  | "welcome"
  | "audio-test"
  | "reading-test"
  | "results"
  | "interests"
  | "roadmap"
  | "complete";

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

  const totalSteps = 7;
  const currentStepNumber = {
    "language-select": 1,
    welcome: 2,
    "audio-test": 3,
    "reading-test": 4,
    results: 5,
    interests: 6,
    roadmap: 7,
    complete: 7,
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
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to Fluensea</h1>
          <p className="text-muted-foreground">
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
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-12 rounded-full transition-colors",
                i + 1 === currentStepNumber
                  ? "bg-primary"
                  : i + 1 < currentStepNumber
                    ? "bg-primary/50"
                    : "bg-muted",
              )}
            />
          ))}
        </div>

        {/* Step 1: Language Selection */}
        {step === "language-select" && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Globe className="h-6 w-6" />
                Choose Your Language
              </CardTitle>
              <CardDescription className="text-base">
                Select the language you want to learn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                {getLanguageList().map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4",
                      selectedLanguage === lang.code
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50",
                    )}
                  >
                    <span className="text-4xl">{lang.flag}</span>
                    <div>
                      <div className="font-semibold text-lg">{lang.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {lang.nativeName}
                      </div>
                    </div>
                    {selectedLanguage === lang.code && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              <Button
                size="lg"
                onClick={() => setStep("welcome")}
                className="w-full"
              >
                Continue with {languageConfig.name}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Welcome */}
        {step === "welcome" && (
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl">{languageConfig.flag}</span>
                <CardTitle className="text-2xl">
                  {languageConfig.name} Placement
                </CardTitle>
              </div>
              <CardDescription className="text-base">
                We'll assess your {languageConfig.name} level with a quick
                10-question test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Headphones className="h-5 w-5 text-primary" />
                    <span>5 Listening Questions</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Listen to short audio clips and answer comprehension
                    questions
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span>5 Reading Questions</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Read short passages and answer questions about them
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> All questions are in{" "}
                  {languageConfig.name} at varying difficulty levels. Don't
                  worry if some seem challenging—that's how we determine your
                  level!
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => setStep("audio-test")}
                className="w-full"
              >
                Start Assessment
                <ArrowRight className="ml-2 h-4 w-4" />
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
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
              <CardDescription>
                {getResultsMessage(testResults)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Level Result */}
              <div className="text-center p-6 rounded-xl bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">
                  Your determined level
                </p>
                <div
                  className={cn(
                    "text-5xl font-bold mb-2",
                    getLevelColor(testResults.determinedLevel),
                  )}
                >
                  {testResults.determinedLevel}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getLevelDescription(testResults.determinedLevel)}
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Headphones className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      Listening
                    </span>
                  </div>
                  <div className="text-2xl font-semibold">
                    {testResults.audioScore}/{audioItems.length}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      Reading
                    </span>
                  </div>
                  <div className="text-2xl font-semibold">
                    {testResults.readingScore}/{readingItems.length}
                  </div>
                </div>
              </div>

              {/* Question Breakdown */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Question Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {testResults.breakdown.map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs",
                        item.correct
                          ? "bg-green-500/10 text-green-600"
                          : "bg-red-500/10 text-red-600",
                      )}
                    >
                      {item.correct ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <span className="h-3 w-3 rounded-full border-2 border-current" />
                      )}
                      {item.section === "audio" ? "L" : "R"}
                      {item.difficulty}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                size="lg"
                onClick={() => setStep("interests")}
                className="w-full"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Interests */}
        {step === "interests" && (
          <Card>
            <CardHeader>
              <CardTitle>What are you interested in?</CardTitle>
              <CardDescription>
                Select exactly 3 topics. Every lesson will be themed around your
                interests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {INTEREST_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    onClick={() => toggleInterest(topic)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all capitalize",
                      "hover:border-primary/50",
                      selectedInterests.includes(topic)
                        ? "border-primary bg-primary/5"
                        : "border-muted",
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}
              <div className="mt-6">
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
                  className="w-full"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Continue to Roadmap
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Learning Roadmap */}
        {step === "roadmap" && testResults && (
          <Card className="overflow-hidden">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Target className="h-6 w-6" />
                Your Path to B2 Fluency
              </CardTitle>
              <CardDescription className="text-base">
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
            <CardContent className="space-y-8">
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
                      <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-4 border-background">
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
                        Learn essential words with images and audio. Build your
                        core vocabulary foundation.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Volume2 className="h-3 w-3" />
                          Audio
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Image
                            src="/logo.png"
                            alt="Fluensea Logo"
                            width={12}
                            height={12}
                            className="h-3 w-3 object-contain"
                          />
                          Images
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Brain className="h-3 w-3" />
                          SRS
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line */}
                  <div className="w-1 h-12 bg-gradient-to-b from-ocean-teal to-ocean-turquoise" />

                  {/* Node 2: Sentence Practice */}
                  <div className="flex flex-col items-center w-full">
                    <div className="relative z-10 group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ocean-turquoise to-ocean-turquoise/80 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-4 border-background">
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
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Sentences
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Patterns
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line */}
                  <div className="w-1 h-12 bg-gradient-to-b from-ocean-turquoise to-ocean-coral" />

                  {/* Node 3: Micro Stories */}
                  <div className="flex flex-col items-center w-full">
                    <div className="relative z-10 group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer border-4 border-background">
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
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Stories
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Headphones className="h-3 w-3" />
                          Listen
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line */}
                  <div className="w-1 h-12 bg-gradient-to-b from-accent to-primary" />

                  {/* Node 4: Full Acquisition */}
                  <div className="flex flex-col items-center w-full">
                    <div className="relative z-10 group">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-ocean-turquoise to-ocean-teal flex items-center justify-center shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer border-4 border-background ring-4 ring-primary/20">
                        <div className="text-center">
                          <GraduationCap className="h-10 w-10 text-background mx-auto" />
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
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <Volume2 className="h-3 w-3" />
                          Listen
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Speak
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/30 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Read
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Info Card */}
              <div className="p-4 rounded-xl bg-muted/30 border border-primary/30">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">Smart Progress System</p>
                    <p className="text-sm text-muted-foreground">
                      Your path adapts to you! Our SRS system unlocks new phases
                      as you master vocabulary. Progress at your own pace with
                      content that matches your level.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleComplete}
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Start Your Journey!
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
