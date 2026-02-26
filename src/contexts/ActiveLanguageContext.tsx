"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================================
// ActiveLanguageContext — Single source of truth for the user's active language
//
// On mount, fetches the user's languages from Supabase profiles.
// Defaults to the language stored in user preferences (target_language),
// falling back to the first language in the list.
// setActiveLanguage updates both Supabase AND local state.
// ============================================================================

// ─── Language metadata ──────────────────────────────────────────────────────

const LANG_META: Record<string, { flag: string; name: string }> = {
  fr: { flag: "🇫🇷", name: "French" },
  es: { flag: "🇪🇸", name: "Spanish" },
  de: { flag: "🇩🇪", name: "German" },
  it: { flag: "🇮🇹", name: "Italian" },
  pt: { flag: "🇵🇹", name: "Portuguese" },
  ja: { flag: "🇯🇵", name: "Japanese" },
  ko: { flag: "🇰🇷", name: "Korean" },
  zh: { flag: "🇨🇳", name: "Chinese" },
  ru: { flag: "🇷🇺", name: "Russian" },
  ar: { flag: "🇸🇦", name: "Arabic" },
  nl: { flag: "🇳🇱", name: "Dutch" },
  sv: { flag: "🇸🇪", name: "Swedish" },
  hi: { flag: "🇮🇳", name: "Hindi" },
  tr: { flag: "🇹🇷", name: "Turkish" },
  pl: { flag: "🇵🇱", name: "Polish" },
  zu: { flag: "🇿🇦", name: "Zulu" },
  af: { flag: "🇿🇦", name: "Afrikaans" },
};

export function getLangMeta(code: string): { flag: string; name: string } {
  return LANG_META[code] || { flag: "🌍", name: code.toUpperCase() };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ActiveLanguage {
  code: string;
  name: string;
  flag: string;
}

export interface UserLanguage extends ActiveLanguage {
  wordCount: number;
}

export interface ActiveLanguageContextValue {
  activeLanguage: ActiveLanguage;
  setActiveLanguage: (code: string) => Promise<void>;
  userLanguages: UserLanguage[];
  isLoading: boolean;
}

// ─── Context ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "fluensea:activeLanguage";

const defaultLanguage: ActiveLanguage = {
  code: "fr",
  name: "French",
  flag: "🇫🇷",
};

const ActiveLanguageContext = createContext<ActiveLanguageContextValue>({
  activeLanguage: defaultLanguage,
  setActiveLanguage: async () => {},
  userLanguages: [],
  isLoading: true,
});

// ─── Storage helpers ────────────────────────────────────────────────────────

function getStoredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredLanguage(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // localStorage may be unavailable
  }
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function ActiveLanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeLanguage, setActiveLanguageState] =
    useState<ActiveLanguage>(defaultLanguage);
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's languages from Supabase on mount / user change
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchLanguages = async () => {
      setIsLoading(true);
      const supabase = createClient();

      try {
        // Get target language from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("target_language")
          .eq("id", user.id)
          .single();

        const targetLang = profile?.target_language || "fr";

        // Get word counts per language from vocabulary
        const { data: wordCounts } = await supabase
          .from("vocabulary")
          .select("language")
          .eq("user_id", user.id);

        // Count words per language
        const countMap: Record<string, number> = {};
        if (wordCounts) {
          for (const row of wordCounts) {
            const lang = row.language || targetLang;
            countMap[lang] = (countMap[lang] || 0) + 1;
          }
        }

        // Ensure the target lang is in the list even if 0 words
        if (!countMap[targetLang]) {
          countMap[targetLang] = 0;
        }

        // Build language list with metadata
        const languages: UserLanguage[] = Object.entries(countMap).map(
          ([code, count]) => {
            const meta = getLangMeta(code);
            return { code, name: meta.name, flag: meta.flag, wordCount: count };
          },
        );

        // Sort: target language first, then by word count desc
        languages.sort((a, b) => {
          if (a.code === targetLang) return -1;
          if (b.code === targetLang) return 1;
          return b.wordCount - a.wordCount;
        });

        setUserLanguages(languages);

        // Determine which language to activate
        const storedCode = getStoredLanguage();
        const activeCode =
          storedCode && languages.find((l) => l.code === storedCode)
            ? storedCode
            : targetLang;

        const meta = getLangMeta(activeCode);
        setActiveLanguageState({
          code: activeCode,
          name: meta.name,
          flag: meta.flag,
        });
        setStoredLanguage(activeCode);
      } catch (err) {
        console.error(
          "[ActiveLanguageContext] Failed to fetch languages:",
          err,
        );
        // Fallback to stored or default
        const stored = getStoredLanguage();
        if (stored) {
          const meta = getLangMeta(stored);
          setActiveLanguageState({
            code: stored,
            name: meta.name,
            flag: meta.flag,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLanguages();
  }, [user]);

  // Switch active language — updates Supabase + local state
  const setActiveLanguage = useCallback(
    async (code: string) => {
      const meta = getLangMeta(code);
      setActiveLanguageState({ code, name: meta.name, flag: meta.flag });
      setStoredLanguage(code);

      if (user) {
        const supabase = createClient();
        try {
          await supabase
            .from("profiles")
            .update({ target_language: code })
            .eq("id", user.id);
        } catch (err) {
          console.error(
            "[ActiveLanguageContext] Failed to persist language:",
            err,
          );
        }
      }
    },
    [user],
  );

  return (
    <ActiveLanguageContext.Provider
      value={{ activeLanguage, setActiveLanguage, userLanguages, isLoading }}
    >
      {children}
    </ActiveLanguageContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useActiveLanguage(): ActiveLanguageContextValue {
  const ctx = useContext(ActiveLanguageContext);
  if (!ctx) {
    throw new Error(
      "useActiveLanguage must be used within an ActiveLanguageProvider",
    );
  }
  return ctx;
}
