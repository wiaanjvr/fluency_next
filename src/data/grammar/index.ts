/**
 * Grammar content index — registers all content files for seeding.
 * Import and add new content files here to include them in the seed.
 */
import type { GrammarContentFile } from "@/types/grammar.types";

import starkeVerben from "./de/verben/prasens/starke-verben";
import nominativ from "./de/nomen/kasus/nominativ";
import habenVerben from "./de/verben/perfekt/haben-verben";

export const ALL_GRAMMAR_CONTENT: GrammarContentFile[] = [
  starkeVerben,
  nominativ,
  habenVerben,
];
