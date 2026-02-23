// ==========================================================================
// Verb Conjugation Drill — Language Configuration
// ==========================================================================

import type { Language, LanguageConfigEntry } from "@/types/conjugation";

export const LANGUAGE_CONFIG: Record<Language, LanguageConfigEntry> = {
  // ---- German ----
  de: {
    tenseGroups: [
      {
        label: "Indicative — Simple",
        tenses: ["present", "preterite", "future"],
      },
      {
        label: "Indicative — Compound",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Subjunctive",
        tenses: ["subjunctive_present", "subjunctive_imperfect"],
      },
      {
        label: "Imperative",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "de",
      pronouns: [
        { key: "1sg", display: "ich" },
        { key: "2sg", display: "du" },
        { key: "3sg", display: "er/sie/es" },
        { key: "1pl", display: "wir" },
        { key: "2pl", display: "ihr" },
        { key: "3pl", display: "sie/Sie" },
      ],
      excludedByDefault: [],
    },
    accentConfig: {
      language: "de",
      characters: ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"],
    },
    defaultTenses: ["present", "preterite", "perfect"],
    tenseLabels: {
      present: "Präsens",
      preterite: "Präteritum",
      imperfect: "Präteritum",
      future: "Futur I",
      future_perfect: "Futur II",
      perfect: "Perfekt",
      pluperfect: "Plusquamperfekt",
      subjunctive_present: "Konjunktiv I",
      subjunctive_imperfect: "Konjunktiv II",
      imperative: "Imperativ",
      conditional: "Konditional",
      past_participle: "Partizip II",
      gerund: "Gerundium",
    },
  },

  // ---- French ----
  fr: {
    tenseGroups: [
      {
        label: "Indicatif — Simple",
        tenses: ["present", "imperfect", "preterite", "future"],
      },
      {
        label: "Indicatif — Composé",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Conditionnel",
        tenses: ["conditional"],
      },
      {
        label: "Subjonctif",
        tenses: ["subjunctive_present", "subjunctive_imperfect"],
      },
      {
        label: "Impératif",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "fr",
      pronouns: [
        { key: "1sg", display: "je" },
        { key: "2sg", display: "tu" },
        { key: "3sg", display: "il/elle" },
        { key: "1pl", display: "nous" },
        { key: "2pl", display: "vous" },
        { key: "3pl", display: "ils/elles" },
      ],
      excludedByDefault: [],
    },
    accentConfig: {
      language: "fr",
      characters: [
        "é",
        "è",
        "ê",
        "ë",
        "à",
        "â",
        "ù",
        "û",
        "ô",
        "î",
        "ï",
        "ç",
        "œ",
      ],
    },
    defaultTenses: ["present", "imperfect", "perfect", "future"],
    tenseLabels: {
      present: "Présent",
      preterite: "Passé simple",
      imperfect: "Imparfait",
      future: "Futur simple",
      future_perfect: "Futur antérieur",
      perfect: "Passé composé",
      pluperfect: "Plus-que-parfait",
      conditional: "Conditionnel présent",
      subjunctive_present: "Subjonctif présent",
      subjunctive_imperfect: "Subjonctif imparfait",
      imperative: "Impératif",
      past_participle: "Participe passé",
      gerund: "Gérondif",
    },
  },

  // ---- Spanish ----
  es: {
    tenseGroups: [
      {
        label: "Indicativo — Simple",
        tenses: ["present", "preterite", "imperfect", "future", "conditional"],
      },
      {
        label: "Indicativo — Compuesto",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Subjuntivo",
        tenses: ["subjunctive_present", "subjunctive_imperfect"],
      },
      {
        label: "Imperativo",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "es",
      pronouns: [
        { key: "1sg", display: "yo" },
        { key: "2sg", display: "tú" },
        { key: "3sg", display: "él/ella/usted" },
        { key: "1pl", display: "nosotros" },
        { key: "2pl", display: "vosotros" },
        { key: "3pl", display: "ellos/ellas/ustedes" },
      ],
      excludedByDefault: ["2pl"], // Latin American Spanish default
    },
    accentConfig: {
      language: "es",
      characters: ["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"],
    },
    defaultTenses: ["present", "preterite", "imperfect", "future"],
    tenseLabels: {
      present: "Presente",
      preterite: "Pretérito indefinido",
      imperfect: "Pretérito imperfecto",
      future: "Futuro simple",
      future_perfect: "Futuro compuesto",
      perfect: "Pretérito perfecto",
      pluperfect: "Pretérito pluscuamperfecto",
      conditional: "Condicional simple",
      subjunctive_present: "Subjuntivo presente",
      subjunctive_imperfect: "Subjuntivo imperfecto",
      imperative: "Imperativo",
      past_participle: "Participio",
      gerund: "Gerundio",
    },
  },

  // ---- Italian ----
  it: {
    tenseGroups: [
      {
        label: "Indicativo — Semplice",
        tenses: ["present", "imperfect", "preterite", "future"],
      },
      {
        label: "Indicativo — Composto",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Condizionale",
        tenses: ["conditional"],
      },
      {
        label: "Congiuntivo",
        tenses: ["subjunctive_present", "subjunctive_imperfect"],
      },
      {
        label: "Imperativo",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "it",
      pronouns: [
        { key: "1sg", display: "io" },
        { key: "2sg", display: "tu" },
        { key: "3sg", display: "lui/lei" },
        { key: "1pl", display: "noi" },
        { key: "2pl", display: "voi" },
        { key: "3pl", display: "loro" },
      ],
      excludedByDefault: [],
    },
    accentConfig: {
      language: "it",
      characters: ["à", "è", "é", "ì", "ò", "ù"],
    },
    defaultTenses: ["present", "imperfect", "perfect", "future"],
    tenseLabels: {
      present: "Presente",
      preterite: "Passato remoto",
      imperfect: "Imperfetto",
      future: "Futuro semplice",
      future_perfect: "Futuro anteriore",
      perfect: "Passato prossimo",
      pluperfect: "Trapassato prossimo",
      conditional: "Condizionale presente",
      subjunctive_present: "Congiuntivo presente",
      subjunctive_imperfect: "Congiuntivo imperfetto",
      imperative: "Imperativo",
      past_participle: "Participio passato",
      gerund: "Gerundio",
    },
  },

  // ---- Portuguese ----
  pt: {
    tenseGroups: [
      {
        label: "Indicativo — Simples",
        tenses: ["present", "preterite", "imperfect", "future"],
      },
      {
        label: "Indicativo — Composto",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Condicional",
        tenses: ["conditional"],
      },
      {
        label: "Conjuntivo",
        tenses: ["subjunctive_present", "subjunctive_imperfect"],
      },
      {
        label: "Imperativo",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "pt",
      pronouns: [
        { key: "1sg", display: "eu" },
        { key: "2sg", display: "tu" },
        { key: "3sg", display: "ele/ela" },
        { key: "1pl", display: "nós" },
        { key: "2pl", display: "vós" },
        { key: "3pl", display: "eles/elas" },
      ],
      excludedByDefault: ["2pl"],
    },
    accentConfig: {
      language: "pt",
      characters: ["á", "à", "â", "ã", "é", "ê", "í", "ó", "ô", "õ", "ú", "ç"],
    },
    defaultTenses: ["present", "preterite", "imperfect", "future"],
    tenseLabels: {
      present: "Presente",
      preterite: "Pretérito perfeito",
      imperfect: "Pretérito imperfeito",
      future: "Futuro do presente",
      future_perfect: "Futuro do presente composto",
      perfect: "Pretérito perfeito composto",
      pluperfect: "Pretérito mais-que-perfeito",
      conditional: "Condicional",
      subjunctive_present: "Conjuntivo presente",
      subjunctive_imperfect: "Conjuntivo imperfeito",
      imperative: "Imperativo",
      past_participle: "Particípio",
      gerund: "Gerúndio",
    },
  },

  // ---- Dutch ----
  nl: {
    tenseGroups: [
      {
        label: "Indicatief — Enkelvoudig",
        tenses: ["present", "preterite", "future"],
      },
      {
        label: "Indicatief — Samengesteld",
        tenses: ["perfect", "pluperfect", "future_perfect"],
      },
      {
        label: "Conjunctief",
        tenses: ["subjunctive_present"],
      },
      {
        label: "Imperatief",
        tenses: ["imperative"],
      },
    ],
    pronounConfig: {
      language: "nl",
      pronouns: [
        { key: "1sg", display: "ik" },
        { key: "2sg", display: "jij" },
        { key: "3sg", display: "hij/zij/het" },
        { key: "1pl", display: "wij" },
        { key: "2pl", display: "jullie" },
        { key: "3pl", display: "zij" },
        { key: "2sg_formal", display: "u" },
      ],
      excludedByDefault: ["2sg_formal"],
    },
    accentConfig: {
      language: "nl",
      characters: ["é", "ë", "ï", "ö", "ü"],
    },
    defaultTenses: ["present", "preterite", "perfect"],
    tenseLabels: {
      present: "Tegenwoordige tijd",
      preterite: "Verleden tijd",
      imperfect: "Verleden tijd",
      future: "Toekomende tijd",
      future_perfect: "Voltooid toekomende tijd",
      perfect: "Voltooid tegenwoordige tijd",
      pluperfect: "Voltooid verleden tijd",
      conditional: "Voorwaardelijke wijs",
      subjunctive_present: "Aanvoegende wijs",
      subjunctive_imperfect: "Aanvoegende wijs verleden",
      imperative: "Gebiedende wijs",
      past_participle: "Voltooid deelwoord",
      gerund: "Gerundium",
    },
  },
};

/** Get a human-readable tense label for a given language and tense key */
export function getTenseLabel(language: Language, tense: string): string {
  return (
    LANGUAGE_CONFIG[language]?.tenseLabels[tense] ?? tense.replace(/_/g, " ")
  );
}

/** Get the pronoun display string for a given language and pronoun key */
export function getPronounDisplay(
  language: Language,
  pronounKey: string,
): string {
  const config = LANGUAGE_CONFIG[language];
  if (!config) return pronounKey;
  const found = config.pronounConfig.pronouns.find((p) => p.key === pronounKey);
  return found?.display ?? pronounKey;
}

/** Language display names and flags */
export const LANGUAGE_META: Record<Language, { name: string; flag: string }> = {
  de: { name: "German", flag: "🇩🇪" },
  fr: { name: "French", flag: "🇫🇷" },
  es: { name: "Spanish", flag: "🇪🇸" },
  it: { name: "Italian", flag: "🇮🇹" },
  pt: { name: "Portuguese", flag: "🇵🇹" },
  nl: { name: "Dutch", flag: "🇳🇱" },
};
