import type { GrammarContentFile } from "@/types/grammar.types";

const content: GrammarContentFile = {
  path: {
    language_code: "de",
    category: { name: "Verben", slug: "verben", icon: "⚡" },
    topic: { name: "Perfekt", slug: "perfekt", cefr_level: "A2" },
    subtopic: { name: "Perfekt mit haben", slug: "haben-verben" },
  },
  lesson: {
    title: "Perfekt mit haben",
    cefr_level: "A2",
    explanation_md: `# Perfekt mit haben

The **Perfekt** (present perfect) is the most common past tense in spoken German. It is formed with a **helper verb** (haben or sein) + the **past participle** (Partizip II).

Most verbs form the Perfekt with **haben**.

## How to form the Perfekt

\`\`\`
Subject + haben (conjugated) + ... + Partizip II
\`\`\`

### Conjugation of "haben"

| Person | haben |
|--------|-------|
| ich | habe |
| du | hast |
| er/sie/es | hat |
| wir | haben |
| ihr | habt |
| sie/Sie | haben |

### Forming the Partizip II

| Verb type | Pattern | Example |
|-----------|---------|---------|
| **Regular (weak)** | ge- + stem + -t | machen → **ge**mach**t** |
| **Irregular (strong)** | ge- + stem (changed) + -en | schreiben → **ge**schrieb**en** |
| **Separable prefix** | prefix + ge- + stem + -t/-en | aufmachen → **auf**ge**macht** |
| **Non-separable prefix** | stem + -t/-en (NO ge-) | besuchen → besuch**t** |

## When to use "haben"

Use **haben** with:
- **Transitive verbs** (verbs with a direct object): *Ich habe einen Kuchen gegessen.*
- **Reflexive verbs**: *Er hat sich gefreut.*
- **Most other verbs** that don't express movement or change of state

> **Tip:** When in doubt, try "haben" first — it covers the majority of German verbs!`,
    summary_table_json: {
      headers: ["Infinitiv", "Partizip II", "Example sentence"],
      rows: [
        ["machen", "gemacht", "Ich habe die Hausaufgaben gemacht."],
        ["kaufen", "gekauft", "Sie hat ein neues Kleid gekauft."],
        ["schreiben", "geschrieben", "Er hat einen Brief geschrieben."],
        ["essen", "gegessen", "Wir haben Pizza gegessen."],
        ["lesen", "gelesen", "Hast du das Buch gelesen?"],
        ["besuchen", "besucht", "Ich habe meine Oma besucht."],
      ],
    },
    examples: [
      {
        sentence: "Ich **habe** gestern einen Kuchen **gebacken**.",
        translation: "I baked a cake yesterday.",
        highlight: "habe ... gebacken",
      },
      {
        sentence: "**Hast** du die E-Mail **geschrieben**?",
        translation: "Did you write the email?",
        highlight: "Hast ... geschrieben",
      },
      {
        sentence: "Sie **hat** das Fenster **aufgemacht**.",
        translation: "She opened the window.",
        highlight: "hat ... aufgemacht",
      },
      {
        sentence: "Wir **haben** den Film **gesehen**.",
        translation: "We watched the film.",
        highlight: "haben ... gesehen",
      },
      {
        sentence: "Er **hat** seine Freundin **besucht**.",
        translation: "He visited his girlfriend.",
        highlight: "hat ... besucht",
      },
    ],
  },
  exercises: [
    {
      type: "fill_blank",
      prompt: "Ich ___ gestern Pizza gegessen. (haben)",
      correct_answer: "habe",
      explanation:
        "The 1st person singular of 'haben' is 'habe'. Ich habe ... gegessen.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "Er hat einen Brief ___. (schreiben → Partizip II)",
      correct_answer: "geschrieben",
      explanation:
        "'schreiben' is a strong verb. Its Partizip II is 'geschrieben' (ge- + schrieb + -en).",
      difficulty: 1,
    },
    {
      type: "multiple_choice",
      prompt: "What is the Partizip II of 'machen'?",
      options: [
        { text: "gemachen", is_correct: false },
        { text: "gemacht", is_correct: true },
        { text: "machte", is_correct: false },
        { text: "gematcht", is_correct: false },
      ],
      correct_answer: "gemacht",
      explanation:
        "'machen' is a regular (weak) verb. Partizip II = ge- + mach + -t → gemacht.",
      difficulty: 1,
    },
    {
      type: "fill_blank",
      prompt: "___ du den Film gesehen? (haben, conjugated)",
      correct_answer: "Hast",
      explanation:
        "The 2nd person singular of 'haben' is 'hast'. Hast du ... gesehen?",
      difficulty: 1,
    },
    {
      type: "multiple_choice",
      prompt: "Which sentence is correct?",
      options: [
        { text: "Ich habe das Buch gelest.", is_correct: false },
        { text: "Ich habe das Buch gelesen.", is_correct: true },
        { text: "Ich habe das Buch lesen.", is_correct: false },
        { text: "Ich bin das Buch gelesen.", is_correct: false },
      ],
      correct_answer: "Ich habe das Buch gelesen.",
      explanation:
        "'lesen' is a strong verb with Partizip II 'gelesen'. It uses 'haben' (not 'sein') because it's a transitive verb.",
      difficulty: 2,
    },
    {
      type: "sentence_transform",
      prompt:
        'Rewrite in the Perfekt: "Ich mache die Hausaufgaben." → "Ich ___ die Hausaufgaben ___."',
      correct_answer: "habe die Hausaufgaben gemacht.",
      explanation:
        "To form Perfekt: conjugate 'haben' for 'ich' → 'habe', then form Partizip II of 'machen' → 'gemacht'. The Partizip II goes to the end.",
      difficulty: 2,
    },
    {
      type: "error_correction",
      prompt: "Sie hat die Tür aufgemachen.",
      correct_answer: "aufgemacht",
      explanation:
        "'aufmachen' is a regular separable verb. Its Partizip II is 'aufgemacht' (auf + ge + mach + t), not 'aufgemachen'.",
      difficulty: 2,
    },
    {
      type: "fill_blank",
      prompt: "Wir haben unsere Großeltern ___. (besuchen → Partizip II)",
      correct_answer: "besucht",
      explanation:
        "'besuchen' has a non-separable prefix 'be-', so the Partizip II does NOT get 'ge-': besucht.",
      difficulty: 3,
    },
  ],
};

export default content;
