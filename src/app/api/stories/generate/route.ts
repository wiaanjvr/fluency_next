import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ProficiencyLevel } from "@/types";
import { generateText } from "@/lib/ai-client";
import { redis } from "@/lib/redis";
import {
  selectWordsForGeneration,
  generateStoryPrompt,
  createStoryMetadata,
  validateGeneratedStory,
  getRecommendedWordCount,
  getRecommendedNewWordPercentage,
} from "@/lib/srs/story-generator";
import { getCachedProfile } from "@/lib/profile-cache";
import { consumeDailyBudget } from "@/lib/daily-budget";

/** Cache TTL for user_words in seconds */
const USER_WORDS_CACHE_TTL = 120; // 2 minutes

/**
 * Generate a simple mock story for development/fallback
 */
function generateMockStory(
  language: string,
  level: string,
  wordCount: number,
): string {
  const mockStories: Record<string, string> = {
    fr: `Le chat s'appelle Minou. Il est petit et noir. Minou aime jouer dans le jardin. Aujourd'hui, il fait beau. Le soleil brille. Minou court après un papillon. Le papillon est jaune et très joli. Minou saute, mais le papillon s'envole. Minou est fatigué maintenant. Il rentre à la maison pour dormir.`,
    es: `El gato se llama Miau. Es pequeño y negro. A Miau le gusta jugar en el jardín. Hoy hace buen tiempo. El sol brilla. Miau corre detrás de una mariposa. La mariposa es amarilla y muy bonita. Miau salta, pero la mariposa vuela. Miau está cansado ahora. Vuelve a casa para dormir.`,
    en: `The cat is named Whiskers. He is small and black. Whiskers likes to play in the garden. Today the weather is nice. The sun is shining. Whiskers runs after a butterfly. The butterfly is yellow and very pretty. Whiskers jumps, but the butterfly flies away. Whiskers is tired now. He goes home to sleep.`,
  };

  return mockStories[language] || mockStories["fr"];
}

