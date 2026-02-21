"use client";

import { useParams } from "next/navigation";
import { GrammarHub } from "@/components/grammar";
import type { GrammarLanguageCode } from "@/types/grammar.types";

export default function GrammarTopicPage() {
  const params = useParams();
  const lang = params.lang as GrammarLanguageCode;
  return <GrammarHub initialLang={lang} />;
}
