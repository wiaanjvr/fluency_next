"use client";

import { cn } from "@/lib/utils";

// Language → flag emoji lookup
const LANG_FLAGS: Record<string, string> = {
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  nl: "🇳🇱",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
};

export interface CuratedText {
  id: string;
  title: string;
  topic: string | null;
  word_count: number;
  language: string;
  cefr_level: string;
}

interface CuratedTextCardProps {
  text: CuratedText;
  onClick: (text: CuratedText) => void;
}

/**
 * Card for a curated/pre-made reading text in the selection screen.
 */
export function CuratedTextCard({ text, onClick }: CuratedTextCardProps) {
  const flag = LANG_FLAGS[text.language] ?? "🌐";

  return (
    <button
      onClick={() => onClick(text)}
      className={cn(
        "bg-[#0d2137] border border-white/10 rounded-2xl p-5 cursor-pointer text-left",
        "hover:border-teal-400/40 hover:-translate-y-0.5 hover:shadow-lg",
        "transition-all duration-200 min-w-[220px] flex flex-col gap-3",
      )}
    >
      {/* Title */}
      <h4 className="text-white font-medium leading-snug line-clamp-2">
        {text.title}
      </h4>

      {/* Meta row: topic + word count */}
      <div className="flex items-center gap-2 flex-wrap">
        {text.topic && (
          <span className="px-2.5 py-0.5 text-xs rounded-full bg-teal-400/10 text-teal-400 border border-teal-400/20">
            {text.topic}
          </span>
        )}
        <span className="text-gray-400 text-sm">
          {flag} {text.word_count} words
        </span>
      </div>

      {/* Read link */}
      <span className="text-teal-400 text-sm mt-auto">Read Now &rarr;</span>
    </button>
  );
}
