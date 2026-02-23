"use client";

import { useEffect, useState } from "react";
import {
  LANGUAGE_CONFIG,
  getTenseLabel,
  getPronounDisplay,
} from "@/lib/conjugation/languageConfig";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";
import type {
  Language,
  Tense,
  ConjugationForm,
  ConjugationVerb,
} from "@/types/conjugation";

interface ConjugationChartProps {
  verbId: string;
  language: Language;
  tenses?: Tense[];
}

export function ConjugationChart({
  verbId,
  language,
  tenses,
}: ConjugationChartProps) {
  const [verb, setVerb] = useState<ConjugationVerb | null>(null);
  const [forms, setForms] = useState<ConjugationForm[]>([]);
  const [loading, setLoading] = useState(true);

  const langConfig = LANGUAGE_CONFIG[language];
  const pronouns = langConfig?.pronounConfig.pronouns ?? [];

  // Determine which tenses to display
  const displayTenses: Tense[] = tenses ??
    langConfig?.tenseGroups.flatMap((g) => g.tenses) ?? ["present"];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/conjugation/verbs?language=${language}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();

        const foundVerb = (data.verbs ?? []).find(
          (v: ConjugationVerb) => v.id === verbId,
        );
        setVerb(foundVerb ?? null);

        const verbForms = (data.forms ?? []).filter(
          (f: ConjugationForm) => f.verb_id === verbId,
        );
        setForms(verbForms);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [verbId, language]);

  // Build lookup: "tense|pronounKey" → form
  const formLookup = new Map(
    forms.map((f) => [`${f.tense}|${f.pronoun_key}`, f]),
  );

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!verb) {
    return <p className="text-sm text-muted-foreground">Verb not found.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-light text-foreground">
            {verb.infinitive}
          </h3>
          <p className="text-sm text-muted-foreground font-light">
            {verb.english_meaning}
            {verb.verb_class && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {verb.verb_class.replace(/_/g, " ")}
              </Badge>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Print chart"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>

      {/* Conjugation table */}
      <div className="overflow-x-auto rounded-2xl border-[1.5px] border-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="sticky left-0 z-10 bg-[var(--midnight)] px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                Pronoun
              </th>
              {displayTenses.map((tense) => (
                <th
                  key={tense}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  {getTenseLabel(language, tense)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pronouns.map((p) => (
              <tr
                key={p.key}
                className="hover:bg-white/[0.02] transition-colors"
              >
                <td className="sticky left-0 z-10 bg-[var(--midnight)] px-4 py-2.5 font-light text-ocean-turquoise whitespace-nowrap">
                  {p.display}
                </td>
                {displayTenses.map((tense) => {
                  const form = formLookup.get(`${tense}|${p.key}`);
                  const isIrregular = !!form?.rule_explanation;
                  return (
                    <td
                      key={`${tense}-${p.key}`}
                      className="px-4 py-2.5 font-light text-foreground whitespace-nowrap"
                    >
                      {form ? (
                        <span
                          className={cn(
                            isIrregular &&
                              "underline decoration-amber-400/40 decoration-1 underline-offset-4",
                          )}
                          title={form.rule_explanation ?? undefined}
                        >
                          {form.conjugated_form}
                        </span>
                      ) : (
                        <span className="text-white/10">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground font-light">
        <span className="underline decoration-amber-400/40 decoration-1 underline-offset-4">
          Underlined
        </span>{" "}
        forms are irregular or stem-changing. Hover for explanation.
      </p>
    </div>
  );
}
