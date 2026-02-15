/**
 * Sentence Patterns Data
 * Pre-defined sentence patterns for Phase 1: Transition to Sentences
 *
 * These patterns use only the top 100 most frequent French words.
 * Each pattern demonstrates implicit grammar through repeated exposure.
 */

import {
  SentencePattern,
  SimpleSentence,
  HighlightedPart,
  PatternColorScheme,
} from "@/types/sentence-transition";

// ============================================================================
// COLOR SCHEMES FOR PATTERN HIGHLIGHTING
// ============================================================================

export const PATTERN_COLORS: Record<
  PatternColorScheme["partOfSpeech"],
  PatternColorScheme
> = {
  subject: {
    partOfSpeech: "subject",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    label: "Subject",
  },
  verb: {
    partOfSpeech: "verb",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    label: "Verb",
  },
  object: {
    partOfSpeech: "object",
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    label: "Object",
  },
  article: {
    partOfSpeech: "article",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    label: "Article",
  },
  adjective: {
    partOfSpeech: "adjective",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    label: "Adjective",
  },
  preposition: {
    partOfSpeech: "preposition",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    label: "Preposition",
  },
};

// ============================================================================
// SENTENCE PATTERNS
// ============================================================================

export const SENTENCE_PATTERNS: SentencePattern[] = [
  // ===== PATTERN 1: Subject + avoir + Article + Noun =====
  {
    id: "avoir-object",
    name: "I/You/He has...",
    description: "Express possession with avoir (to have)",
    template: "SUBJECT + avoir + ARTICLE + NOUN",
    structureColors: [
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.article,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "avoir-1",
        french: "J'ai un livre.",
        english: "I have a book.",
        highlightedParts: [
          { text: "J'", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "ai", type: "verb", startIndex: 2, endIndex: 4 },
          { text: "un", type: "article", startIndex: 5, endIndex: 7 },
          { text: "livre", type: "object", startIndex: 8, endIndex: 13 },
        ],
      },
      {
        id: "avoir-2",
        french: "Tu as une maison.",
        english: "You have a house.",
        highlightedParts: [
          { text: "Tu", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "as", type: "verb", startIndex: 3, endIndex: 5 },
          { text: "une", type: "article", startIndex: 6, endIndex: 9 },
          { text: "maison", type: "object", startIndex: 10, endIndex: 16 },
        ],
      },
      {
        id: "avoir-3",
        french: "Il a un ami.",
        english: "He has a friend.",
        highlightedParts: [
          { text: "Il", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "a", type: "verb", startIndex: 3, endIndex: 4 },
          { text: "un", type: "article", startIndex: 5, endIndex: 7 },
          { text: "ami", type: "object", startIndex: 8, endIndex: 11 },
        ],
      },
      {
        id: "avoir-4",
        french: "Elle a une voiture.",
        english: "She has a car.",
        highlightedParts: [
          { text: "Elle", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "a", type: "verb", startIndex: 5, endIndex: 6 },
          { text: "une", type: "article", startIndex: 7, endIndex: 10 },
          { text: "voiture", type: "object", startIndex: 11, endIndex: 18 },
        ],
      },
      {
        id: "avoir-5",
        french: "Nous avons un enfant.",
        english: "We have a child.",
        highlightedParts: [
          { text: "Nous", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "avons", type: "verb", startIndex: 5, endIndex: 10 },
          { text: "un", type: "article", startIndex: 11, endIndex: 13 },
          { text: "enfant", type: "object", startIndex: 14, endIndex: 20 },
        ],
      },
    ],
    implicitGrammar: "avoir conjugation + indefinite articles (un/une)",
  },

  // ===== PATTERN 2: Subject + être + Adjective =====
  {
    id: "etre-adjective",
    name: "I am/You are...",
    description: "Describe with être (to be) + adjective",
    template: "SUBJECT + être + ADJECTIVE",
    structureColors: [
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.adjective,
    ],
    examples: [
      {
        id: "etre-1",
        french: "Je suis grand.",
        english: "I am tall.",
        highlightedParts: [
          { text: "Je", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "suis", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "grand", type: "adjective", startIndex: 8, endIndex: 13 },
        ],
      },
      {
        id: "etre-2",
        french: "Tu es petit.",
        english: "You are small.",
        highlightedParts: [
          { text: "Tu", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "es", type: "verb", startIndex: 3, endIndex: 5 },
          { text: "petit", type: "adjective", startIndex: 6, endIndex: 11 },
        ],
      },
      {
        id: "etre-3",
        french: "Il est jeune.",
        english: "He is young.",
        highlightedParts: [
          { text: "Il", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "est", type: "verb", startIndex: 3, endIndex: 6 },
          { text: "jeune", type: "adjective", startIndex: 7, endIndex: 12 },
        ],
      },
      {
        id: "etre-4",
        french: "Elle est belle.",
        english: "She is beautiful.",
        highlightedParts: [
          { text: "Elle", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "est", type: "verb", startIndex: 5, endIndex: 8 },
          { text: "belle", type: "adjective", startIndex: 9, endIndex: 14 },
        ],
      },
      {
        id: "etre-5",
        french: "Nous sommes heureux.",
        english: "We are happy.",
        highlightedParts: [
          { text: "Nous", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "sommes", type: "verb", startIndex: 5, endIndex: 11 },
          { text: "heureux", type: "adjective", startIndex: 12, endIndex: 19 },
        ],
      },
    ],
    implicitGrammar: "être conjugation + predicate adjectives",
  },

  // ===== PATTERN 3: Subject + aller + Location =====
  {
    id: "aller-location",
    name: "I go to...",
    description: "Express movement with aller + preposition",
    template: "SUBJECT + aller + à/au/en + PLACE",
    structureColors: [
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.preposition,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "aller-1",
        french: "Je vais à la maison.",
        english: "I go to the house.",
        highlightedParts: [
          { text: "Je", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "vais", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "à la", type: "preposition", startIndex: 8, endIndex: 12 },
          { text: "maison", type: "object", startIndex: 13, endIndex: 19 },
        ],
      },
      {
        id: "aller-2",
        french: "Tu vas en ville.",
        english: "You go to the city.",
        highlightedParts: [
          { text: "Tu", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "vas", type: "verb", startIndex: 3, endIndex: 6 },
          { text: "en", type: "preposition", startIndex: 7, endIndex: 9 },
          { text: "ville", type: "object", startIndex: 10, endIndex: 15 },
        ],
      },
      {
        id: "aller-3",
        french: "Il va au travail.",
        english: "He goes to work.",
        highlightedParts: [
          { text: "Il", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "va", type: "verb", startIndex: 3, endIndex: 5 },
          { text: "au", type: "preposition", startIndex: 6, endIndex: 8 },
          { text: "travail", type: "object", startIndex: 9, endIndex: 16 },
        ],
      },
      {
        id: "aller-4",
        french: "Elle va à l'école.",
        english: "She goes to school.",
        highlightedParts: [
          { text: "Elle", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "va", type: "verb", startIndex: 5, endIndex: 7 },
          { text: "à l'", type: "preposition", startIndex: 8, endIndex: 12 },
          { text: "école", type: "object", startIndex: 12, endIndex: 17 },
        ],
      },
      {
        id: "aller-5",
        french: "Nous allons en France.",
        english: "We go to France.",
        highlightedParts: [
          { text: "Nous", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "allons", type: "verb", startIndex: 5, endIndex: 11 },
          { text: "en", type: "preposition", startIndex: 12, endIndex: 14 },
          { text: "France", type: "object", startIndex: 15, endIndex: 21 },
        ],
      },
    ],
    implicitGrammar: "aller conjugation + prepositions with places (à, au, en)",
  },

  // ===== PATTERN 4: Subject + voir + Object =====
  {
    id: "voir-object",
    name: "I see...",
    description: "Express perception with voir (to see)",
    template: "SUBJECT + voir + ARTICLE + NOUN",
    structureColors: [
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.article,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "voir-1",
        french: "Je vois un homme.",
        english: "I see a man.",
        highlightedParts: [
          { text: "Je", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "vois", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "un", type: "article", startIndex: 8, endIndex: 10 },
          { text: "homme", type: "object", startIndex: 11, endIndex: 16 },
        ],
      },
      {
        id: "voir-2",
        french: "Tu vois la femme.",
        english: "You see the woman.",
        highlightedParts: [
          { text: "Tu", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "vois", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "la", type: "article", startIndex: 8, endIndex: 10 },
          { text: "femme", type: "object", startIndex: 11, endIndex: 16 },
        ],
      },
      {
        id: "voir-3",
        french: "Il voit le monde.",
        english: "He sees the world.",
        highlightedParts: [
          { text: "Il", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "voit", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "le", type: "article", startIndex: 8, endIndex: 10 },
          { text: "monde", type: "object", startIndex: 11, endIndex: 16 },
        ],
      },
      {
        id: "voir-4",
        french: "Elle voit les enfants.",
        english: "She sees the children.",
        highlightedParts: [
          { text: "Elle", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "voit", type: "verb", startIndex: 5, endIndex: 9 },
          { text: "les", type: "article", startIndex: 10, endIndex: 13 },
          { text: "enfants", type: "object", startIndex: 14, endIndex: 21 },
        ],
      },
      {
        id: "voir-5",
        french: "Nous voyons le soleil.",
        english: "We see the sun.",
        highlightedParts: [
          { text: "Nous", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "voyons", type: "verb", startIndex: 5, endIndex: 11 },
          { text: "le", type: "article", startIndex: 12, endIndex: 14 },
          { text: "soleil", type: "object", startIndex: 15, endIndex: 21 },
        ],
      },
    ],
    implicitGrammar: "voir conjugation + definite/indefinite articles",
  },

  // ===== PATTERN 5: Subject + faire + Activity =====
  {
    id: "faire-activity",
    name: "I do/make...",
    description: "Express activities with faire (to do/make)",
    template: "SUBJECT + faire + ARTICLE + NOUN",
    structureColors: [
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.article,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "faire-1",
        french: "Je fais le travail.",
        english: "I do the work.",
        highlightedParts: [
          { text: "Je", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "fais", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "le", type: "article", startIndex: 8, endIndex: 10 },
          { text: "travail", type: "object", startIndex: 11, endIndex: 18 },
        ],
      },
      {
        id: "faire-2",
        french: "Tu fais un effort.",
        english: "You make an effort.",
        highlightedParts: [
          { text: "Tu", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "fais", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "un", type: "article", startIndex: 8, endIndex: 10 },
          { text: "effort", type: "object", startIndex: 11, endIndex: 17 },
        ],
      },
      {
        id: "faire-3",
        french: "Il fait du bien.",
        english: "He does good.",
        highlightedParts: [
          { text: "Il", type: "subject", startIndex: 0, endIndex: 2 },
          { text: "fait", type: "verb", startIndex: 3, endIndex: 7 },
          { text: "du", type: "article", startIndex: 8, endIndex: 10 },
          { text: "bien", type: "object", startIndex: 11, endIndex: 15 },
        ],
      },
      {
        id: "faire-4",
        french: "Elle fait une chose.",
        english: "She does a thing.",
        highlightedParts: [
          { text: "Elle", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "fait", type: "verb", startIndex: 5, endIndex: 9 },
          { text: "une", type: "article", startIndex: 10, endIndex: 13 },
          { text: "chose", type: "object", startIndex: 14, endIndex: 19 },
        ],
      },
      {
        id: "faire-5",
        french: "Nous faisons la vie.",
        english: "We make life.",
        highlightedParts: [
          { text: "Nous", type: "subject", startIndex: 0, endIndex: 4 },
          { text: "faisons", type: "verb", startIndex: 5, endIndex: 12 },
          { text: "la", type: "article", startIndex: 13, endIndex: 15 },
          { text: "vie", type: "object", startIndex: 16, endIndex: 19 },
        ],
      },
    ],
    implicitGrammar: "faire conjugation + partitive articles (du/de la)",
  },

  // ===== PATTERN 6: Definite Article + Noun + être + Adjective =====
  {
    id: "noun-is-adjective",
    name: "The X is...",
    description: "Describe nouns with definite articles",
    template: "ARTICLE + NOUN + être + ADJECTIVE",
    structureColors: [
      PATTERN_COLORS.article,
      PATTERN_COLORS.subject,
      PATTERN_COLORS.verb,
      PATTERN_COLORS.adjective,
    ],
    examples: [
      {
        id: "noun-adj-1",
        french: "Le livre est bon.",
        english: "The book is good.",
        highlightedParts: [
          { text: "Le", type: "article", startIndex: 0, endIndex: 2 },
          { text: "livre", type: "subject", startIndex: 3, endIndex: 8 },
          { text: "est", type: "verb", startIndex: 9, endIndex: 12 },
          { text: "bon", type: "adjective", startIndex: 13, endIndex: 16 },
        ],
      },
      {
        id: "noun-adj-2",
        french: "La vie est belle.",
        english: "Life is beautiful.",
        highlightedParts: [
          { text: "La", type: "article", startIndex: 0, endIndex: 2 },
          { text: "vie", type: "subject", startIndex: 3, endIndex: 6 },
          { text: "est", type: "verb", startIndex: 7, endIndex: 10 },
          { text: "belle", type: "adjective", startIndex: 11, endIndex: 16 },
        ],
      },
      {
        id: "noun-adj-3",
        french: "Le temps est long.",
        english: "The time is long.",
        highlightedParts: [
          { text: "Le", type: "article", startIndex: 0, endIndex: 2 },
          { text: "temps", type: "subject", startIndex: 3, endIndex: 8 },
          { text: "est", type: "verb", startIndex: 9, endIndex: 12 },
          { text: "long", type: "adjective", startIndex: 13, endIndex: 17 },
        ],
      },
      {
        id: "noun-adj-4",
        french: "La maison est grande.",
        english: "The house is big.",
        highlightedParts: [
          { text: "La", type: "article", startIndex: 0, endIndex: 2 },
          { text: "maison", type: "subject", startIndex: 3, endIndex: 9 },
          { text: "est", type: "verb", startIndex: 10, endIndex: 13 },
          { text: "grande", type: "adjective", startIndex: 14, endIndex: 20 },
        ],
      },
      {
        id: "noun-adj-5",
        french: "Le monde est petit.",
        english: "The world is small.",
        highlightedParts: [
          { text: "Le", type: "article", startIndex: 0, endIndex: 2 },
          { text: "monde", type: "subject", startIndex: 3, endIndex: 8 },
          { text: "est", type: "verb", startIndex: 9, endIndex: 12 },
          { text: "petit", type: "adjective", startIndex: 13, endIndex: 18 },
        ],
      },
    ],
    implicitGrammar: "Definite articles (le/la) + predicate adjectives",
  },

  // ===== PATTERN 7: Il y a + Object =====
  {
    id: "il-y-a",
    name: "There is/are...",
    description: "Express existence with il y a",
    template: "Il y a + ARTICLE + NOUN",
    structureColors: [
      PATTERN_COLORS.verb,
      PATTERN_COLORS.article,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "ilya-1",
        french: "Il y a un homme.",
        english: "There is a man.",
        highlightedParts: [
          { text: "Il y a", type: "verb", startIndex: 0, endIndex: 6 },
          { text: "un", type: "article", startIndex: 7, endIndex: 9 },
          { text: "homme", type: "object", startIndex: 10, endIndex: 15 },
        ],
      },
      {
        id: "ilya-2",
        french: "Il y a une femme.",
        english: "There is a woman.",
        highlightedParts: [
          { text: "Il y a", type: "verb", startIndex: 0, endIndex: 6 },
          { text: "une", type: "article", startIndex: 7, endIndex: 10 },
          { text: "femme", type: "object", startIndex: 11, endIndex: 16 },
        ],
      },
      {
        id: "ilya-3",
        french: "Il y a des enfants.",
        english: "There are children.",
        highlightedParts: [
          { text: "Il y a", type: "verb", startIndex: 0, endIndex: 6 },
          { text: "des", type: "article", startIndex: 7, endIndex: 10 },
          { text: "enfants", type: "object", startIndex: 11, endIndex: 18 },
        ],
      },
      {
        id: "ilya-4",
        french: "Il y a du temps.",
        english: "There is time.",
        highlightedParts: [
          { text: "Il y a", type: "verb", startIndex: 0, endIndex: 6 },
          { text: "du", type: "article", startIndex: 7, endIndex: 9 },
          { text: "temps", type: "object", startIndex: 10, endIndex: 15 },
        ],
      },
      {
        id: "ilya-5",
        french: "Il y a de l'eau.",
        english: "There is water.",
        highlightedParts: [
          { text: "Il y a", type: "verb", startIndex: 0, endIndex: 6 },
          { text: "de l'", type: "article", startIndex: 7, endIndex: 12 },
          { text: "eau", type: "object", startIndex: 12, endIndex: 15 },
        ],
      },
    ],
    implicitGrammar: "il y a (existential) + various articles",
  },

  // ===== PATTERN 8: C'est + Noun/Adjective =====
  {
    id: "cest",
    name: "It is/This is...",
    description: "Identify or describe with c'est",
    template: "C'est + ARTICLE + NOUN / C'est + ADJECTIVE",
    structureColors: [
      PATTERN_COLORS.verb,
      PATTERN_COLORS.article,
      PATTERN_COLORS.object,
    ],
    examples: [
      {
        id: "cest-1",
        french: "C'est un livre.",
        english: "It's a book.",
        highlightedParts: [
          { text: "C'est", type: "verb", startIndex: 0, endIndex: 5 },
          { text: "un", type: "article", startIndex: 6, endIndex: 8 },
          { text: "livre", type: "object", startIndex: 9, endIndex: 14 },
        ],
      },
      {
        id: "cest-2",
        french: "C'est une maison.",
        english: "It's a house.",
        highlightedParts: [
          { text: "C'est", type: "verb", startIndex: 0, endIndex: 5 },
          { text: "une", type: "article", startIndex: 6, endIndex: 9 },
          { text: "maison", type: "object", startIndex: 10, endIndex: 16 },
        ],
      },
      {
        id: "cest-3",
        french: "C'est bon.",
        english: "It's good.",
        highlightedParts: [
          { text: "C'est", type: "verb", startIndex: 0, endIndex: 5 },
          { text: "bon", type: "adjective", startIndex: 6, endIndex: 9 },
        ],
      },
      {
        id: "cest-4",
        french: "C'est vrai.",
        english: "It's true.",
        highlightedParts: [
          { text: "C'est", type: "verb", startIndex: 0, endIndex: 5 },
          { text: "vrai", type: "adjective", startIndex: 6, endIndex: 10 },
        ],
      },
      {
        id: "cest-5",
        french: "C'est mon ami.",
        english: "It's my friend.",
        highlightedParts: [
          { text: "C'est", type: "verb", startIndex: 0, endIndex: 5 },
          { text: "mon", type: "article", startIndex: 6, endIndex: 9 },
          { text: "ami", type: "object", startIndex: 10, endIndex: 13 },
        ],
      },
    ],
    implicitGrammar: "c'est for identification + predicate adjectives/nouns",
  },
];

