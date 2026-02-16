import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/translate - Translate text
 * For translation, we'll use a simple dictionary lookup or external API
 */
export async function POST(request: NextRequest) {
  try {
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

    // Use OpenAI for translation
    // Requires OPENAI_API_KEY in environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 500 },
      );
    }

    // Compose prompt for translation
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}. Only return the translation, nothing else.\nText: ${text}`;

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a translation engine." },
            { role: "user", content: prompt },
          ],
          max_tokens: 100,
          temperature: 0.2,
        }),
      },
    );

    if (!openaiRes.ok) {
      return NextResponse.json(
        { error: "OpenAI translation failed" },
        { status: 500 },
      );
    }

    const openaiData = await openaiRes.json();
    const translation = openaiData.choices?.[0]?.message?.content?.trim() || "";

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
