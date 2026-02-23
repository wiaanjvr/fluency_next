"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Upload,
  ClipboardPaste,
  Link as LinkIcon,
  BookOpen,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { TopicChips } from "./TopicChips";
import { CuratedTextCard } from "./CuratedTextCard";
import type { CuratedText } from "./CuratedTextCard";

// ─── Types ─────────────────────────────────────────────────────────────────

export type SelectionAction =
  | { type: "generate"; topic: string }
  | { type: "paste"; text: string }
  | { type: "url"; url: string }
  | { type: "curated"; textId: string };

interface SelectionScreenProps {
  targetLanguage: string;
  cefrLevel: string;
  onSelect: (action: SelectionAction) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function SelectionScreen({
  targetLanguage,
  cefrLevel,
  onSelect,
}: SelectionScreenProps) {
  // Topic state
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Import state
  const [importMode, setImportMode] = useState<"paste" | "url" | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [urlText, setUrlText] = useState("");

  // Curated texts
  const [curatedTexts, setCuratedTexts] = useState<CuratedText[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(true);

  // Fetch curated texts on mount
  useEffect(() => {
    const fetchCurated = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("reading_texts")
          .select("id, title, topic, word_count, language, cefr_level")
          .is("user_id", null)
          .eq("language", targetLanguage)
          .eq("cefr_level", cefrLevel)
          .order("created_at", { ascending: false })
          .limit(6);

        setCuratedTexts((data as CuratedText[]) ?? []);
      } catch {
        // Silently ignore — curated section shows empty state
      } finally {
        setCuratedLoading(false);
      }
    };

    fetchCurated();
  }, [targetLanguage, cefrLevel]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleDiveIn = () => {
    if (!selectedTopic) return;
    onSelect({ type: "generate", topic: selectedTopic });
  };

  const handleStartReading = () => {
    if (!pasteText.trim()) return;
    onSelect({ type: "paste", text: pasteText.trim() });
  };

  const handleFetchUrl = () => {
    if (!urlText.trim()) return;
    onSelect({ type: "url", url: urlText.trim() });
  };

  const handleCuratedClick = (text: CuratedText) => {
    onSelect({ type: "curated", textId: text.id });
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      {/* ═══ Page heading ═══ */}
      <div className="text-center">
        <h1 className="font-display text-4xl text-white tracking-wide">
          Choose Your Dive
        </h1>
        <p className="text-gray-400 text-base mt-2">
          Select a topic, import your own text, or pick a curated piece.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Generate a Story                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg text-white font-medium">Generate for me</h2>
        </div>

        <TopicChips
          selected={selectedTopic}
          onSelect={(t) => setSelectedTopic(t || null)}
        />

        <button
          onClick={handleDiveIn}
          disabled={!selectedTopic}
          className={cn(
            "mt-5 w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm",
            "bg-teal-400 text-[#0a1628] transition-all duration-200",
            !selectedTopic && "opacity-50 cursor-not-allowed",
            selectedTopic && "hover:bg-teal-300",
          )}
        >
          Dive In
        </button>
      </section>

      <hr className="border-white/10" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Bring Your Own Text                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg text-white font-medium">Import content</h2>
        </div>

        {/* Two option cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card A — Paste Text */}
          <button
            onClick={() =>
              setImportMode((prev) => (prev === "paste" ? null : "paste"))
            }
            className={cn(
              "bg-[#0d2137] border rounded-2xl p-5 text-left cursor-pointer",
              "transition-all duration-200 flex items-center gap-3",
              importMode === "paste"
                ? "border-teal-400/40 bg-[#0d2137]/80"
                : "border-white/10 hover:border-teal-400/40 hover:bg-[#0d2137]/80",
            )}
          >
            <ClipboardPaste className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="text-gray-200 text-sm font-medium">
              Paste text
            </span>
          </button>

          {/* Card B — Import URL */}
          <button
            onClick={() =>
              setImportMode((prev) => (prev === "url" ? null : "url"))
            }
            className={cn(
              "bg-[#0d2137] border rounded-2xl p-5 text-left cursor-pointer",
              "transition-all duration-200 flex items-center gap-3",
              importMode === "url"
                ? "border-teal-400/40 bg-[#0d2137]/80"
                : "border-white/10 hover:border-teal-400/40 hover:bg-[#0d2137]/80",
            )}
          >
            <LinkIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <span className="text-gray-200 text-sm font-medium">From URL</span>
          </button>
        </div>

        {/* Expanded: Paste Text */}
        {importMode === "paste" && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste any text in your target language..."
              className={cn(
                "bg-[#0d2137] border border-white/10 rounded-xl p-4",
                "text-gray-200 placeholder-gray-500 resize-none h-40 w-full",
                "focus:outline-none focus:border-teal-400/40 transition-colors",
              )}
            />
            <p className="text-gray-500 text-xs">
              Language will be detected automatically
            </p>
            <button
              onClick={handleStartReading}
              disabled={!pasteText.trim()}
              className={cn(
                "w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm",
                "bg-teal-400 text-[#0a1628] transition-all duration-200",
                !pasteText.trim() && "opacity-50 cursor-not-allowed",
                pasteText.trim() && "hover:bg-teal-300",
              )}
            >
              Start Reading
            </button>
          </div>
        )}

        {/* Expanded: URL import */}
        {importMode === "url" && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <input
              type="url"
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder="Paste a URL to an article or blog post"
              className={cn(
                "bg-[#0d2137] border border-white/10 rounded-xl p-4 w-full",
                "text-gray-200 placeholder-gray-500",
                "focus:outline-none focus:border-teal-400/40 transition-colors",
              )}
            />
            <p className="text-gray-500 text-xs">
              We&apos;ll extract the readable text automatically
            </p>
            <button
              onClick={handleFetchUrl}
              disabled={!urlText.trim()}
              className={cn(
                "w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-sm",
                "bg-teal-400 text-[#0a1628] transition-all duration-200",
                !urlText.trim() && "opacity-50 cursor-not-allowed",
                urlText.trim() && "hover:bg-teal-300",
              )}
            >
              Fetch &amp; Read
            </button>
          </div>
        )}
      </section>

      <hr className="border-white/10" />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 3: Curated Library                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg text-white font-medium">
            Curated for your level
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Hand-picked texts matched to your current level
        </p>

        {curatedLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#0d2137] border border-white/10 rounded-2xl p-5 min-w-[220px] h-36 animate-pulse"
              />
            ))}
          </div>
        ) : curatedTexts.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-3">
            {curatedTexts.slice(0, 6).map((text) => (
              <CuratedTextCard
                key={text.id}
                text={text}
                onClick={handleCuratedClick}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Compass className="w-8 h-8 text-gray-600" />
            <p className="text-gray-500 text-sm">
              More curated texts coming soon
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
