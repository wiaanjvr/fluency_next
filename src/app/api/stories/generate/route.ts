import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ProficiencyLevel } from "@/types";
import OpenAI from "openai";
import {
  selectWordsForGeneration,
  generateStoryPrompt,
  createStoryMetadata,
  validateGeneratedStory,
  getRecommendedWordCount,
  getRecommendedNewWordPercentage,
} from "@/lib/srs/story-generator";

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

    // Get user's profile for defaults
    const { data: profile } = await supabase
      .from("profiles")
      .select("proficiency_level, target_language")
      .eq("id", user.id)
      .single();

    const userLevel = level || profile?.proficiency_level || "A1";
    const targetLanguage = language || profile?.target_language || "fr";
    const wordCount = word_count_target || getRecommendedWordCount(userLevel);
    const newWordPct =
      new_word_percentage || getRecommendedNewWordPercentage(userLevel);

    // Fetch user's known words
    const { data: userWords, error: wordsError } = await supabase
      .from("user_words")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", targetLanguage);

    if (wordsError) {
      console.error("Error fetching user words:", wordsError);
      return NextResponse.json({ error: wordsError.message }, { status: 500 });
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
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // Generate story using OpenAI or fallback to mock
    if (openaiApiKey && openaiApiKey !== "your_openai_api_key") {
      try {
        console.log("Generating story with OpenAI...");
        const openai = new OpenAI({ apiKey: openaiApiKey });

        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", // Cheapest model - perfect for simple stories
          messages: [
            {
              role: "system",
              content: `Create natural ${targetLanguage} stories for ${userLevel} learners. Keep it simple and engaging.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: Math.min(wordCount * 2, 500), // Cost optimization: limit output
        });

        storyContent =
          completion.choices[0]?.message?.content?.trim() ||
          "Error: No story generated";

        // Log token usage for cost tracking
        const usage = completion.usage;
        console.log("OpenAI usage:", {
          prompt_tokens: usage?.prompt_tokens,
          completion_tokens: usage?.completion_tokens,
          total_tokens: usage?.total_tokens,
          estimated_cost: `$${((usage?.total_tokens || 0) * 0.000002).toFixed(6)}`, // GPT-3.5-turbo pricing
        });
        console.log("Story generated successfully with OpenAI");
      } catch (openaiError) {
        console.error("OpenAI API error:", openaiError);
        // Fallback to mock story on OpenAI error
        storyContent = generateMockStory(targetLanguage, userLevel, wordCount);
        console.log("Using fallback mock story due to OpenAI error");
      }
    } else {
      // No valid API key - use mock story
      console.log("No OpenAI API key - using mock story");
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
