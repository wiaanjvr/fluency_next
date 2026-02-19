import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/ai-client";

/**
 * POST /api/translate - Translate text
 * For translation, we'll use a simple dictionary lookup or external API
 */
export async function POST(request: NextRequest) {
  try {
    // Use Gemini for translation via ai-client singleton
    const { text, sourceLang, targetLang } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // For now, we'll use a simple approach. In production, you'd want to:
    // 1. Use Google Cloud Translation API
    // 2. Use DeepL API
    // 3. Use a local translation service
    // 4. Cache translations in the database

    // Simple dictionary lookup for common words (this is a placeholder)
    // In a real implementation, you'd call a translation API here

    // Example with fetch to a translation API (commented out - needs API key):
    /*
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error("Translation API error");
    }
    
    const data = await response.json();
    const translation = data.data.translations[0].translatedText;
    */

    // Compose prompt for translation (ai-client handles API key via singleton)
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only return the translation, nothing else.\nText: ${text}`;

    const translation = await generateText({
      contents: prompt,
      systemInstruction: "You are a translation engine.",
      temperature: 0.2,
      maxOutputTokens: 400,
    });

    if (!translation) {
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      translation,
      sourceLang,
      targetLang,
      originalText: text,
    });
  } catch (error) {
    console.error("Error in POST /api/translate:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
