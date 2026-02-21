import { GrammarHub } from "@/components/grammar";
import type { GrammarLanguageCode } from "@/types/grammar.types";

interface Props {
  params: Promise<{ lang: string }>;
}

export default async function GrammarLangPage({ params }: Props) {
  const { lang } = await params;
  return <GrammarHub initialLang={lang as GrammarLanguageCode} />;
}
