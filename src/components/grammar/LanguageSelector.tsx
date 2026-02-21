"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { GRAMMAR_LANGUAGES } from "@/types/grammar.types";
import type { GrammarLanguageCode } from "@/types/grammar.types";

interface LanguageSelectorProps {
  selected: string;
  onChange: (code: GrammarLanguageCode) => void;
  className?: string;
}

export function LanguageSelector({
  selected,
  onChange,
  className,
}: LanguageSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {GRAMMAR_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
            selected === lang.code
              ? "bg-ocean-turquoise text-white shadow-md scale-105"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          title={lang.name}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="hidden sm:inline">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
