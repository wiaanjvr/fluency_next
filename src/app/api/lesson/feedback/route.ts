import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/ai-client";
import { redis } from "@/lib/redis";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/** Shape of conversation state stored in Redis */
interface ConversationState {
  targetText: string;
  translation: string;
  level: string;
  history: { role: string; text: string }[];
}

/** TTL for conversation state: 30 minutes */
const CONVERSATION_TTL = 30 * 60;

/**
 * POST /api/lesson/feedback - Generate guided teacher conversation feedback
 *
 * This simulates a real teacher-student dialogue where the teacher:
 * - Listens carefully to what the student says
 * - Helps with small mistakes (like using English words)
 * - Asks follow-up "what if" questions to deepen understanding
 * - Guides the conversation through 3 turns
 *
 * Conversation state (targetText, translation, history) is stored server-side
 * in Redis to prevent prompt injection and reduce payload size.
 * Client sends only: { lessonId, userResponse } (and optionally targetText,
 * translation, level on the first turn to initialize the state).
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

    // ── Rate-limit: 30 requests / hour per user ─────────────────────────
    const rl = await checkRateLimit(user.id, "feedback");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const body = await request.json();
    const {
      lessonId,
      targetText: clientTargetText,
      translation: clientTranslation,
      userResponse,
      conversationHistory: clientHistory,
      level: clientLevel,
      turnNumber,
    } = body;

    if (!userResponse) {
      return NextResponse.json(
        { error: "userResponse is required" },
        { status: 400 },
      );
    }

    // ─── Server-side conversation state ──────────────────────────────────
    const stateKey = `conv:${user.id}:${lessonId || "default"}`;
    let state: ConversationState | null = null;

    try {
      state = await redis.get<ConversationState>(stateKey);
    } catch {
      // Redis miss — will initialize below
    }

    if (!state) {
      // First turn or state expired: initialize from client-provided data
      if (!clientTargetText) {
        return NextResponse.json(
          { error: "targetText is required on the first turn" },
          { status: 400 },
        );
      }
      state = {
        targetText: clientTargetText,
        translation: clientTranslation || "",
        level: clientLevel || "A1",
        history: [],
      };
    }

    const { targetText, translation, level, history } = state;

    // Determine the current turn number (1-3)
    const currentTurn =
      turnNumber || history.filter((t) => t.role === "user").length + 1;

    // Build conversation context from server-side history
    const historyContext = history.length
      ? history
          .map(
            (turn) =>
              `${turn.role === "assistant" ? "Teacher" : "Student"}: ${turn.text}`,
          )
          .join("\n")
      : "";

    // Turn-specific guidance for the teacher
    const turnGuidance = {
      1: `This is the student's FIRST response. Focus on:
- Warmly acknowledging whatever they understood
- If they used English words, gently provide the French: "I heard you say 'X' - in French we say 'Y'"
- Ask ONE simple follow-up question about the content or situation`,

      2: `This is the student's SECOND response. Focus on:
- Build on what they said in their first answer
- If they used English words, teach the French equivalents with a short example
- Ask a "what if" scenario question: "Et si..." (What if the person had... / What would happen if...)
- Explore the context or situation more deeply`,

      3: `This is the student's THIRD and FINAL response. Focus on:
- Summarize what they've demonstrated understanding of
- Give one final vocabulary tip if they used English words
- Provide encouragement: "Excellent work! You understood [key points]"
- End with: "Ready to see the full text?"
- Do NOT ask another question - this is the wrap-up`,
    };

    const prompt = `You are a warm, patient French teacher having a real conversation with a ${level} student about a listening exercise they just completed.

=== THE AUDIO TEXT (student hasn't seen this yet) ===
French: "${targetText}"
English meaning: "${translation || "Not provided"}"

=== CONVERSATION SO FAR ===
${historyContext || "(This is the beginning of the conversation)"}

=== STUDENT'S LATEST RESPONSE ===
"${userResponse}"

=== YOUR ROLE AS TEACHER (Turn ${currentTurn} of 3) ===
${turnGuidance[currentTurn as 1 | 2 | 3] || turnGuidance[3]}

=== IMPORTANT BEHAVIORS ===
1. ENGLISH WORD DETECTION: If the student uses ANY English words (because they don't know the French), you MUST:
   - Identify each English word
   - Provide the French translation
   - Give a brief, natural example if helpful
   Example: "I noticed you said 'morning' - en français, on dit 'le matin'. Like: 'Je me lève le matin.'"

2. SCENARIO QUESTIONS (Turn 2 especially): Use "Et si..." to deepen understanding:
   - "Et si la personne était en retard?" (What if the person was late?)
   - "Qu'est-ce qui se passerait si...?" (What would happen if...?)
   
3. GENTLE CORRECTIONS: If they misunderstood something:
   - Don't say "wrong" - instead say "Ah, actually..." or "That's close! The text actually said..."

4. LENGTH: Keep responses to 2-3 sentences maximum. Students need concise feedback.

5. ENCOURAGEMENT: Be genuinely warm and supportive. Learning a language is hard!

Return a JSON object:
{
  "response": "Your teacher response (2-3 sentences max)",
  "englishWordsDetected": [
    { "english": "word", "french": "mot", "example": "Un mot français" }
  ],
  "questionType": "comprehension" | "scenario" | "vocabulary" | "wrap-up",
  "vocabularyHint": { "word": "key word", "translation": "translation", "context": "from the text" } (optional),
  "comprehensionScore": 0-100
}

Return ONLY valid JSON, no markdown.`;

    let feedback;
    try {
      feedback = await generateJSON<{
        response?: string;
        englishWordsDetected?: Array<{
          english: string;
          french: string;
          example?: string;
        }>;
        questionType?: string;
        vocabularyHint?: { word: string; translation: string; context: string };
        comprehensionScore?: number;
      }>({
        contents: prompt,
        systemInstruction:
          "You are a warm, encouraging French teacher. You listen carefully, help with vocabulary gaps, and guide students through understanding. Return only valid JSON.",
        maxOutputTokens: 600,
        temperature: 0.7,
      });
    } catch (parseError) {
      console.error("Failed to generate/parse feedback:", parseError);
      // Fallback response based on turn
      const fallbacks = {
        1: "Thank you for sharing! I'd love to hear more. What else caught your attention in the audio?",
        2: "Interesting! Et si on imaginait une situation différente - what would change?",
        3: "Excellent work on this conversation! You've shown good understanding. Ready to see the full text?",
      };
      feedback = {
        response: fallbacks[currentTurn as 1 | 2 | 3] || fallbacks[3],
        questionType: currentTurn === 3 ? "wrap-up" : "comprehension",
        englishWordsDetected: [],
        comprehensionScore: 50,
      };
    }

    // Ensure englishWordsDetected array exists
    if (!feedback.englishWordsDetected) {
      feedback.englishWordsDetected = [];
    }

    // ─── Update server-side conversation state ───────────────────────────
    history.push({ role: "user", text: userResponse });
    history.push({ role: "assistant", text: feedback.response || "" });

    const updatedState: ConversationState = {
      targetText,
      translation,
      level,
      history,
    };

    try {
      await redis.set(stateKey, updatedState, { ex: CONVERSATION_TTL });
    } catch {
      // Non-fatal: state not persisted but conversation still works
      console.warn("Failed to persist conversation state to Redis");
    }

    return NextResponse.json(feedback, { headers: rateLimitHeaders(rl) });
  } catch (error) {
    console.error("Error generating feedback:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 },
    );
  }
}
