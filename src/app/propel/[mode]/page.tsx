"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { OceanBackground } from "@/components/ocean";
import { ArrowLeft, Construction } from "lucide-react";
import "@/styles/ocean-theme.css";

// Human-readable labels for each mode slug
const MODE_LABELS: Record<string, string> = {
  "free-reading": "Free Reading",
  cloze: "Cloze Activities",
  flashcards: "Flashcards",
  conjugation: "Conjugation Drills",
  pronunciation: "Pronunciation Training",
  grammar: "Grammar Explanations",
};

// Modes that have dedicated routes (not coming soon)
const ROUTED_MODES: Record<string, string> = {
  conjugation: "/conjugation",
};

export default function PropelModePage() {
  const { mode } = useParams<{ mode: string }>();
  const router = useRouter();
  const label = MODE_LABELS[mode] ?? mode;

  // Redirect modes that have dedicated routes
  useEffect(() => {
    if (mode && ROUTED_MODES[mode]) {
      router.push(ROUTED_MODES[mode]);
    }
  }, [mode, router]);

  return (
    <OceanBackground>
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 relative z-10">
        {/* Coming soon card */}
        <div
          className="ocean-card rounded-2xl border border-white/10 p-10 max-w-md w-full text-center space-y-4"
          style={{ background: "rgba(13, 33, 55, 0.8)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(61, 214, 181, 0.15)" }}
          >
            <Construction
              className="w-7 h-7"
              style={{ color: "var(--turquoise)" }}
            />
          </div>

          <div className="space-y-2">
            <h1
              className="font-display text-2xl font-bold"
              style={{ color: "var(--sand)" }}
            >
              {label}
            </h1>
            <p
              className="font-body text-sm"
              style={{ color: "var(--seafoam)", opacity: 0.7 }}
            >
              This mode is being built. Check back soon.
            </p>
          </div>
        </div>

        {/* Back link */}
        <Link
          href="/propel"
          className="flex items-center gap-2 text-sm font-body transition-opacity hover:opacity-100 opacity-60"
          style={{ color: "var(--turquoise)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Propel
        </Link>
      </div>
    </OceanBackground>
  );
}
