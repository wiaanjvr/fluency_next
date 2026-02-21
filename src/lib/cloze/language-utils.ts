// Stopwords and language utilities for cloze pipeline

export const STOPWORDS: Record<string, Set<string>> = {
  de: new Set([
    "der",
    "die",
    "das",
    "den",
    "dem",
    "des",
    "ein",
    "eine",
    "einer",
    "einem",
    "einen",
    "und",
    "oder",
    "aber",
    "denn",
    "weil",
    "wenn",
    "dass",
    "ob",
    "als",
    "wie",
    "so",
    "auch",
    "noch",
    "schon",
    "sehr",
    "nur",
    "nicht",
    "kein",
    "keine",
    "keinen",
    "keinem",
    "ich",
    "du",
    "er",
    "sie",
    "es",
    "wir",
    "ihr",
    "mich",
    "dich",
    "sich",
    "uns",
    "euch",
    "mir",
    "dir",
    "ihm",
    "ihr",
    "ihnen",
    "mein",
    "dein",
    "sein",
    "unser",
    "euer",
    "in",
    "an",
    "auf",
    "aus",
    "bei",
    "mit",
    "nach",
    "von",
    "zu",
    "für",
    "um",
    "über",
    "unter",
    "vor",
    "hinter",
    "neben",
    "zwischen",
    "ist",
    "sind",
    "war",
    "waren",
    "hat",
    "haben",
    "wird",
    "werden",
    "kann",
    "muss",
    "soll",
    "will",
    "darf",
    "mag",
    "ja",
    "nein",
    "hier",
    "da",
    "dort",
    "nun",
    "dann",
    "also",
    "im",
    "am",
    "zum",
    "zur",
    "vom",
    "beim",
  ]),
  fr: new Set([
    "le",
    "la",
    "les",
    "un",
    "une",
    "des",
    "du",
    "de",
    "au",
    "aux",
    "et",
    "ou",
    "mais",
    "donc",
    "car",
    "ni",
    "que",
    "qui",
    "quoi",
    "ce",
    "cette",
    "ces",
    "mon",
    "ma",
    "mes",
    "ton",
    "ta",
    "tes",
    "son",
    "sa",
    "ses",
    "notre",
    "nos",
    "votre",
    "vos",
    "leur",
    "leurs",
    "je",
    "tu",
    "il",
    "elle",
    "on",
    "nous",
    "vous",
    "ils",
    "elles",
    "me",
    "te",
    "se",
    "lui",
    "en",
    "y",
    "ne",
    "pas",
    "plus",
    "jamais",
    "rien",
    "aucun",
    "est",
    "sont",
    "était",
    "a",
    "ont",
    "avait",
    "fait",
    "être",
    "avoir",
    "dans",
    "sur",
    "sous",
    "avec",
    "pour",
    "par",
    "sans",
    "chez",
    "très",
    "bien",
    "mal",
    "peu",
    "trop",
    "assez",
    "aussi",
    "si",
    "oui",
    "non",
    "ici",
    "là",
  ]),
  it: new Set([
    "il",
    "lo",
    "la",
    "le",
    "li",
    "gli",
    "un",
    "uno",
    "una",
    "di",
    "del",
    "dello",
    "della",
    "dei",
    "degli",
    "delle",
    "al",
    "allo",
    "alla",
    "ai",
    "agli",
    "alle",
    "da",
    "dal",
    "dallo",
    "dalla",
    "dai",
    "dagli",
    "dalle",
    "in",
    "nel",
    "nello",
    "nella",
    "nei",
    "negli",
    "nelle",
    "su",
    "sul",
    "sullo",
    "sulla",
    "sui",
    "sugli",
    "sulle",
    "con",
    "per",
    "tra",
    "fra",
    "e",
    "o",
    "ma",
    "se",
    "che",
    "chi",
    "cui",
    "quale",
    "io",
    "tu",
    "lui",
    "lei",
    "noi",
    "voi",
    "loro",
    "mi",
    "ti",
    "ci",
    "vi",
    "si",
    "ne",
    "non",
    "più",
    "mai",
    "niente",
    "nulla",
    "è",
    "sono",
    "era",
    "ha",
    "hanno",
    "aveva",
    "essere",
    "avere",
    "questo",
    "questa",
    "questi",
    "queste",
    "quello",
    "quella",
    "molto",
    "poco",
    "troppo",
    "bene",
    "male",
    "sì",
    "no",
    "qui",
    "qua",
    "lì",
    "là",
  ]),
};

// Common verb suffixes by language for scoring
export const VERB_SUFFIXES: Record<string, string[]> = {
  de: ["en", "te", "iert", "ete", "est", "ung", "lich", "sten", "tet", "ten"],
  fr: [
    "er",
    "ait",
    "ons",
    "ent",
    "ais",
    "ait",
    "ions",
    "iez",
    "aient",
    "é",
    "ée",
    "és",
    "ées",
  ],
  it: [
    "are",
    "ere",
    "ire",
    "isce",
    "ava",
    "ato",
    "ata",
    "ati",
    "ate",
    "ando",
    "endo",
  ],
};

// Gutenberg book IDs per language
export const GUTENBERG_BOOKS: Record<string, { id: number; title: string }[]> =
  {
    de: [
      { id: 5200, title: "Die Verwandlung (Kafka)" },
      { id: 2229, title: "Faust (Goethe)" },
      { id: 17325, title: "Buddenbrooks (Mann)" },
    ],
    fr: [
      { id: 17489, title: "Les Misérables (Hugo)" },
      { id: 2413, title: "Madame Bovary (Flaubert)" },
      { id: 3090, title: "Maupassant Stories" },
    ],
    it: [
      { id: 1012, title: "Divina Commedia (Dante)" },
      { id: 29116, title: "Pirandello" },
      { id: 23700, title: "Decameron (Boccaccio)" },
    ],
  };

