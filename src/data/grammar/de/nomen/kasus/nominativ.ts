import type { GrammarContentFile } from "@/types/grammar.types";

const content: GrammarContentFile = {
  path: {
    language_code: "de",
    category: { name: "Nomen & Artikel", slug: "nomen", icon: "📝" },
    topic: { name: "Kasus", slug: "kasus", cefr_level: "A1" },
    subtopic: { name: "Nominativ", slug: "nominativ" },
  },
  lesson: {
    title: "Der Nominativ",
    cefr_level: "A1",
    explanation_md: `# Der Nominativ

The **Nominativ** (nominative case) is the most basic case in German. It is used for the **subject** of a sentence — the person or thing performing the action.

## When to use the Nominativ

1. **As the subject of a sentence**
   The nominative answers the question: **Wer?** (Who?) or **Was?** (What?)

2. **After the verb "sein" (to be)**
   The word after "sein" also takes the nominative case.

## Articles in the Nominativ

The nominative articles are the ones you learn first:

| | Masculine | Feminine | Neuter | Plural |
|---|---|---|---|---|
| **Definite** | der | die | das | die |
| **Indefinite** | ein | eine | ein | – |

## How to identify the Nominativ

Ask yourself: **Who or what is doing the action?** That word is in the nominative case.

> **Tip:** The nominative is the "dictionary form" of a noun — it's how you'll find it listed in dictionaries and vocabulary lists.`,
    summary_table_json: {
      headers: ["", "Masculine", "Feminine", "Neuter", "Plural"],
      rows: [
        ["Definite article", "der", "die", "das", "die"],
        ["Indefinite article", "ein", "eine", "ein", "–"],
        ["Negative article", "kein", "keine", "kein", "keine"],
        ["Example", "der Mann", "die Frau", "das Kind", "die Kinder"],
      ],
    },
    examples: [
      {
        sentence: "**Der Hund** spielt im Garten.",
        translation: "The dog plays in the garden.",
        highlight: "Der Hund",
      },
      {
        sentence: "**Die Katze** schläft auf dem Sofa.",
        translation: "The cat sleeps on the sofa.",
        highlight: "Die Katze",
      },
      {
        sentence: "**Das Kind** lacht laut.",
        translation: "The child laughs loudly.",
        highlight: "Das Kind",
      },
      {
        sentence: "Das ist **ein guter Lehrer**.",
        translation: "That is a good teacher.",
        highlight: "ein guter Lehrer",
      },
      {
        sentence: "**Die Blumen** sind sehr schön.",
        translation: "The flowers are very beautiful.",
        highlight: "Die Blumen",
      },
    ],
  },
  exercises: [
    {
      type: "multiple_choice",
      prompt: "Which article is correct? ___ Frau liest ein Buch.",
      options: [
        { text: "Der", is_correct: false },
        { text: "Die", is_correct: true },
        { text: "Das", is_correct: false },
        { text: "Den", is_correct: false },
      ],
      correct_answer: "Die",
      explanation:
        "'Frau' is feminine (die Frau). In the nominative case, the definite article for feminine nouns is 'die'.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "___ Kind spielt im Park. (definite article)",
      correct_answer: "Das",
      explanation:
        "'Kind' is neuter (das Kind). In the nominative case, the definite article for neuter nouns is 'das'.",
      difficulty: 1,
    },
    {
      type: "multiple_choice",
      prompt: 'What case is "der Mann" in this sentence? Der Mann kauft Brot.',
      options: [
        { text: "Nominativ", is_correct: true },
        { text: "Akkusativ", is_correct: false },
        { text: "Dativ", is_correct: false },
        { text: "Genitiv", is_correct: false },
      ],
      correct_answer: "Nominativ",
      explanation:
        "'Der Mann' is the subject — he is performing the action of buying. The subject is always in the nominative case.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "___ Lehrer erklärt die Aufgabe. (masculine definite article)",
      correct_answer: "Der",
      explanation:
        "'Lehrer' is masculine. As the subject of the sentence, it takes the nominative article 'der'.",
      difficulty: 1,
    },
    {
      type: "error_correction",
      prompt: "Den Hund spielt im Garten.",
      correct_answer: "Der",
      explanation:
        "'Der Hund' is the subject of this sentence (it performs the action). Subjects require the nominative case: 'der', not 'den' (which is accusative).",
      difficulty: 2,
    },
    {
      type: "multiple_choice",
      prompt:
        "After 'sein', what case does the noun take? Das ist ein guter Lehrer.",
      options: [
        { text: "Akkusativ", is_correct: false },
        { text: "Nominativ", is_correct: true },
        { text: "Dativ", is_correct: false },
        { text: "Genitiv", is_correct: false },
      ],
      correct_answer: "Nominativ",
      explanation:
        "After the verb 'sein' (to be), the predicate noun takes the nominative case: 'ein guter Lehrer' (not 'einen guten Lehrer').",
      difficulty: 2,
    },
    {
      type: "sentence_transform",
      prompt:
        'Make this sentence use an indefinite article: "Die Katze schläft." → "___ Katze schläft."',
      correct_answer: "Eine Katze schläft.",
      explanation:
        "'Katze' is feminine. The indefinite article in the nominative for feminine nouns is 'eine'.",
      difficulty: 2,
    },
    {
      type: "fill_blank",
      prompt: "___ Bücher liegen auf dem Tisch. (definite article, plural)",
      correct_answer: "Die",
      explanation:
        "In the nominative plural, the definite article is always 'die' regardless of the noun's gender.",
      difficulty: 1,
    },
  ],
};

export default content;
