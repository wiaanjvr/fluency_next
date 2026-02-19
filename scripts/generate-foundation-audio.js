require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});
require("dotenv").config(); // fallback to .env

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY not found in environment. Please set it in .env.local or .env.",
  );
  process.exit(1);
}

const OpenAI = require("openai").default;
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs/promises");
const path = require("path");

/**
 * Foundation Audio Generation Script
 *
 * Generates OpenAI HD TTS audio for all foundation vocabulary words and sentences
 * across French, German, and Italian. Uploads to Supabase storage and seeds database.
 *
 * Usage: node scripts/generate-foundation-audio.js
 */

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // Use service role for admin operations
);

// OpenAI TTS voice mapping for each language
const VOICE_MAPPING = {
  fr: "nova", // Female French voice
  de: "onyx", // Male German voice
  it: "shimmer", // Female Italian voice
};

/**
 * Sanitize filename to remove special characters
 * Convert accented characters to ASCII equivalent (e.g., é -> e, ç -> c)
 */
function sanitizeFilename(text) {
  return text
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/[^\w\s-]/g, "") // Remove non-word characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/-+/g, "_") // Replace hyphens with underscores
    .toLowerCase();
}

/**
 * Generate audio using OpenAI TTS HD
 */
async function generateAudio(text, language) {
  console.log(`  Generating audio for: "${text}" (${language})`);

  const mp3 = await openai.audio.speech.create({
    model: "tts-1-hd",
    voice: VOICE_MAPPING[language],
    input: text,
    speed: 0.9, // Slightly slower for learning
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  return buffer;
}

/**
 * Upload audio to Supabase storage
 */
async function uploadAudio(buffer, filePath) {
  const { data, error } = await supabase.storage
    .from("foundation-audio")
    .upload(filePath, buffer, {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`  Error uploading ${filePath}:`, error);
    return null;
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("foundation-audio").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Generate and upload audio for a word
 */
async function processWord(word, language) {
  // Generate word audio
  const wordText = word.word;
  const sanitizedWord = sanitizeFilename(wordText);
  const wordAudio = await generateAudio(wordText, language);
  const wordFilePath = `${language}/words/${word.rank}_${sanitizedWord}.mp3`;
  const wordAudioUrl = await uploadAudio(wordAudio, wordFilePath);

  // Wait a bit to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate sentence audio
  let sentenceText =
    word.exampleSentence?.french ||
    word.exampleSentence?.german ||
    word.exampleSentence?.italian ||
    "";

  // If sentence is empty, create a fallback
  if (!sentenceText || sentenceText.trim() === "") {
    if (language === "fr") {
      sentenceText = `Le mot ${wordText}.`;
    } else if (language === "de") {
      sentenceText = `Das Wort ${wordText}.`;
    } else if (language === "it") {
      sentenceText = `La parola ${wordText}.`;
    }
  }

  const sentenceAudio = await generateAudio(sentenceText, language);
  const sentenceFilePath = `${language}/sentences/${word.rank}_${sanitizedWord}.mp3`;
  const sentenceAudioUrl = await uploadAudio(sentenceAudio, sentenceFilePath);

  // Wait a bit to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { wordAudioUrl, sentenceAudioUrl };
}

/**
 * Insert word and sentence into database
 */
async function insertWordToDatabase(
  word,
  language,
  wordAudioUrl,
  sentenceAudioUrl,
) {
  // Upsert word
  const { data: wordData, error: wordError } = await supabase
    .from("foundation_words")
    .upsert(
      {
        word: word.word,
        lemma: word.lemma,
        language,
        rank: word.rank,
        pos: word.pos,
        translation: word.translation,
        image_keyword: word.imageKeyword,
        imageability: word.imageability,
        category: word.category,
        phonetic: word.phonetic || null,
        audio_url: wordAudioUrl,
      },
      { onConflict: ["language", "word", "rank"] },
    )
    .select()
    .single();

  if (wordError) {
    console.error(`  Error upserting word ${word.word}:`, wordError);
    return;
  }

  // Insert sentence
  let sentenceText =
    word.exampleSentence?.french ||
    word.exampleSentence?.german ||
    word.exampleSentence?.italian ||
    "";

  // If sentence is empty, create a fallback
  if (!sentenceText || sentenceText.trim() === "") {
    if (language === "fr") {
      sentenceText = `Le mot ${word.word}.`;
    } else if (language === "de") {
      sentenceText = `Das Wort ${word.word}.`;
    } else if (language === "it") {
      sentenceText = `La parola ${word.word}.`;
    }
  }

  // Upsert sentence
  const { error: sentenceError } = await supabase
    .from("foundation_sentences")
    .upsert(
      {
        word_id: wordData.id,
        target_language_text: sentenceText,
        english_translation: word.exampleSentence?.english,
        audio_url: sentenceAudioUrl,
      },
      { onConflict: ["word_id", "target_language_text"] },
    );

  if (sentenceError) {
    console.error(
      `  Error upserting sentence for ${word.word}:`,
      sentenceError,
    );
  }
}

/**
 * Load raw word data from JSON files
 */
async function loadRawWords(language) {
  const langName =
    language === "fr" ? "french" : language === "de" ? "german" : "italian";
  const filePath = path.join(
    __dirname,
    `../src/data/common-${langName}-words.json`,
  );
  const fileContent = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(fileContent);
  return data.words || [];
}

/**
 * French example sentences
 */
const FRENCH_EXAMPLES = {
  le: { french: "Le chat dort.", english: "The cat sleeps." },
  de: { french: "Le livre de papa.", english: "Dad's book." },
  un: { french: "Un homme marche.", english: "A man walks." },
  du: { french: "Du pain frais.", english: "Some fresh bread." },
  être: { french: "Je veux être libre.", english: "I want to be free." },
  avoir: {
    french: "Je veux avoir confiance.",
    english: "I want to have confidence.",
  },
  faire: { french: "Je veux faire cela.", english: "I want to do that." },
  dire: { french: "Je veux dire merci.", english: "I want to say thanks." },
  pouvoir: {
    french: "Il veut pouvoir aider.",
    english: "He wants to be able to help.",
  },
  aller: { french: "Je veux aller là-bas.", english: "I want to go there." },
  voir: { french: "Je veux voir ça.", english: "I want to see that." },
  vouloir: {
    french: "Il faut vouloir réussir.",
    english: "One must want to succeed.",
  },
  savoir: {
    french: "Je veux savoir pourquoi.",
    english: "I want to know why.",
  },
  sortir: {
    french: "Je veux sortir maintenant.",
    english: "I want to go out now.",
  },
  venir: { french: "Je veux venir aussi.", english: "I want to come too." },
  croire: { french: "Je veux croire ça.", english: "I want to believe that." },
  demander: {
    french: "Je veux demander pardon.",
    english: "I want to ask forgiveness.",
  },
  trouver: { french: "Je veux trouver ça.", english: "I want to find that." },
  parler: {
    french: "Je veux parler maintenant.",
    english: "I want to speak now.",
  },
  homme: { french: "L'homme travaille.", english: "The man works." },
  an: { french: "J'ai dix ans.", english: "I am ten years old." },
  monde: { french: "Le monde est grand.", english: "The world is big." },
  année: {
    french: "Cette année est belle.",
    english: "This year is beautiful.",
  },
  temps: { french: "Le temps passe vite.", english: "Time flies." },
  jour: { french: "C'est un beau jour.", english: "It's a beautiful day." },
  chose: { french: "C'est une bonne chose.", english: "It's a good thing." },
  vie: { french: "La vie est belle.", english: "Life is beautiful." },
  main: { french: "J'ai deux mains.", english: "I have two hands." },
  ville: { french: "La ville est grande.", english: "The city is big." },
  fille: { french: "La fille danse.", english: "The girl dances." },
  heure: { french: "Quelle heure est-il?", english: "What time is it?" },
  semaine: {
    french: "Une semaine a sept jours.",
    english: "A week has seven days.",
  },
};

/**
 * Get example sentence for a word, with fallback
 */
function getExampleSentence(word, language) {
  let examples = {};

  if (language === "fr") {
    examples = FRENCH_EXAMPLES;
  } else if (language === "de") {
    examples = {}; // Would load German examples table
  } else if (language === "it") {
    examples = {}; // Would load Italian examples table
  }

  const sentence = examples[word];

  // If found, return the sentence with the correct language key
  if (sentence) {
    if (language === "fr") {
      return { french: sentence.french, english: sentence.english };
    } else if (language === "de") {
      return { german: sentence.german, english: sentence.english };
    } else if (language === "it") {
      return { italian: sentence.italian, english: sentence.english };
    }
  }

  // Fallback: create a simple sentence using the word
  if (language === "fr") {
    return { french: `Le mot ${word}.`, english: `The word ${word}.` };
  } else if (language === "de") {
    return { german: `Das Wort ${word}.`, english: `The word ${word}.` };
  } else if (language === "it") {
    return { italian: `La parola ${word}.`, english: `The word ${word}.` };
  }

  return { french: `Le mot ${word}.`, english: `The word ${word}.` };
}

/**
 * Load and process the foundation vocabulary from TypeScript file
 * (using dynamic import)
 */
async function getFoundationVocabulary(rawWords, language) {
  // Filter to only verbs and nouns, take first 100
  const verbsAndNouns = rawWords.filter(
    (w) => w.pos === "verb" || w.pos === "noun",
  );
  const top100 = verbsAndNouns.slice(0, 100);

  return top100.map((raw) => {
    const example = getExampleSentence(raw.word, language);
    return {
      word: raw.word,
      lemma: raw.lemma,
      rank: raw.rank,
      pos: raw.pos,
      translation: example.english,
      exampleSentence: example,
      imageKeyword: raw.imageKeyword || raw.word,
      imageability: raw.imageability || "medium",
      category: raw.pos === "verb" ? "verb" : "noun",
      phonetic: raw.phonetic || null,
    };
  });
}

/**
 * Process all words for a language
 */
async function processLanguage(language) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing ${language.toUpperCase()} Foundation Vocabulary`);
  console.log(`${"=".repeat(60)}\n`);

  // Load raw word data
  const rawWords = await loadRawWords(language);
  const words = await getFoundationVocabulary(rawWords, language);
  console.log(`Found ${words.length} words for ${language}\n`);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    console.log(
      `[${i + 1}/${words.length}] Processing: ${word.word} (rank ${word.rank})`,
    );

    try {
      // Generate and upload audio
      const { wordAudioUrl, sentenceAudioUrl } = await processWord(
        word,
        language,
      );

      // Insert into database
      await insertWordToDatabase(
        word,
        language,
        wordAudioUrl,
        sentenceAudioUrl,
      );

      console.log(`  ✅ Complete\n`);
    } catch (error) {
      console.error(`  ❌ Error processing word:`, error);
      console.log(`  Continuing with next word...\n`);
    }
  }

  console.log(`\n✅ Completed ${language.toUpperCase()}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log("Foundation Audio Generation Script");
  console.log("==================================\n");

  // Check environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY not found in environment");
    process.exit(1);
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("❌ Supabase credentials not found in environment");
    process.exit(1);
  }

  const languages = ["fr", "de", "it"];

  for (const language of languages) {
    await processLanguage(language);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ ALL LANGUAGES COMPLETED");
  console.log("=".repeat(60));
}

// Run the script
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