// Reddit subreddits per language
export const REDDIT_SUBREDDITS: Record<string, string[]> = {
  de: ["de", "ich_iel", "FragReddit"],
  fr: ["france", "francophonie"],
  it: ["italy"],
};

// News API search queries per language
export const NEWS_QUERIES: Record<string, string[]> = {
  de: ["Politik", "Wissenschaft", "Sport", "Kultur", "Wirtschaft"],
  fr: ["politique", "science", "sport", "culture", "économie"],
  it: ["politica", "scienza", "sport", "cultura", "economia"],
};

/**
 * Clean raw text: strip HTML, markdown, URLs, references
 */
export function cleanText(text: string): string {
  let cleaned = text;
  // Strip HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  // Strip markdown links/images
  cleaned = cleaned.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Strip URLs
  cleaned = cleaned.replace(/https?:\/\/\S+/g, "");
  // Strip parenthetical references like [1] or (2003)
  cleaned = cleaned.replace(/\[\d+\]/g, "");
  cleaned = cleaned.replace(/\(\d{4}\)/g, "");
  // Strip markdown formatting
  cleaned = cleaned.replace(/[*_~`#]+/g, "");
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

/**
 * Split text into sentences
 */
export function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Filter sentence for quality
 */
export function isValidSentence(sentence: string): boolean {
  const len = sentence.length;
  if (len < 40 || len > 150) return false;

  // No URLs
  if (/https?:\/\//.test(sentence)) return false;
  // No brackets
  if (/[\[\]{}]/.test(sentence)) return false;
  // Check percentage of numbers and punctuation
  const nonAlpha = sentence.replace(/[a-zA-ZÀ-ÿ\s]/g, "").length;
  if (nonAlpha / len > 0.3) return false;
  // Must end with sentence punctuation
  if (!/[.!?]$/.test(sentence)) return false;

  return true;
}

/**
 * Score a token for blank selection
 */
export function scoreToken(
  token: string,
  index: number,
  totalTokens: number,
  language: string,
): number {
  let score = 0;
  const cleanToken = token.replace(/[.,;:!?'"()]/g, "");
  if (cleanToken.length === 0) return -100;

  const lower = cleanToken.toLowerCase();

  // Check stopword
  if (STOPWORDS[language]?.has(lower)) {
    score -= 5;
  }

  // Check verb suffixes
  const suffixes = VERB_SUFFIXES[language] || [];
  for (const suffix of suffixes) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 1) {
      score += 3;
      break;
    }
  }

  // Check noun (capitalized in German; longer words in FR/IT)
  if (language === "de") {
    if (
      index > 0 &&
      cleanToken[0] === cleanToken[0].toUpperCase() &&
      cleanToken[0] !== cleanToken[0].toLowerCase()
    ) {
      score += 2;
    }
  } else {
    if (cleanToken.length > 5) {
      score += 2;
    }
  }

  // Longer words are more interesting
  if (cleanToken.length > 5) {
    score += 1;
  }

  // Proper noun penalty (capitalized but not first word)
  if (
    index > 0 &&
    cleanToken[0] === cleanToken[0].toUpperCase() &&
    cleanToken[0] !== cleanToken[0].toLowerCase()
  ) {
    if (language !== "de") {
      score -= 5;
    }
  }

  return score;
}

/**
 * Select the best word to blank out in a sentence
 */
export function selectBlankWord(
  sentence: string,
  language: string,
): { blankedSentence: string; answer: string; position: number } | null {
  const tokens = sentence.split(/\s+/);
  if (tokens.length < 4) return null;

  let bestScore = -Infinity;
  let bestIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const score = scoreToken(tokens[i], i, tokens.length, language);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex === -1 || bestScore < -2) return null;

  const answer = tokens[bestIndex].replace(/[.,;:!?'"()]+$/, "");
  if (answer.length < 2) return null;

  // Replace the token with ___ keeping trailing punctuation
  const trailingPunct = tokens[bestIndex].match(/[.,;:!?'"()]+$/)?.[0] || "";
  const blankedTokens = [...tokens];
  blankedTokens[bestIndex] = "___" + trailingPunct;

  return {
    blankedSentence: blankedTokens.join(" "),
    answer,
    position: bestIndex,
  };
}

/**
 * Assign CEFR level heuristically
 */
export function assignLevel(sentence: string, language: string): string {
  const tokens = sentence.split(/\s+/);
  const avgWordLen =
    tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length;
  const sentenceLen = sentence.length;

  // Subjunctive / conditional markers
  const subMarkers: Record<string, RegExp> = {
    de: /\b(würd|hätt|könnt|möcht|wär)\w*/i,
    fr: /\b(serai[st]?|aurai[st]?|ferai[st]?|pourrai[st]?|voudrai[st]?|subjoncti)\w*/i,
    it: /\b(sarei|avrei|farei|potrei|vorrei|congiuntivo)\w*/i,
  };

  if (subMarkers[language]?.test(sentence)) {
    return avgWordLen > 8 ? "C1" : "B2";
  }

  if (avgWordLen > 8) {
    return sentenceLen > 100 ? "C1" : "B2";
  }

  if (sentenceLen > 100) {
    return "B1";
  }

  if (avgWordLen > 5 || sentenceLen > 70) {
    return "B1";
  }

  if (sentenceLen < 50 && avgWordLen < 5) {
    return "A1";
  }

  return "A2";
}

/**
 * Delay utility for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
