import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  Lesson,
  LessonWord,
  GenerateLessonRequest,
  LessonVocabularyContext,
  ContentType,
} from "@/types/lesson";
import { ProficiencyLevel } from "@/types";
import OpenAI from "openai";
import {
  selectWordsForLesson,
  generateLessonPrompt,
  analyzeTextWords,
  calculateComprehension,
  buildLessonContent,
  WORD_COUNT_BY_LEVEL,
  NEW_WORD_PERCENTAGE_BY_LEVEL,
} from "@/lib/lesson/engine";

// Template interface for cached lessons
interface LessonTemplate {
  id: string;
  language: string;
  level: string;
  topic: string | null;
  title: string;
  target_text: string;
  translation: string | null;
  audio_url: string | null;
  word_count: number;
  times_used: number;
}

/**
 * Generate TTS audio for a lesson text and upload to Supabase Storage
 */
async function generateTTSAudio(
  openai: OpenAI,
  text: string,
  lessonId: string,
  userId: string,
): Promise<string> {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova", // Good for French
    input: text,
    speed: 0.9, // Slightly slower for learners
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());

  // Upload to Supabase Storage
  const supabase = await createClient();
  const fileName = `${userId}/${lessonId}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-audio")
    .upload(fileName, buffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("lesson-audio").getPublicUrl(fileName);

  return publicUrl;
}

// Content type descriptions for the AI prompt
const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  narrative:
    "Write a short story or tale with a clear beginning, middle, and end. Include characters and a simple plot.",
  dialogue:
    "Write a natural conversation between 2-3 people. Use quotation marks and speaker labels. Include realistic exchanges.",
  descriptive:
    "Write a vivid description of a place, scene, or experience. Use sensory details and imagery.",
  opinion:
    "Write a short opinion piece or personal perspective on a topic. Include reasoning and examples.",
};

/**
 * Generate lesson text using OpenAI
 */
async function generateLessonText(
  openai: OpenAI,
  wordSelection: ReturnType<typeof selectWordsForLesson>,
  options: {
    wordCount: number;
    newWordPct: number;
    prioritizeReview: boolean;
    topic?: string;
    contentType?: ContentType;
  },
  level: ProficiencyLevel,
  language: string,
): Promise<{ title: string; text: string; translation: string }> {
  const prompt = generateLessonPrompt(
    wordSelection,
    {
      targetWordCount: options.wordCount,
      newWordPercentage: options.newWordPct,
      reviewWordPriority: options.prioritizeReview,
      topicPreference: options.topic,
      contentType: options.contentType,
    },
    level,
    language,
  );

  // Add content type instruction to system prompt if specified
  const contentTypeInstruction = options.contentType
    ? `\n${CONTENT_TYPE_INSTRUCTIONS[options.contentType] || ""}`
    : "";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generate natural ${language} lessons for ${level} learners.${contentTypeInstruction}
        Output JSON with format: {"title": "Lesson Title", "text": "The lesson text...", "translation": "English translation..."}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: Math.min(options.wordCount * 4, 1000),
  });

  const response = JSON.parse(completion.choices[0]?.message?.content || "{}");

  if (!response.text) {
    throw new Error("Failed to generate lesson text");
  }

  return {
    title: response.title || `${language.toUpperCase()} Lesson`,
    text: response.text,
    translation: response.translation || "",
  };
}

/**
 * POST /api/lesson/generate - Generate a new comprehensible input lesson
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check usage limits for free tier users
    const { canStartSession } = await import("@/lib/usage-limits");
    const usageStatus = await canStartSession(user.id, "main");

    if (!usageStatus.allowed) {
      return NextResponse.json(
        {
          error: "Daily limit reached",
          message:
            "You've reached your daily lesson limit. Upgrade to Premium for unlimited access.",
          limitReached: true,
          limit: usageStatus.limit,
          currentCount: usageStatus.currentCount,
        },
        { status: 429 }, // 429 Too Many Requests
      );
    }

    // Require OpenAI API key - no local fallbacks
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey || openaiApiKey === "your_openai_api_key") {
      return NextResponse.json(
        {
          error:
            "OpenAI API key is required for lesson generation. Please configure OPENAI_API_KEY in your environment.",
        },
        { status: 503 },
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const body = await request.json();
    const {
      language = "fr",
      level,
      topic,
      contentType,
      wordCountTarget,
      prioritizeReview = true,
    } = body as GenerateLessonRequest;

    // Get user's profile for defaults
    const { data: profile } = await supabase
      .from("profiles")
      .select("proficiency_level, target_language, interests")
      .eq("id", user.id)
      .single();

    const userLevel = (level ||
      profile?.proficiency_level ||
      "A1") as ProficiencyLevel;
    const targetLanguage = language || profile?.target_language || "fr";
    const wordCount = wordCountTarget || WORD_COUNT_BY_LEVEL[userLevel];
    const newWordPct = NEW_WORD_PERCENTAGE_BY_LEVEL[userLevel];

    // Select a topic from user's interests if not explicitly provided
    const userInterests = profile?.interests || [];
    const selectedTopic =
      topic ||
      (userInterests.length > 0
        ? userInterests[Math.floor(Math.random() * userInterests.length)]
        : undefined);

    // Fetch user's known words
    const { data: userWords, error: wordsError } = await supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", targetLanguage);

    if (wordsError) {
      console.error("Error fetching user words:", wordsError);
    }

    // ========================================
    // TEMPLATE CACHING: Check for existing template
    // ========================================
    let lessonTitle: string;
    let lessonText: string;
    let translation: string;
    let audioUrl: string;
    let usedTemplate = false;
    let templateId: string | null = null;

    // Try to find an existing template with matching criteria
    const { data: existingTemplate } = await supabase
      .from("lesson_templates")
      .select("*")
      .eq("language", targetLanguage)
      .eq("level", userLevel)
      .eq("topic", selectedTopic || "")
      .single();

    // Generate lesson ID early (needed for audio)
    const lessonId = `lesson-${Date.now()}`;

    if (existingTemplate && existingTemplate.audio_url) {
      // USE EXISTING TEMPLATE - saves OpenAI API calls!
      console.log(
        `Using cached template: ${existingTemplate.id} (used ${existingTemplate.times_used} times)`,
      );

      lessonTitle = existingTemplate.title;
      lessonText = existingTemplate.target_text;
      translation = existingTemplate.translation || "";
      audioUrl = existingTemplate.audio_url;
      usedTemplate = true;
      templateId = existingTemplate.id;

      // Update template usage stats
      await supabase
        .from("lesson_templates")
        .update({
          times_used: (existingTemplate.times_used || 1) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", existingTemplate.id);
    } else {
      // NO TEMPLATE FOUND - Generate new content
      console.log(
        `No template found for ${targetLanguage}/${userLevel}/${selectedTopic || "general"} - generating new...`,
      );

      // Select words for the lesson
      const wordSelection = selectWordsForLesson(userWords || [], {
        targetWordCount: wordCount,
        newWordPercentage: newWordPct,
        reviewWordPriority: prioritizeReview,
      });

      // Generate lesson text using OpenAI
      const generatedContent = await generateLessonText(
        openai,
        wordSelection,
        {
          wordCount,
          newWordPct,
          prioritizeReview,
          topic: selectedTopic,
          contentType,
        },
        userLevel,
        targetLanguage,
      );

      lessonTitle = generatedContent.title;
      lessonText = generatedContent.text;
      translation = generatedContent.translation;

      // Generate TTS audio
      audioUrl = await generateTTSAudio(openai, lessonText, lessonId, user.id);

      // SAVE AS NEW TEMPLATE for future users
      const { data: newTemplate, error: templateError } = await supabase
        .from("lesson_templates")
        .insert({
          language: targetLanguage,
          level: userLevel,
          topic: selectedTopic || "",
          title: lessonTitle,
          target_text: lessonText,
          translation: translation,
          audio_url: audioUrl,
          word_count: wordCount,
          generation_params: {
            targetWordCount: wordCount,
            newWordPercentage: newWordPct,
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (templateError) {
        // Non-fatal: template caching failed but lesson still works
        console.warn("Failed to save lesson template:", templateError.message);
      } else {
        templateId = newTemplate?.id || null;
        console.log(`Saved new template: ${templateId}`);
      }
    }

    // ========================================
    // ANALYZE WORDS FOR THIS SPECIFIC USER
    // Word analysis is always per-user since it depends on their vocabulary
    // ========================================

    // Analyze text to identify words
    const analyzedWords = analyzeTextWords(
      lessonText,
      userWords || [],
      targetLanguage,
    );
    const comprehension = calculateComprehension(analyzedWords);

    // Build vocabulary context for 10-phase lesson structure
    const knownWords = analyzedWords.filter(
      (w) => w.userKnowledge === "known" || w.userKnowledge === "mastered",
    );
    const reviewWords = analyzedWords.filter((w) => w.isDueForReview);
    const newWords = analyzedWords.filter((w) => w.isNew);

    // Fetch previous review items for warmup (from user's recent lessons)
    const { data: recentLessons } = await supabase
      .from("lessons")
      .select("words")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(3);

    const previousReviewItems: string[] = [];
    if (recentLessons && recentLessons.length > 0) {
      recentLessons.forEach((lesson: any) => {
        if (lesson.words && Array.isArray(lesson.words)) {
          lesson.words
            .filter((w: any) => w.isDueForReview || w.isNew)
            .slice(0, 3)
            .forEach((w: any) => {
              if (w.lemma && !previousReviewItems.includes(w.lemma)) {
                previousReviewItems.push(w.lemma);
              }
            });
        }
      });
    }

    const vocabularyContext: LessonVocabularyContext = {
      targetLanguage,
      cefrLevel: userLevel,
      knownVocabList: knownWords.map((w) => w.lemma),
      reviewVocabList: reviewWords.map((w) => w.lemma),
      newVocabTarget: newWords.slice(0, 5).map((w) => w.lemma),
      maxSentenceLength: userLevel === "A0" || userLevel === "A1" ? 8 : 15,
      previousReviewItems: previousReviewItems.slice(0, 3),
    };

    // Build the full 10-phase lesson content structure
    const lessonContent = buildLessonContent(
      lessonText,
      audioUrl,
      vocabularyContext,
      analyzedWords,
    );

    // Create lesson object with 10-phase content
    const lesson: Lesson = {
      id: lessonId,
      userId: user.id,
      targetText: lessonText,
      translation,
      audioUrl,
      language: targetLanguage,
      level: userLevel,
      title: lessonTitle,
      words: analyzedWords,
      totalWords: analyzedWords.length,
      newWordCount: analyzedWords.filter((w) => w.isNew).length,
      reviewWordCount: analyzedWords.filter((w) => w.isDueForReview).length,
      knownWordCount: analyzedWords.filter((w) => !w.isNew && !w.isDueForReview)
        .length,
      comprehensionPercentage: comprehension,
      currentPhase: "spaced-retrieval-warmup",
      listenCount: 0,
      completed: false,
      createdAt: new Date().toISOString(),
      content: lessonContent,
      generationParams: {
        targetWordCount: wordCount,
        newWordPercentage: newWordPct,
        reviewWordPriority: prioritizeReview,
        topicPreference: topic,
      },
    };

    // Save lesson to Supabase database
    const { data: insertedLesson, error: insertError } = await supabase
      .from("lessons")
      .insert({
        id: lesson.id,
        user_id: user.id,
        title: lesson.title,
        target_text: lesson.targetText,
        translation: lesson.translation,
        audio_url: lesson.audioUrl,
        language: lesson.language,
        level: lesson.level,
        words: lesson.words,
        total_words: lesson.totalWords,
        new_word_count: lesson.newWordCount,
        review_word_count: lesson.reviewWordCount,
        known_word_count: lesson.knownWordCount,
        comprehension_percentage: lesson.comprehensionPercentage,
        current_phase: lesson.currentPhase,
        listen_count: lesson.listenCount,
        completed: lesson.completed,
        content: lesson.content,
        generation_params: lesson.generationParams,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving lesson to database:", insertError);
      // Log helpful message about missing table
      if (
        insertError.code === "42P01" ||
        insertError.message?.includes("does not exist")
      ) {
        console.error(
          "The 'lessons' table may not exist. Run add_lessons_table.sql migration.",
        );
      }
      // Still return the lesson but warn the client
      return NextResponse.json({
        lesson,
        warning:
          "Lesson generated but not saved to database. Progress will not persist.",
        wordStats: {
          newWordCount: lesson.newWordCount,
          reviewWordCount: lesson.reviewWordCount,
          knownWordCount: lesson.knownWordCount,
        },
      });
    }

    console.log("Lesson saved to database:", insertedLesson?.id);

    return NextResponse.json({
      lesson,
      wordStats: {
        newWordCount: lesson.newWordCount,
        reviewWordCount: lesson.reviewWordCount,
        knownWordCount: lesson.knownWordCount,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/lesson/generate:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
