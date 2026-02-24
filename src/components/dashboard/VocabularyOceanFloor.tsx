"use client";

/**
 * VocabularyOceanFloor — the early-stage vocabulary view.
 * Shown when a user has < 50 words.  Words live as bioluminescent
 * creatures at different ocean depth zones mapped to their stage.
 */

import { useState, useEffect } from "react";
import { UserWord } from "@/types";
import { Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface VocabularyOceanFloorProps {
  words: UserWord[];
  language: string;
}

// --- Depth zones --------------------------------------------------------------
const ZONES: Record<
  string,
  {
    label: string;
    subLabel: string;
    yPct: number; // vertical position 0-1 within the ocean scene
    glow: string;
    glowStrong: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    creature: string;
  }
> = {
  new: {
    label: "Sunlit Zone",
    subLabel: "0 � 200m",
    yPct: 0.12,
    glow: "0 0 12px rgba(251,191,36,0.5), 0 0 28px rgba(251,191,36,0.2)",
    glowStrong: "0 0 18px rgba(251,191,36,0.8), 0 0 40px rgba(251,191,36,0.4)",
    textColor: "#fde68a",
    bgColor: "rgba(251,191,36,0.13)",
    borderColor: "rgba(251,191,36,0.35)",
    creature: "🪸",
  },
  learning: {
    label: "Twilight Zone",
    subLabel: "200 – 1,000m",
    yPct: 0.38,
    glow: "0 0 12px rgba(52,211,153,0.45), 0 0 28px rgba(52,211,153,0.18)",
    glowStrong:
      "0 0 18px rgba(52,211,153,0.75), 0 0 40px rgba(52,211,153,0.35)",
    textColor: "#6ee7b7",
    bgColor: "rgba(52,211,153,0.11)",
    borderColor: "rgba(52,211,153,0.32)",
    creature: "🐠",
  },
  known: {
    label: "Midnight Zone",
    subLabel: "1,000 – 4,000m",
    yPct: 0.63,
    glow: "0 0 12px rgba(34,211,238,0.45), 0 0 28px rgba(34,211,238,0.18)",
    glowStrong:
      "0 0 18px rgba(34,211,238,0.75), 0 0 40px rgba(34,211,238,0.35)",
    textColor: "#67e8f9",
    bgColor: "rgba(34,211,238,0.10)",
    borderColor: "rgba(34,211,238,0.28)",
    creature: "🐋",
  },
  mastered: {
    label: "Abyssal Zone",
    subLabel: "4,000m+",
    yPct: 0.85,
    glow: "0 0 12px rgba(167,139,250,0.45), 0 0 36px rgba(167,139,250,0.18)",
    glowStrong:
      "0 0 22px rgba(167,139,250,0.85), 0 0 50px rgba(167,139,250,0.38)",
    textColor: "#c4b5fd",
    bgColor: "rgba(167,139,250,0.10)",
    borderColor: "rgba(167,139,250,0.28)",
    creature: "✨",
  },
};

type ZoneKey = keyof typeof ZONES;
function getZone(status: string) {
  return ZONES[(status as ZoneKey) in ZONES ? (status as ZoneKey) : "new"];
}

// --- Deterministic scatter: given index + total, pick x,y offset in zone -----
function scatterOffset(idx: number, total: number, seed: number) {
  // pseudo-random but deterministic so layout is stable
  const phi = 1.6180339887;
  const x = ((idx * phi * 137.508 + seed) % 1) * 2 - 1; // -1..1
  const y = ((idx * phi * 79.37 + seed * 0.3) % 1) * 2 - 1;
  return { x, y };
}

// --- Detail panel -------------------------------------------------------------
function WordDetailPanel({
  word,
  language,
  onClose,
}: {
  word: UserWord;
  language: string;
  onClose: () => void;
}) {
  const zone = getZone(word.status);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setTranslation(null);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: word.word,
        targetLang: "en",
        sourceLang: language,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (active) setTranslation(d.translation ?? "�");
      })
      .catch(() => {
        if (active) setTranslation("Translation unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [word.id, word.word, language]);

  return (
    <div
      className="absolute right-3 top-3 z-30 w-56 rounded-2xl p-4 backdrop-blur-sm border shadow-xl"
      style={{
        background: "rgba(5, 30, 50, 0.90)",
        borderColor: zone.borderColor,
        boxShadow: zone.glowStrong,
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-white/10 transition-colors"
        style={{ color: zone.textColor }}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mb-3">
        <div className="text-xl font-bold" style={{ color: zone.textColor }}>
          {word.word}
        </div>
        {word.lemma && word.lemma !== word.word && (
          <div className="text-xs opacity-55 text-[var(--seafoam)]">
            ({word.lemma})
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-wider text-[var(--seafoam)]/45 mb-1">
          Translation
        </div>
        <div className="text-sm font-medium text-[var(--sand)]">
          {loading ? (
            <span className="flex items-center gap-1.5 text-[var(--seafoam)]/50">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading…
            </span>
          ) : (
            (translation ?? "—")
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
          style={{
            background: zone.bgColor,
            borderColor: zone.borderColor,
            color: zone.textColor,
          }}
        >
          {zone.creature} {zone.label}
        </span>
      </div>

      {word.part_of_speech && (
        <div className="mt-2 text-[11px] text-[var(--seafoam)]/55 capitalize">
          {word.part_of_speech}
        </div>
      )}

      <div className="mt-2 text-[10px] text-[var(--seafoam)]/40">
        Added{" "}
        {formatDistanceToNow(new Date(word.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}

// --- Floating word bubble -----------------------------------------------------
function WordBubble({
  word,
  left,
  top,
  floatDelay,
  isSelected,
  onSelect,
}: {
  word: UserWord;
  left: string;
  top: string;
  floatDelay: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const zone = getZone(word.status);
  const [hovered, setHovered] = useState(false);
  const active = hovered || isSelected;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute focus:outline-none"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        animationDelay: `${floatDelay}s`,
      }}
    >
      <span
        className="vocab-bubble inline-flex items-center px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all duration-300 whitespace-nowrap cursor-pointer"
        style={{
          background: active ? zone.bgColor : "rgba(255,255,255,0.04)",
          borderColor: active ? zone.borderColor : "rgba(255,255,255,0.09)",
          color: active ? zone.textColor : "rgba(255,255,255,0.55)",
          boxShadow: active ? zone.glowStrong : zone.glow,
          transform: active ? "scale(1.08)" : "scale(1)",
          transition: "all 0.25s ease",
        }}
      >
        {isSelected && (
          <span className="mr-1.5 text-[10px]">{zone.creature}</span>
        )}
        {word.word}
      </span>
    </button>
  );
}

// --- Main ocean floor view ----------------------------------------------------
export function VocabularyOceanFloor({
  words,
  language,
}: VocabularyOceanFloorProps) {
  const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);

  // Group words by zone
  const byZone: Record<string, UserWord[]> = {
    new: [],
    learning: [],
    known: [],
    mastered: [],
  };
  words.forEach((w) => {
    const key = (w.status as ZoneKey) in ZONES ? w.status : "new";
    byZone[key].push(w);
  });

  if (words.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <span className="text-5xl">🌊</span>
        <p className="text-[var(--seafoam)] text-sm">
          Your ocean is empty — start learning to populate it.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ minHeight: "480px" }}>
      <style>{`
        @keyframes floatWord {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-6px); }
        }
        .vocab-bubble-wrap { animation: floatWord 4s ease-in-out infinite; }
      `}</style>

      {/* Ocean background */}
      <div
        className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,60,90,0.85) 0%, rgba(1,35,65,0.92) 35%, rgba(5,15,55,0.95) 65%, rgba(8,8,38,0.98) 100%)",
        }}
      >
        {/* Subtle light rays near top */}
        <div
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(61,214,181,0.08) 0%, transparent 80%)",
          }}
        />
        {/* Zone divider lines */}
        {Object.entries(ZONES).map(([key, zone]) => (
          <div
            key={key}
            className="absolute inset-x-0 pointer-events-none"
            style={{ top: `${zone.yPct * 100}%` }}
          >
            <div
              className="absolute right-3 flex flex-col items-end"
              style={{ top: "-10px" }}
            >
              <span
                className="text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: zone.textColor, opacity: 0.55 }}
              >
                {zone.label}
              </span>
              <span
                className="text-[8px]"
                style={{ color: zone.textColor, opacity: 0.35 }}
              >
                {zone.subLabel}
              </span>
            </div>
            <div
              className="w-full h-px"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${zone.borderColor} 30%, ${zone.borderColor} 70%, transparent 100%)`,
                opacity: 0.4,
              }}
            />
          </div>
        ))}
      </div>

      {/* Word bubbles, positioned within their zones */}
      <div className="relative w-full" style={{ minHeight: "480px" }}>
        {Object.entries(byZone).map(([statusKey, zoneWords]) => {
          const zone = ZONES[statusKey as ZoneKey];
          const zoneHeightPct = 0.22; // each zone occupies ~22% height window
          const yCenter = zone.yPct;

          return zoneWords.map((word, idx) => {
            const total = zoneWords.length;
            const { x, y } = scatterOffset(idx, total, statusKey.charCodeAt(0));
            // Spread words across zone
            const xSpread = 0.65; // left=10%, right=90% window
            const leftPct = 50 + x * xSpread * 40; // 10%..90%
            const topPct = (yCenter + y * zoneHeightPct * 0.6) * 100;
            const floatDelay = (idx * 0.7 + statusKey.length * 0.3) % 4;

            return (
              <div
                key={word.id}
                className="vocab-bubble-wrap absolute"
                style={{
                  left: `${Math.max(8, Math.min(92, leftPct))}%`,
                  top: `${Math.max(5, Math.min(93, topPct))}%`,
                  animationDelay: `${floatDelay}s`,
                }}
              >
                <WordBubble
                  word={word}
                  left="0"
                  top="0"
                  floatDelay={floatDelay}
                  isSelected={selectedWord?.id === word.id}
                  onSelect={() =>
                    setSelectedWord(selectedWord?.id === word.id ? null : word)
                  }
                />
              </div>
            );
          });
        })}

        {/* Detail panel for selected word */}
        {selectedWord && (
          <WordDetailPanel
            word={selectedWord}
            language={language}
            onClose={() => setSelectedWord(null)}
          />
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-4 flex flex-wrap gap-3 pointer-events-none">
        {Object.entries(ZONES).map(([key, zone]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: zone.borderColor, boxShadow: zone.glow }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: zone.textColor, opacity: 0.7 }}
            >
              {zone.label} ({byZone[key]?.length ?? 0})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
