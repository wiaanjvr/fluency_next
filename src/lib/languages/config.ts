// Language configuration for multi-language support
// Supports: French (fr), German (de), Italian (it)

export type SupportedLanguage = "fr" | "de" | "it";

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string; // For Web Speech API
  ttsVoicePattern: RegExp; // Pattern to match TTS voices
  defaultVoice?: string; // Preferred voice name
  articles: string[];
  commonPhrases: {
    hello: string;
    goodbye: string;
    thanks: string;
    please: string;
    yes: string;
    no: string;
    iUnderstand: string;
    iDontUnderstand: string;
    repeat: string;
    slower: string;
  };
  alphabet: string;
  specialCharacters: string[];
}

export const LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flag: "🇫🇷",
    speechCode: "fr-FR",
    ttsVoicePattern: /fr[-_]FR|french/i,
    defaultVoice: "fr-FR-DeniseNeural",
    articles: ["le", "la", "les", "un", "une", "des", "du", "de la"],
    commonPhrases: {
      hello: "Bonjour",
      goodbye: "Au revoir",
      thanks: "Merci",
      please: "S'il vous plaît",
      yes: "Oui",
      no: "Non",
      iUnderstand: "Je comprends",
      iDontUnderstand: "Je ne comprends pas",
      repeat: "Pouvez-vous répéter ?",
      slower: "Parlez plus lentement",
    },
    alphabet: "abcdefghijklmnopqrstuvwxyz",
    specialCharacters: [
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
      "æ",
    ],
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flag: "🇩🇪",
    speechCode: "de-DE",
    ttsVoicePattern: /de[-_]DE|german/i,
    defaultVoice: "de-DE-KatjaNeural",
    articles: ["der", "die", "das", "ein", "eine", "einen", "einem", "einer"],
    commonPhrases: {
      hello: "Hallo",
      goodbye: "Auf Wiedersehen",
      thanks: "Danke",
      please: "Bitte",
      yes: "Ja",
      no: "Nein",
      iUnderstand: "Ich verstehe",
      iDontUnderstand: "Ich verstehe nicht",
      repeat: "Können Sie das wiederholen?",
      slower: "Sprechen Sie bitte langsamer",
    },
    alphabet: "abcdefghijklmnopqrstuvwxyz",
    specialCharacters: ["ä", "ö", "ü", "ß"],
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flag: "🇮🇹",
    speechCode: "it-IT",
    ttsVoicePattern: /it[-_]IT|italian/i,
    defaultVoice: "it-IT-ElsaNeural",
    articles: ["il", "lo", "la", "i", "gli", "le", "un", "uno", "una"],
    commonPhrases: {
      hello: "Ciao",
      goodbye: "Arrivederci",
      thanks: "Grazie",
      please: "Per favore",
      yes: "Sì",
      no: "No",
      iUnderstand: "Capisco",
      iDontUnderstand: "Non capisco",
      repeat: "Può ripetere?",
      slower: "Parli più lentamente",
    },
    alphabet: "abcdefghijklmnopqrstuvwxyz",
    specialCharacters: ["à", "è", "é", "ì", "ò", "ù"],
  },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = "fr";

export function getLanguageConfig(code: string): LanguageConfig {
  if (code in LANGUAGES) {
    return LANGUAGES[code as SupportedLanguage];
  }
  return LANGUAGES[DEFAULT_LANGUAGE];
}

export function isValidLanguage(code: string): code is SupportedLanguage {
  return code in LANGUAGES;
}

export function getLanguageList(): LanguageConfig[] {
  return Object.values(LANGUAGES);
}

export function getLanguageName(code: string): string {
  return getLanguageConfig(code).name;
}

export function getLanguageFlag(code: string): string {
  return getLanguageConfig(code).flag;
}

// Get TTS voice for a language
export function getTTSVoice(
  language: string,
  voices?: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  // If voices aren't provided, get them from speechSynthesis
  const availableVoices =
    voices ??
    (typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.getVoices()
      : []);

  if (availableVoices.length === 0) return null;

  const config = getLanguageConfig(language);

  // Try to find the preferred voice first
  if (config.defaultVoice) {
    const preferred = availableVoices.find((v) =>
      v.name.includes(config.defaultVoice!),
    );
    if (preferred) return preferred;
  }

  // Fall back to pattern matching
  const matched = availableVoices.find(
    (v) =>
      config.ttsVoicePattern.test(v.name) ||
      config.ttsVoicePattern.test(v.lang),
  );
  return matched || null;
}
