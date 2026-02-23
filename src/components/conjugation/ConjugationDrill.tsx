"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useConjugationStore } from "@/lib/store/conjugationStore";
import { LANGUAGE_META } from "@/lib/conjugation/languageConfig";
import { ConfigPanel } from "./ConfigPanel";
import { DrillView } from "./DrillView";
import { ResultsView } from "./ResultsView";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Language } from "@/types/conjugation";

export function ConjugationDrill() {
  const { user } = useAuth();
  const phase = useConjugationStore((s) => s.phase);
  const config = useConjugationStore((s) => s.config);
  const isLoading = useConjugationStore((s) => s.isLoading);
  const loadVerbs = useConjugationStore((s) => s.loadVerbs);

  const [targetLang, setTargetLang] = useState<Language>("de");
  const langMeta = LANGUAGE_META[targetLang] ?? LANGUAGE_META.de;

  // Fetch target language from user profile
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.target_language) {
          setTargetLang(data.target_language as Language);
        }
      });
  }, [user]);

  // Load verbs when language is known
  useEffect(() => {
    loadVerbs(targetLang);
  }, [targetLang, loadVerbs]);

  return (
    <div className="min-h-screen bg-[var(--midnight)] text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[var(--midnight)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-1 text-sm text-muted-foreground",
              "transition-colors hover:text-ocean-turquoise",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="text-white/20">·</span>
          <h1 className="text-lg font-light text-foreground">
            Conjugation Drill
          </h1>
          <span className="text-lg">{langMeta.flag}</span>
        </div>
      </header>

      {/* Sign-in banner for unauthenticated users */}
      {!user && (
        <div className="mx-auto max-w-3xl px-4 pt-4">
          <div
            className={cn(
              "rounded-2xl border-[1.5px] border-ocean-turquoise/20 bg-ocean-turquoise/5",
              "px-4 py-3 text-sm text-muted-foreground font-light",
            )}
          >
            <Link
              href="/auth/login"
              className="text-ocean-turquoise hover:underline"
            >
              Sign in
            </Link>{" "}
            to save your progress and track improvement across sessions.
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && phase === "config" ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            {phase === "config" && <ConfigPanel language={targetLang} />}
            {(phase === "drilling" || phase === "feedback") && <DrillView />}
            {phase === "results" && <ResultsView />}
          </>
        )}
      </main>
    </div>
  );
}
