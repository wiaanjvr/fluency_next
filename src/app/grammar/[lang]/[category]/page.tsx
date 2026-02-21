"use client";

import { useParams } from "next/navigation";
import { GrammarHub } from "@/components/grammar";
import type { GrammarLanguageCode } from "@/types/grammar.types";

export default function GrammarCategoryPage() {
  const params = useParams();
  const lang = params.lang as GrammarLanguageCode;
  // Category page just shows the hub filtered — the sidebar handles navigation
  return <GrammarHub initialLang={lang} />;
}