// ============================================================================
// SIMPLE SENTENCES FOR MINING
// Ultra-simple sentences using only top 100 words
// ============================================================================

export const SIMPLE_SENTENCES: SimpleSentence[] = [
  // Basic subject-verb sentences
  {
    id: "simple-1",
    french: "Le chat dort.",
    english: "The cat sleeps.",
    words: [
      {
        word: "Le",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "chat",
        lemma: "chat",
        translation: "cat",
        isNew: false,
        isKnown: true,
      },
      {
        word: "dort",
        lemma: "dormir",
        translation: "sleeps",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-2",
    french: "Je mange.",
    english: "I eat.",
    words: [
      {
        word: "Je",
        lemma: "je",
        translation: "I",
        isNew: false,
        isKnown: true,
      },
      {
        word: "mange",
        lemma: "manger",
        translation: "eat",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-3",
    french: "Elle parle.",
    english: "She speaks.",
    words: [
      {
        word: "Elle",
        lemma: "elle",
        translation: "she",
        isNew: false,
        isKnown: true,
      },
      {
        word: "parle",
        lemma: "parler",
        translation: "speaks",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-4",
    french: "Il court vite.",
    english: "He runs fast.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "he",
        isNew: false,
        isKnown: true,
      },
      {
        word: "court",
        lemma: "courir",
        translation: "runs",
        isNew: false,
        isKnown: true,
      },
      {
        word: "vite",
        lemma: "vite",
        translation: "fast",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-5",
    french: "Nous marchons.",
    english: "We walk.",
    words: [
      {
        word: "Nous",
        lemma: "nous",
        translation: "we",
        isNew: false,
        isKnown: true,
      },
      {
        word: "marchons",
        lemma: "marcher",
        translation: "walk",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Subject-verb-object sentences
  {
    id: "simple-6",
    french: "Je mange une pomme.",
    english: "I eat an apple.",
    words: [
      {
        word: "Je",
        lemma: "je",
        translation: "I",
        isNew: false,
        isKnown: true,
      },
      {
        word: "mange",
        lemma: "manger",
        translation: "eat",
        isNew: false,
        isKnown: true,
      },
      {
        word: "une",
        lemma: "un",
        translation: "a/an",
        isNew: false,
        isKnown: true,
      },
      {
        word: "pomme",
        lemma: "pomme",
        translation: "apple",
        isNew: true,
        isKnown: false,
      },
    ],
    newWord: { word: "pomme", meaning: "apple", position: 3 },
  },
  {
    id: "simple-7",
    french: "Tu lis un livre.",
    english: "You read a book.",
    words: [
      {
        word: "Tu",
        lemma: "tu",
        translation: "you",
        isNew: false,
        isKnown: true,
      },
      {
        word: "lis",
        lemma: "lire",
        translation: "read",
        isNew: false,
        isKnown: true,
      },
      {
        word: "un",
        lemma: "un",
        translation: "a",
        isNew: false,
        isKnown: true,
      },
      {
        word: "livre",
        lemma: "livre",
        translation: "book",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-8",
    french: "Il voit la femme.",
    english: "He sees the woman.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "he",
        isNew: false,
        isKnown: true,
      },
      {
        word: "voit",
        lemma: "voir",
        translation: "sees",
        isNew: false,
        isKnown: true,
      },
      {
        word: "la",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "femme",
        lemma: "femme",
        translation: "woman",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-9",
    french: "Elle a un ami.",
    english: "She has a friend.",
    words: [
      {
        word: "Elle",
        lemma: "elle",
        translation: "she",
        isNew: false,
        isKnown: true,
      },
      {
        word: "a",
        lemma: "avoir",
        translation: "has",
        isNew: false,
        isKnown: true,
      },
      {
        word: "un",
        lemma: "un",
        translation: "a",
        isNew: false,
        isKnown: true,
      },
      {
        word: "ami",
        lemma: "ami",
        translation: "friend",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-10",
    french: "Je veux de l'eau.",
    english: "I want water.",
    words: [
      {
        word: "Je",
        lemma: "je",
        translation: "I",
        isNew: false,
        isKnown: true,
      },
      {
        word: "veux",
        lemma: "vouloir",
        translation: "want",
        isNew: false,
        isKnown: true,
      },
      {
        word: "de",
        lemma: "de",
        translation: "some",
        isNew: false,
        isKnown: true,
      },
      {
        word: "l'",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "eau",
        lemma: "eau",
        translation: "water",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Descriptive sentences
  {
    id: "simple-11",
    french: "Le chat est noir.",
    english: "The cat is black.",
    words: [
      {
        word: "Le",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "chat",
        lemma: "chat",
        translation: "cat",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "noir",
        lemma: "noir",
        translation: "black",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-12",
    french: "La maison est grande.",
    english: "The house is big.",
    words: [
      {
        word: "La",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "maison",
        lemma: "maison",
        translation: "house",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "grande",
        lemma: "grand",
        translation: "big",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-13",
    french: "Il est jeune.",
    english: "He is young.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "he",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "jeune",
        lemma: "jeune",
        translation: "young",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-14",
    french: "Elle est belle.",
    english: "She is beautiful.",
    words: [
      {
        word: "Elle",
        lemma: "elle",
        translation: "she",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "belle",
        lemma: "beau",
        translation: "beautiful",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-15",
    french: "Le temps est bon.",
    english: "The weather is good.",
    words: [
      {
        word: "Le",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "temps",
        lemma: "temps",
        translation: "weather/time",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "bon",
        lemma: "bon",
        translation: "good",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Location sentences
  {
    id: "simple-16",
    french: "Je suis à la maison.",
    english: "I am at home.",
    words: [
      {
        word: "Je",
        lemma: "je",
        translation: "I",
        isNew: false,
        isKnown: true,
      },
      {
        word: "suis",
        lemma: "être",
        translation: "am",
        isNew: false,
        isKnown: true,
      },
      { word: "à", lemma: "à", translation: "at", isNew: false, isKnown: true },
      {
        word: "la",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "maison",
        lemma: "maison",
        translation: "home",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-17",
    french: "Il va en ville.",
    english: "He goes to the city.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "he",
        isNew: false,
        isKnown: true,
      },
      {
        word: "va",
        lemma: "aller",
        translation: "goes",
        isNew: false,
        isKnown: true,
      },
      {
        word: "en",
        lemma: "en",
        translation: "to",
        isNew: false,
        isKnown: true,
      },
      {
        word: "ville",
        lemma: "ville",
        translation: "city",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-18",
    french: "Elle vient de Paris.",
    english: "She comes from Paris.",
    words: [
      {
        word: "Elle",
        lemma: "elle",
        translation: "she",
        isNew: false,
        isKnown: true,
      },
      {
        word: "vient",
        lemma: "venir",
        translation: "comes",
        isNew: false,
        isKnown: true,
      },
      {
        word: "de",
        lemma: "de",
        translation: "from",
        isNew: false,
        isKnown: true,
      },
      {
        word: "Paris",
        lemma: "Paris",
        translation: "Paris",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Time expressions
  {
    id: "simple-19",
    french: "C'est le jour.",
    english: "It is day.",
    words: [
      {
        word: "C'",
        lemma: "ce",
        translation: "it",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "le",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "jour",
        lemma: "jour",
        translation: "day",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-20",
    french: "C'est la nuit.",
    english: "It is night.",
    words: [
      {
        word: "C'",
        lemma: "ce",
        translation: "it",
        isNew: false,
        isKnown: true,
      },
      {
        word: "est",
        lemma: "être",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "la",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "nuit",
        lemma: "nuit",
        translation: "night",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Questions (declarative form)
  {
    id: "simple-21",
    french: "Tu as faim.",
    english: "You are hungry.",
    words: [
      {
        word: "Tu",
        lemma: "tu",
        translation: "you",
        isNew: false,
        isKnown: true,
      },
      {
        word: "as",
        lemma: "avoir",
        translation: "have",
        isNew: false,
        isKnown: true,
      },
      {
        word: "faim",
        lemma: "faim",
        translation: "hunger",
        isNew: true,
        isKnown: false,
      },
    ],
    newWord: {
      word: "faim",
      meaning: "hunger (avoir faim = to be hungry)",
      position: 2,
    },
  },
  {
    id: "simple-22",
    french: "Il fait froid.",
    english: "It is cold.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "it",
        isNew: false,
        isKnown: true,
      },
      {
        word: "fait",
        lemma: "faire",
        translation: "makes",
        isNew: false,
        isKnown: true,
      },
      {
        word: "froid",
        lemma: "froid",
        translation: "cold",
        isNew: true,
        isKnown: false,
      },
    ],
    newWord: { word: "froid", meaning: "cold", position: 2 },
  },
  {
    id: "simple-23",
    french: "Elle a raison.",
    english: "She is right.",
    words: [
      {
        word: "Elle",
        lemma: "elle",
        translation: "she",
        isNew: false,
        isKnown: true,
      },
      {
        word: "a",
        lemma: "avoir",
        translation: "has",
        isNew: false,
        isKnown: true,
      },
      {
        word: "raison",
        lemma: "raison",
        translation: "reason/right",
        isNew: false,
        isKnown: true,
      },
    ],
  },

  // Existential sentences
  {
    id: "simple-24",
    french: "Il y a un homme.",
    english: "There is a man.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "there",
        isNew: false,
        isKnown: true,
      },
      {
        word: "y",
        lemma: "y",
        translation: "(location)",
        isNew: false,
        isKnown: true,
      },
      {
        word: "a",
        lemma: "avoir",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "un",
        lemma: "un",
        translation: "a",
        isNew: false,
        isKnown: true,
      },
      {
        word: "homme",
        lemma: "homme",
        translation: "man",
        isNew: false,
        isKnown: true,
      },
    ],
  },
  {
    id: "simple-25",
    french: "Il y a de l'eau.",
    english: "There is water.",
    words: [
      {
        word: "Il",
        lemma: "il",
        translation: "there",
        isNew: false,
        isKnown: true,
      },
      {
        word: "y",
        lemma: "y",
        translation: "(location)",
        isNew: false,
        isKnown: true,
      },
      {
        word: "a",
        lemma: "avoir",
        translation: "is",
        isNew: false,
        isKnown: true,
      },
      {
        word: "de",
        lemma: "de",
        translation: "some",
        isNew: false,
        isKnown: true,
      },
      {
        word: "l'",
        lemma: "le",
        translation: "the",
        isNew: false,
        isKnown: true,
      },
      {
        word: "eau",
        lemma: "eau",
        translation: "water",
        isNew: false,
        isKnown: true,
      },
    ],
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a pattern by ID
 */
export function getPatternById(id: string): SentencePattern | undefined {
  return SENTENCE_PATTERNS.find((p) => p.id === id);
}

/**
 * Get all sentences for a specific pattern
 */
export function getSentencesByPattern(patternId: string): SimpleSentence[] {
  const pattern = getPatternById(patternId);
  if (!pattern) return [];

  // Convert pattern examples to SimpleSentences
  return pattern.examples.map((example) => ({
    id: example.id,
    french: example.french,
    english: example.english,
    audioUrl: example.audioUrl,
    words: [], // Would need NLP to populate
    patternId: pattern.id,
    patternName: pattern.name,
  }));
}

/**
 * Get sentences that use only known words
 * @param knownWords Array of known word lemmas
 * @param maxNewWords Maximum new words allowed (0 or 1)
 */
export function getSentencesForUser(
  knownWords: string[],
  maxNewWords: 0 | 1 = 1,
): SimpleSentence[] {
  const knownSet = new Set(knownWords.map((w) => w.toLowerCase()));

  return SIMPLE_SENTENCES.filter((sentence) => {
    const newWords = sentence.words.filter(
      (w) => !knownSet.has(w.lemma.toLowerCase()),
    );
    return newWords.length <= maxNewWords;
  });
}

/**
 * Get a random selection of sentences for a session
 * @param count Number of sentences to select
 * @param knownWords Known word lemmas
 */
export function getSessionSentences(
  count: number,
  knownWords: string[],
): SimpleSentence[] {
  const eligible = getSentencesForUser(knownWords, 1);
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get a pattern recognition exercise set
 * Shows examples from a pattern for user to observe
 */
export function getPatternExercise(patternId: string): SentencePattern | null {
  const pattern = getPatternById(patternId);
  return pattern || null;
}

/**
 * Get all patterns sorted by difficulty (simpler first)
 */
export function getPatternsByDifficulty(): SentencePattern[] {
  // Order: avoir > être > c'est > il y a > aller > voir > faire > noun-is
  const order = [
    "avoir-object",
    "etre-adjective",
    "cest",
    "il-y-a",
    "aller-location",
    "voir-object",
    "faire-activity",
    "noun-is-adjective",
  ];

  return order
    .map((id) => getPatternById(id))
    .filter((p): p is SentencePattern => p !== undefined);
}
