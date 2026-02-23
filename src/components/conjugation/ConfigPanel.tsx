"use client";

import { useState, useEffect, useMemo } from "react";
import { useConjugationStore } from "@/lib/store/conjugationStore";
import {
  LANGUAGE_CONFIG,
  getTenseLabel,
} from "@/lib/conjugation/languageConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, Info, Timer, Hash, Zap } from "lucide-react";
import type {
  Language,
  PronounKey,
  SessionConfig,
  Tense,
} from "@/types/conjugation";

interface ConfigPanelProps {
  language: Language;
}

export function ConfigPanel({ language }: ConfigPanelProps) {
  const langConfig = LANGUAGE_CONFIG[language];
  const verbs = useConjugationStore((s) => s.verbs);
  const isLoading = useConjugationStore((s) => s.isLoading);
  const error = useConjugationStore((s) => s.error);
  const startSession = useConjugationStore((s) => s.startSession);

  // Tense selection
  const [selectedTenses, setSelectedTenses] = useState<Tense[]>(
    langConfig?.defaultTenses ?? ["present"],
  );

  // Pronoun selection
  const allPronounKeys =
    langConfig?.pronounConfig.pronouns.map((p) => p.key) ?? [];
  const defaultExcluded = langConfig?.pronounConfig.excludedByDefault ?? [];
  const [selectedPronouns, setSelectedPronouns] = useState<PronounKey[]>(
    allPronounKeys.filter((k) => !defaultExcluded.includes(k)),
  );

  // Verb selection
  const [useAllVerbs, setUseAllVerbs] = useState(true);
  const [selectedVerbIds, setSelectedVerbIds] = useState<string[]>([]);
  const [verbSearch, setVerbSearch] = useState("");
  const [verbClassFilter, setVerbClassFilter] = useState<string>("all");

  // Session settings
  const [timed, setTimed] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [questionCount, setQuestionCount] = useState(20);
  const [useWeighted, setUseWeighted] = useState(true);

  // Filter verbs
  const filteredVerbs = useMemo(() => {
    let result = verbs;
    if (verbSearch.trim()) {
      const q = verbSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.infinitive.toLowerCase().includes(q) ||
          (v.english_meaning ?? "").toLowerCase().includes(q),
      );
    }
    if (verbClassFilter !== "all") {
      result = result.filter((v) => v.verb_class === verbClassFilter);
    }
    return result;
  }, [verbs, verbSearch, verbClassFilter]);

  // Verb classes for filter dropdown
  const verbClasses = useMemo(() => {
    const classes = new Set(verbs.map((v) => v.verb_class).filter(Boolean));
    return Array.from(classes) as string[];
  }, [verbs]);

  // Toggle helpers
  const toggleTense = (tense: Tense) => {
    setSelectedTenses((prev) =>
      prev.includes(tense) ? prev.filter((t) => t !== tense) : [...prev, tense],
    );
  };

  const toggleGroupTenses = (tenses: Tense[]) => {
    const allSelected = tenses.every((t) => selectedTenses.includes(t));
    if (allSelected) {
      setSelectedTenses((prev) => prev.filter((t) => !tenses.includes(t)));
    } else {
      setSelectedTenses((prev) => [...new Set([...prev, ...tenses])]);
    }
  };

  const togglePronoun = (key: PronounKey) => {
    setSelectedPronouns((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const toggleVerb = (verbId: string) => {
    setSelectedVerbIds((prev) =>
      prev.includes(verbId)
        ? prev.filter((v) => v !== verbId)
        : [...prev, verbId],
    );
  };

  // Estimated question count
  const estimatedQuestions = useMemo(() => {
    if (questionCount === 0) return "Unlimited";
    return questionCount;
  }, [questionCount]);

  // Can start?
  const canStart = selectedTenses.length > 0 && selectedPronouns.length > 0;

  const handleStart = () => {
    const config: SessionConfig = {
      language,
      tenses: selectedTenses,
      pronounKeys: selectedPronouns,
      verbIds: useAllVerbs ? [] : selectedVerbIds,
      timed,
      durationSeconds: timed ? durationMinutes * 60 : 0,
      questionCount,
      useWeightedSelection: useWeighted,
    };
    startSession(config);
  };

  if (!langConfig) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Language configuration not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error display */}
      {error && (
        <div className="rounded-2xl border-[1.5px] border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ============================================================ */}
      {/* Section 1: Tenses */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-4 text-xl font-light text-foreground">Tenses</h2>
        <div className="space-y-4">
          {langConfig.tenseGroups.map((group) => {
            const allSelected = group.tenses.every((t) =>
              selectedTenses.includes(t),
            );
            return (
              <div
                key={group.label}
                className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {group.label}
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleGroupTenses(group.tenses)}
                    className="text-xs text-ocean-turquoise hover:underline"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.tenses.map((tense) => (
                    <button
                      key={tense}
                      type="button"
                      onClick={() => toggleTense(tense)}
                      className={cn(
                        "rounded-full px-4 py-1.5 text-sm font-light transition-all duration-200",
                        "border-[1.5px]",
                        selectedTenses.includes(tense)
                          ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
                      )}
                    >
                      {getTenseLabel(language, tense)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 2: Pronouns */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-4 text-xl font-light text-foreground">Pronouns</h2>
        <div className="flex flex-wrap gap-2">
          {langConfig.pronounConfig.pronouns.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => togglePronoun(p.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-light transition-all duration-200",
                "border-[1.5px]",
                selectedPronouns.includes(p.key)
                  ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              {p.display}
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 3: Verbs */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-4 text-xl font-light text-foreground">Verbs</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setUseAllVerbs(true)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-light transition-all duration-200 border-[1.5px]",
                useAllVerbs
                  ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              All verbs ({verbs.length})
            </button>
            <button
              type="button"
              onClick={() => setUseAllVerbs(false)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-light transition-all duration-200 border-[1.5px]",
                !useAllVerbs
                  ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20",
              )}
            >
              Select specific
              {!useAllVerbs && selectedVerbIds.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({selectedVerbIds.length})
                </span>
              )}
            </button>
          </div>

          {!useAllVerbs && (
            <div className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search verbs..."
                    value={verbSearch}
                    onChange={(e) => setVerbSearch(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <select
                  value={verbClassFilter}
                  onChange={(e) => setVerbClassFilter(e.target.value)}
                  className={cn(
                    "rounded-2xl border-[1.5px] border-white/10 bg-white/[0.03]",
                    "px-3 text-sm text-muted-foreground font-light",
                    "focus:border-ocean-turquoise focus:outline-none",
                  )}
                >
                  <option value="all">All classes</option>
                  {verbClasses.map((c) => (
                    <option key={c} value={c}>
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredVerbs.map((v) => (
                  <label
                    key={v.id}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer",
                      "transition-colors hover:bg-white/[0.03]",
                      selectedVerbIds.includes(v.id) && "bg-ocean-turquoise/5",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedVerbIds.includes(v.id)}
                      onChange={() => toggleVerb(v.id)}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-ocean-turquoise"
                    />
                    <span className="text-sm font-light text-foreground">
                      {v.infinitive}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({v.english_meaning})
                    </span>
                    {v.verb_class && (
                      <Badge
                        variant="outline"
                        className="ml-auto text-[10px] px-2 py-0"
                      >
                        {v.verb_class.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </label>
                ))}
                {filteredVerbs.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No verbs found.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Section 4: Session Settings */}
      {/* ============================================================ */}
      <section>
        <h2 className="mb-4 text-xl font-light text-foreground">
          Session Settings
        </h2>
        <div className="rounded-2xl border-[1.5px] border-white/5 bg-white/[0.02] p-4 space-y-5">
          {/* Timed toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-light">Timed mode</span>
            </div>
            <button
              type="button"
              onClick={() => setTimed(!timed)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors duration-200",
                timed ? "bg-ocean-turquoise" : "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200",
                  timed && "translate-x-5",
                )}
              />
            </button>
          </div>

          {/* Duration (if timed) */}
          {timed && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-light">
                Duration: {durationMinutes} minutes
              </label>
              <div className="flex gap-2">
                {[2, 5, 10, 15, 20].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMinutes(m)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-light border-[1.5px] transition-all",
                      durationMinutes === m
                        ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                        : "border-white/10 text-muted-foreground hover:border-white/20",
                    )}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-light">Questions</span>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30, 50, 0].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setQuestionCount(c)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-light border-[1.5px] transition-all",
                    questionCount === c
                      ? "border-ocean-turquoise bg-ocean-turquoise/15 text-ocean-turquoise"
                      : "border-white/10 text-muted-foreground hover:border-white/20",
                  )}
                >
                  {c === 0 ? "∞" : c}
                </button>
              ))}
            </div>
          </div>

          {/* Weighted selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-light">Focus on weak verbs</span>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                <div
                  className={cn(
                    "invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
                    "w-52 rounded-xl border-[1.5px] border-white/10 bg-[var(--midnight)] p-3",
                    "text-xs text-muted-foreground font-light shadow-xl z-50",
                  )}
                >
                  Questions are weighted by your production score — weaker
                  verb+tense combinations appear more often.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseWeighted(!useWeighted)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors duration-200",
                useWeighted ? "bg-ocean-turquoise" : "bg-white/10",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200",
                  useWeighted && "translate-x-5",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Start Button */}
      {/* ============================================================ */}
      <div className="space-y-2 pb-8">
        <Button
          variant="accent"
          size="lg"
          className="w-full"
          disabled={!canStart || isLoading}
          onClick={handleStart}
        >
          {isLoading ? "Preparing…" : "Begin Drill →"}
        </Button>
        <p className="text-center text-xs text-muted-foreground font-light">
          ~{estimatedQuestions} questions · {selectedTenses.length} tense
          {selectedTenses.length !== 1 && "s"} · {selectedPronouns.length}{" "}
          pronoun{selectedPronouns.length !== 1 && "s"}
        </p>
      </div>
    </div>
  );
}