/**
 * POST /api/stories/generate - Generate a new comprehensible input story
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

    // Absolute daily generation budget (applies to ALL tiers, including paid)
    const budgetResult = await consumeDailyBudget(user.id);
    if (!budgetResult.allowed) {
      return NextResponse.json(
        {
          error: "Daily generation budget exceeded",
          message: `You've reached the maximum of ${budgetResult.budget} generations per day. Please try again tomorrow.`,
          budgetExceeded: true,
          budget: budgetResult.budget,
          count: budgetResult.count,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const {
      language = "fr",
      level,
      topic,
      content_type,
      word_count_target,
      new_word_percentage,
      prioritize_review = true,
    } = body as {
      language?: string;
      level?: ProficiencyLevel;
      topic?: string;
      content_type?: string;
      word_count_target?: number;
      new_word_percentage?: number;
      prioritize_review?: boolean;
    };

    // Get user's profile for defaults (Redis-cached, 5 min TTL)
    const profile = await getCachedProfile(
      supabase,
      user.id,
      "proficiency_level, target_language",
    );

    const userLevel = level || profile?.proficiency_level || "A1";
    const targetLanguage = language || profile?.target_language || "fr";
    const wordCount = word_count_target || getRecommendedWordCount(userLevel);
    const newWordPct =
      new_word_percentage || getRecommendedNewWordPercentage(userLevel);

    // Fetch user's known words (with Redis cache)
    const wordsCacheKey = `user_words:${user.id}:${targetLanguage}`;
    let userWords: any[] | null = null;

    try {
      const cached = await redis.get<any[]>(wordsCacheKey);
      if (cached) userWords = cached;
    } catch {
      // Redis miss — fall through to DB
    }

    if (!userWords) {
      const { data: dbWords, error: wordsError } = await supabase
        .from("user_words")
        .select("*")
        .eq("user_id", user.id)
        .eq("language", targetLanguage);

      if (wordsError) {
        console.error("Error fetching user words:", wordsError);
        return NextResponse.json(
          { error: wordsError.message },
          { status: 500 },
        );
      }

      userWords = dbWords || [];

      // Cache for next request
      try {
        await redis.set(wordsCacheKey, userWords, { ex: USER_WORDS_CACHE_TTL });
      } catch {
        // Non-fatal
      }
    }

    console.log("User words count:", userWords?.length || 0);
    console.log("User level:", userLevel);
    console.log("Word count target:", wordCount);

    // Select words for the story
    const wordSelection = selectWordsForGeneration(userWords || [], {
      user_id: user.id,
      language: targetLanguage,
      level: userLevel,
      topic,
      word_count_target: wordCount,
      new_word_percentage: newWordPct,
      prioritize_review,
    });

    console.log("Word selection:", {
      knownWords: wordSelection.knownWords.length,
      reviewWords: wordSelection.reviewWords.length,
      newWords: wordSelection.newWords.length,
      allWords: wordSelection.allWords.length,
    });

    // Generate story prompt
    const prompt = generateStoryPrompt(wordSelection, {
      user_id: user.id,
      language: targetLanguage,
      level: userLevel,
      topic,
      content_type,
      word_count_target: wordCount,
      new_word_percentage: newWordPct,
      prioritize_review,
    });

    let storyContent: string;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    // Generate story using Gemini or fallback to mock
    if (googleApiKey && googleApiKey !== "your_google_api_key") {
      try {
        console.log("Generating story with Gemini...");

        storyContent = await generateText({
          contents: prompt,
          systemInstruction: `Create natural ${targetLanguage} stories for ${userLevel} learners. Keep it simple and engaging.`,
          temperature: 0.7,
          maxOutputTokens: 600,
        });

        if (!storyContent) {
          storyContent = "Error: No story generated";
        }

        console.log("Story generated successfully with Gemini");
      } catch (geminiError) {
        console.error("Gemini API error:", geminiError);
        // Fallback to mock story on Gemini error
        storyContent = generateMockStory(targetLanguage, userLevel, wordCount);
        console.log("Using fallback mock story due to Gemini error");
      }
    } else {
      // No valid API key - use mock story
      console.log("No Google API key - using mock story");
      storyContent = generateMockStory(targetLanguage, userLevel, wordCount);
    }

    // Generate title
    const title = topic
      ? `Histoire : ${topic}`
      : `Histoire ${targetLanguage.toUpperCase()} - ${userLevel}`;

    // Create metadata
    const metadata = createStoryMetadata(wordSelection, storyContent, {
      user_id: user.id,
      language: targetLanguage,
      level: userLevel,
      topic,
      word_count_target: wordCount,
      new_word_percentage: newWordPct,
      prioritize_review,
    });

    console.log("Story metadata:", metadata);

    // Save story to database
    const storyInsert = {
      user_id: user.id,
      title,
      content: storyContent,
      ...metadata,
    };

    console.log("Inserting story into database...");

    const { data: story, error: storyError } = await supabase
      .from("generated_stories")
      .insert(storyInsert)
      .select()
      .single();

    if (storyError) {
      console.error("Error saving story:", storyError);
      return NextResponse.json(
        { error: `Database error: ${storyError.message}` },
        { status: 500 },
      );
    }

    console.log("Story saved successfully:", story.id);

    // Initialize story progress
    const { error: progressError } = await supabase
      .from("story_progress")
      .insert({
        user_id: user.id,
        story_id: story.id,
        current_phase: "listen",
      });

    if (progressError) {
      console.error("Error creating story progress:", progressError);
      // Don't fail the request - just log the error
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error in POST /api/stories/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/stories/generate - Get user's generated stories
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const completed = searchParams.get("completed");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabase
      .from("generated_stories")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (completed !== null) {
      query = query.eq("completed", completed === "true");
    }

    const { data: stories, error } = await query;

    if (error) {
      console.error("Error fetching stories:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stories });
  } catch (error) {
    console.error("Error in GET /api/stories/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
