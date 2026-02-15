"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Volume2,
  Mic,
  CheckCircle2,
  Eye,
  EyeOff,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SingleSentence } from "@/types";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import { validateSpeechInput, ValidationResult } from "@/lib/speech/validation";
import { getLanguageConfig, type SupportedLanguage } from "@/lib/languages";

// Helper to get target text from SingleSentence
function getSentenceTarget(sentence: SingleSentence): string {
  return sentence.sentence_target || sentence.sentence_french || "";
}

interface SingleSentenceLessonProps {
  sentence: SingleSentence;
  onComplete: () => void;
  language?: SupportedLanguage;
}

export function SingleSentenceLesson({
  sentence,
  onComplete,
  language = "fr",
}: SingleSentenceLessonProps) {
  const [step, setStep] = useState<
    "listen" | "vocabulary" | "respond" | "speak" | "complete"
  >("listen");
  const [showEnglish, setShowEnglish] = useState(true);
  const [listenCount, setListenCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<number | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isPassed, setIsPassed] = useState(false);

  const langConfig = getLanguageConfig(language);
  const sentenceTarget = getSentenceTarget(sentence);

  const {
    transcript,
    isListening,
    confidence,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({ language: langConfig.speechCode });

  useEffect(() => {
    if (isListening) {
      const timeout = setTimeout(() => {
        stopListening();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isListening, stopListening]);

  useEffect(() => {
    if (transcript && !isListening && step === "speak") {
      const result = validateSpeechInput(transcript, sentenceTarget, 75);
      setValidationResult(result);
      setAttemptCount((prev) => prev + 1);

      if (result.isCorrect) {
        setIsPassed(true);
      }
    }
  }, [transcript, isListening, step, sentenceTarget]);

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
    setListenCount((prev) => prev + 1);
  };

  const handleContinue = () => {
    if (step === "listen") setStep("vocabulary");
    else if (step === "vocabulary") setStep("respond");
    else if (step === "respond") setStep("speak");
    else if (step === "speak") setStep("complete");
    else if (step === "complete") onComplete();
  };

  const handleStartRecording = () => {
    resetTranscript();
    setValidationResult(null);
    startListening();
  };

  const handleTryAgain = () => {
    resetTranscript();
    setValidationResult(null);
  };

  const steps = ["listen", "vocabulary", "respond", "speak", "complete"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Lesson Progress
            </span>
            <span className="text-sm font-bold text-primary">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className="flex-1 h-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700"
              >
                <div
                  className={`h-full transition-all duration-500 ${
                    i <= currentStepIndex
                      ? "bg-gradient-to-r from-violet-500 to-pink-500"
                      : "bg-transparent"
                  }`}
                  style={{
                    width:
                      i < currentStepIndex
                        ? "100%"
                        : i === currentStepIndex
                          ? "100%"
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              Listen
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              Complete
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="h-2 gradient-primary" />
          <CardHeader className="bg-gradient-to-r from-violet-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 pb-8">
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              {step === "listen" && "🎧 Listen & Absorb"}
              {step === "vocabulary" && "📚 Key Vocabulary"}
              {step === "respond" && "💬 Learn Responses"}
              {step === "speak" && "🎤 Practice Speaking"}
              {step === "complete" && "🎉 Lesson Complete!"}
            </CardTitle>
            <CardDescription className="text-center text-lg font-medium capitalize text-gray-600 dark:text-gray-300">
              {sentence.topic}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Listen Step */}
            {step === "listen" && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-6">
                  <div className="bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 rounded-2xl p-8">
                    <div className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white leading-relaxed">
                      {sentenceTarget}
                    </div>
                  </div>

                  <div className="text-xl text-gray-600 dark:text-gray-300 italic font-medium">
                    {sentence.phonetic}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => playAudio(sentence.audio_url)}
                    className="gap-3 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                  >
                    <Volume2 className="h-6 w-6" />
                    Play Audio {listenCount > 0 && `(${listenCount}x)`}
                  </Button>
                </div>

                {showEnglish ? (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8 border-2 border-blue-200 dark:border-blue-800">
                    <p className="text-2xl md:text-3xl text-center font-semibold text-gray-700 dark:text-gray-200 mb-4">
                      {sentence.sentence_english}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEnglish(false)}
                      className="mx-auto flex gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      <EyeOff className="h-4 w-4" />
                      Hide translation
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowEnglish(true)}
                      className="gap-2 border-2 rounded-xl"
                    >
                      <Eye className="h-5 w-5" />
                      Show translation
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Vocabulary Step */}
            {step === "vocabulary" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center mb-8">
                  <div className="bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 rounded-2xl p-6 mb-4">
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">
                      {sentenceTarget}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => playAudio(sentence.audio_url)}
                    className="gap-2 rounded-xl"
                  >
                    <Volume2 className="h-4 w-4" />
                    Listen again
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-center uppercase tracking-wider text-gray-500 mb-6">
                    Key Vocabulary
                  </p>
                  {sentence.key_vocabulary.map((vocab, i) => (
                    <div
                      key={i}
                      className="group flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl hover:shadow-lg transition-all border-2 border-transparent hover:border-violet-300"
                    >
                      <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        {vocab.word}
                      </span>
                      <span className="text-xl text-gray-700 dark:text-gray-300 font-medium">
                        {vocab.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respond Step */}
            {step === "respond" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center space-y-4 mb-8">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
                    If Someone Says
                  </p>
                  <div className="bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 rounded-2xl p-6">
                    <div className="text-3xl font-bold text-gray-800 dark:text-white">
                      {sentenceTarget}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => playAudio(sentence.audio_url)}
                    className="gap-2 rounded-xl"
                  >
                    <Volume2 className="h-4 w-4" />
                    Play
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-center uppercase tracking-wider text-gray-500 mb-4">
                    You Can Respond With
                  </p>
                  {sentence.response_options.map((response, i) => (
                    <Card
                      key={i}
                      className={`cursor-pointer transition-all hover:scale-[1.02] ${
                        selectedResponse === i
                          ? "border-2 border-violet-500 shadow-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20"
                          : "border-2 border-transparent hover:border-violet-300 hover:shadow-lg"
                      }`}
                      onClick={() => setSelectedResponse(i)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl font-bold text-gray-800 dark:text-white">
                            {response.french}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              playAudio(response.audio_url);
                            }}
                            className="gap-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg"
                          >
                            <Volume2 className="h-5 w-5 text-violet-600" />
                          </Button>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                          {response.english}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Speak Step */}
            {step === "speak" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center space-y-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-500">
                    Practice Saying
                  </p>
                  <div className="bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 rounded-2xl p-8">
                    <div className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
                      {sentenceTarget}
                    </div>
                    <div className="text-xl text-gray-600 dark:text-gray-300 italic">
                      {sentence.phonetic}
                    </div>
                  </div>

                  {!isSupported && (
                    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border-2 border-yellow-300 dark:border-yellow-700">
                      <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200 mb-2">
                        <AlertCircle className="h-6 w-6" />
                        <span className="font-bold text-lg">
                          Speech recognition not supported
                        </span>
                      </div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Please use Chrome, Edge, or Safari. You can continue
                        without validation.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4 justify-center items-center flex-wrap">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => playAudio(sentence.audio_url)}
                      className="gap-2 rounded-xl border-2"
                    >
                      <Volume2 className="h-5 w-5" />
                      Listen
                    </Button>

                    {isSupported ? (
                      <Button
                        size="lg"
                        onClick={
                          isListening ? stopListening : handleStartRecording
                        }
                        className={`gap-3 px-8 py-6 text-lg rounded-xl shadow-lg ${
                          isListening
                            ? "bg-gradient-to-r from-red-500 to-pink-500 animate-pulse"
                            : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                        }`}
                        disabled={isPassed}
                      >
                        <Mic className="h-6 w-6" />
                        {isListening
                          ? "Listening..."
                          : isPassed
                            ? "Perfect!"
                            : "Record Yourself"}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => setIsPassed(true)}
                        className="gap-3 px-8 py-6 text-lg rounded-xl bg-gradient-to-r from-green-500 to-emerald-600"
                      >
                        <CheckCircle2 className="h-6 w-6" />
                        Mark as Complete
                      </Button>
                    )}
                  </div>

                  {transcript && (
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-xl">
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        You said:
                      </p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">
                        {transcript}
                      </p>
                    </div>
                  )}

                  {validationResult && (
                    <div
                      className={`p-6 rounded-2xl border-2 ${
                        validationResult.isCorrect
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {validationResult.isCorrect ? (
                          <>
                            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                            <span className="text-xl font-bold text-green-800 dark:text-green-200">
                              {validationResult.feedback}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                            <span className="text-xl font-bold text-red-800 dark:text-red-200">
                              {validationResult.feedback}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                        <span>Accuracy: {validationResult.similarity}%</span>
                        {attemptCount > 1 && (
                          <span>• Attempt {attemptCount}</span>
                        )}
                      </div>
                      {!validationResult.isCorrect && (
                        <Button
                          variant="outline"
                          onClick={handleTryAgain}
                          className="mt-4 w-full rounded-xl"
                        >
                          Try Again
                        </Button>
                      )}
                    </div>
                  )}

                  {isPassed && (
                    <div className="flex items-center justify-center gap-3 text-green-600 text-xl font-bold p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <CheckCircle2 className="h-7 w-7" />
                      <span>Perfect pronunciation! 🎉</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Complete Step */}
            {step === "complete" && (
              <div className="text-center space-y-8 animate-in fade-in duration-500">
                <div className="text-8xl mb-6">🎉</div>
                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-violet-100 to-pink-100 dark:from-violet-900/30 dark:to-pink-900/30 rounded-2xl p-8">
                    <div className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
                      {sentenceTarget}
                    </div>
                    <div className="text-2xl text-gray-600 dark:text-gray-300">
                      {sentence.sentence_english}
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border-2 border-green-300 dark:border-green-700">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <p className="text-2xl font-bold mb-3 text-green-800 dark:text-green-200">
                    Sentence Mastered!
                  </p>
                  <p className="text-lg text-gray-700 dark:text-gray-300">
                    You can now recognize and respond to this sentence in real
                    conversations.
                  </p>
                </div>

                <div className="space-y-3 mt-8">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
                    Review Responses
                  </p>
                  {sentence.response_options.map((response, i) => (
                    <div
                      key={i}
                      className="p-5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-between hover:shadow-lg transition-all"
                    >
                      <div>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">
                          {response.french}
                        </p>
                        <p className="text-gray-600 dark:text-gray-300">
                          {response.english}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => playAudio(response.audio_url)}
                        className="hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg"
                      >
                        <Volume2 className="h-5 w-5 text-violet-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation Button */}
            <div className="pt-8">
              <Button
                size="lg"
                onClick={handleContinue}
                className="w-full py-7 text-xl rounded-xl shadow-lg bg-gradient-to-r from-violet-500 to-pink-600 hover:from-violet-600 hover:to-pink-700 hover:shadow-xl transition-all"
                disabled={
                  (step === "listen" && listenCount < 2) ||
                  (step === "speak" && !isPassed)
                }
              >
                {step === "complete" ? (
                  <>
                    Next Lesson
                    <ArrowRight className="h-6 w-6 ml-2" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-6 w-6 ml-2" />
                  </>
                )}
              </Button>

              {step === "listen" && listenCount < 2 && (
                <p className="text-center text-gray-600 dark:text-gray-400 mt-4 font-medium">
                  👂 Listen at least {2 - listenCount} more time(s)
                </p>
              )}

              {step === "speak" && !isPassed && (
                <p className="text-center text-gray-600 dark:text-gray-400 mt-4 font-medium">
                  {isSupported
                    ? "🎤 Record yourself and get 75%+ accuracy to continue"
                    : "✓ Click 'Mark as Complete' to continue"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
