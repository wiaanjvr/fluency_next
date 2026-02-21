import type { GrammarContentFile } from "@/types/grammar.types";

const content: GrammarContentFile = {
  path: {
    language_code: "de",
    category: { name: "Verben", slug: "verben", icon: "⚡" },
    topic: { name: "Präsens", slug: "prasens", cefr_level: "A2" },
    subtopic: { name: "Starke Verben", slug: "starke-verben" },
  },
  lesson: {
    title: "Starke Verben im Präsens",
    cefr_level: "A2",
    explanation_md: `# Starke Verben im Präsens

**Starke Verben** (strong verbs) are verbs that change their **stem vowel** in the present tense for the **du** and **er/sie/es** forms. This is one of the key differences between strong and weak verbs in German.

## How it works

The stem vowel change only happens in the **2nd person singular (du)** and **3rd person singular (er/sie/es)**. All other forms follow normal conjugation rules.

### Common vowel changes

| Change | Example |
|--------|---------|
| **a → ä** | fahren → du f**ä**hrst |
| **e → i** | geben → du g**i**bst |
| **e → ie** | sehen → du s**ie**hst |

## Important notes

- The **ich**, **wir**, **ihr**, and **sie/Sie** forms are conjugated **normally** (like weak verbs).
- You must **memorize** which verbs are strong — there is no rule to predict the vowel change.
- Strong verbs are among the **most common** verbs in German, so learning them is essential.

> **Tip:** When you learn a new verb, always check whether it has a stem vowel change!`,
    summary_table_json: {
      headers: ["", "fahren (a→ä)", "geben (e→i)", "sehen (e→ie)"],
      rows: [
        ["ich", "fahre", "gebe", "sehe"],
        ["du", "fährst", "gibst", "siehst"],
        ["er/sie/es", "fährt", "gibt", "sieht"],
        ["wir", "fahren", "geben", "sehen"],
        ["ihr", "fahrt", "gebt", "seht"],
        ["sie/Sie", "fahren", "geben", "sehen"],
      ],
    },
    examples: [
      {
        sentence: "Er **fährt** jeden Tag mit dem Bus zur Arbeit.",
        translation: "He takes the bus to work every day.",
        highlight: "fährt",
      },
      {
        sentence: "Sie **gibt** mir das Buch zurück.",
        translation: "She gives me the book back.",
        highlight: "gibt",
      },
      {
        sentence: "**Siehst** du den Vogel auf dem Baum?",
        translation: "Do you see the bird in the tree?",
        highlight: "Siehst",
      },
      {
        sentence: "Er **liest** jeden Abend eine Geschichte.",
        translation: "He reads a story every evening.",
        highlight: "liest",
      },
      {
        sentence: "Sie **spricht** drei Sprachen fließend.",
        translation: "She speaks three languages fluently.",
        highlight: "spricht",
      },
    ],
  },
  exercises: [
    {
      type: "fill_blank",
      prompt: "Er ___ jeden Tag mit dem Bus. (fahren)",
      correct_answer: "fährt",
      explanation:
        "'fahren' is a strong verb with the vowel change a → ä in the 3rd person singular. Er fährt.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "Du ___ mir nie die Wahrheit. (geben)",
      correct_answer: "gibst",
      explanation:
        "'geben' changes e → i in the 2nd person singular. Du gibst.",
      difficulty: 1,
    },
    {
      type: "multiple_choice",
      prompt: "Which is the correct form? Er ___ das Buch. (lesen)",
      options: [
        { text: "lest", is_correct: false },
        { text: "liest", is_correct: true },
        { text: "lest", is_correct: false },
        { text: "lesen", is_correct: false },
      ],
      correct_answer: "liest",
      explanation:
        "'lesen' is a strong verb with e → ie change. Er liest. 'lest' would be the ihr-form.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "___ du den neuen Film? (sehen)",
      correct_answer: "Siehst",
      explanation:
        "'sehen' changes e → ie in the 2nd person singular. Du siehst.",
      difficulty: 1,
    },
    {
      type: "multiple_choice",
      prompt: "She speaks German fluently. → Sie ___ fließend Deutsch.",
      options: [
        { text: "sprecht", is_correct: false },
        { text: "spricht", is_correct: true },
        { text: "sprechen", is_correct: false },
        { text: "sprichst", is_correct: false },
      ],
      correct_answer: "spricht",
      explanation:
        "'sprechen' changes e → i for er/sie/es. Sie spricht. 'sprichst' would be the du-form.",
      difficulty: 2,
    },
    {
      type: "sentence_transform",
      prompt:
        'Rewrite with "du" as the subject: "Ich fahre nach Berlin." → "Du ___"',
      correct_answer: "fährst nach Berlin.",
      explanation:
        "When changing from ich to du, the strong verb 'fahren' changes its stem vowel: a → ä. Du fährst.",
      difficulty: 2,
    },
    {
      type: "error_correction",
      prompt: "Er fahrt jeden Morgen mit dem Fahrrad.",
      correct_answer: "fährt",
      explanation:
        "'fahren' requires the stem vowel change a → ä for the er/sie/es form. The correct form is 'fährt', not 'fahrt'.",
      difficulty: 2,
    },
    {
      type: "fill_blank",
      prompt: "Das Kind ___ sehr schnell. (laufen)",
      correct_answer: "läuft",
      explanation:
        "'laufen' has the vowel change au → äu in the 2nd and 3rd person singular. Das Kind (= es) läuft.",
      difficulty: 3,
    },
  ],
};

export default content;
