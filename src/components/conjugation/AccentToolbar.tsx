"use client";

import { LANGUAGE_CONFIG } from "@/lib/conjugation/languageConfig";
import { cn } from "@/lib/utils";
import type { Language } from "@/types/conjugation";

interface AccentToolbarProps {
  language: Language;
  onInsert: (char: string) => void;
}

export function AccentToolbar({ language, onInsert }: AccentToolbarProps) {
  const config = LANGUAGE_CONFIG[language];
  const characters = config?.accentConfig.characters ?? [];

  if (characters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {characters.map((char) => (
        <button
          key={char}
          type="button"
          onClick={() => onInsert(char)}
          className={cn(
            "inline-flex h-8 min-w-[2rem] items-center justify-center",
            "rounded-lg border-[1.5px] border-white/10 bg-white/[0.03]",
            "text-sm font-light text-ocean-turquoise",
            "transition-all duration-150",
            "hover:border-ocean-turquoise/40 hover:bg-ocean-turquoise/10",
            "active:scale-95",
          )}
          tabIndex={-1}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
