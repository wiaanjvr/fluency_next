// ============================================================================
// Advanced Card Search Query Parser
// Supports Anki-like search syntax:
//   deck:German tag:verb is:due is:new is:learning is:review is:suspended
//   is:buried is:leech ease:>2.5 interval:>30 reps:>5 lapses:>3
//   due:today due:tomorrow due:7 (due within N days)
//   added:7 (added within last N days)
//   rated:1 rated:2 rated:3 rated:4
//   note:Basic note:Cloze
//   flag:1 (placeholder for future flags)
//   prop:stability>5  prop:difficulty<7
//   Free text searches front/back field content
// ============================================================================

import type { CardState } from "@/types/flashcards";

export interface SearchFilter {
  type:
    | "deck"
    | "tag"
    | "state"
    | "note"
    | "text"
    | "ease"
    | "interval"
    | "reps"
    | "lapses"
    | "due"
    | "added"
    | "rated"
    | "flag"
    | "source"
    | "suspended"
    | "buried"
    | "leech"
    | "stability"
    | "difficulty"
    | "word_class";
  value: string;
  negate: boolean;
  operator?: ">" | "<" | ">=" | "<=" | "=";
  numericValue?: number;
}

export interface ParsedQuery {
  filters: SearchFilter[];
  textTerms: string[];
}

// ---------------------------------------------------------------------------
// Parse a search query string into structured filters
// ---------------------------------------------------------------------------
export function parseSearchQuery(query: string): ParsedQuery {
  const filters: SearchFilter[] = [];
  const textTerms: string[] = [];

  if (!query.trim()) return { filters, textTerms };

  // Tokenize: handle quoted strings and key:value pairs
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < query.length; i++) {
    const ch = query[i];

    if ((ch === '"' || ch === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = ch;
      continue;
    }

    if (ch === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      continue;
    }

    if (ch === " " && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }
  if (current) tokens.push(current);

  for (const token of tokens) {
    const negate = token.startsWith("-");
    const clean = negate ? token.slice(1) : token;

    // deck:Name
    if (/^deck:/i.test(clean)) {
      filters.push({
        type: "deck",
        value: clean.slice(5),
        negate,
      });
      continue;
    }

    // tag:value
    if (/^tag:/i.test(clean)) {
      filters.push({
        type: "tag",
        value: clean.slice(4),
        negate,
      });
      continue;
    }

    // note:BasicType
    if (/^note:/i.test(clean)) {
      filters.push({
        type: "note",
        value: clean.slice(5),
        negate,
      });
      continue;
    }

    // source:manual|csv|anki|cloze|conjugation|reading
    if (/^source:/i.test(clean)) {
      filters.push({
        type: "source",
        value: clean.slice(7),
        negate,
      });
      continue;
    }

    // word_class:verb
    if (/^class:/i.test(clean)) {
      filters.push({
        type: "word_class",
        value: clean.slice(6),
        negate,
      });
      continue;
    }

    // is:due|new|learning|review|suspended|buried|leech
    if (/^is:/i.test(clean)) {
      const val = clean.slice(3).toLowerCase();
      if (["new", "learning", "review", "relearning"].includes(val)) {
        filters.push({ type: "state", value: val, negate });
      } else if (val === "due") {
        filters.push({ type: "due", value: "0", negate }); // due today or overdue
      } else if (val === "suspended") {
        filters.push({ type: "suspended", value: "true", negate });
      } else if (val === "buried") {
        filters.push({ type: "buried", value: "true", negate });
      } else if (val === "leech") {
        filters.push({ type: "leech", value: "true", negate });
      }
      continue;
    }

    // Numeric comparisons: ease:>2.5, interval:>30, reps:>5, lapses:>3
    const numericMatch = clean.match(
      /^(ease|interval|reps|lapses|stability|difficulty):(>=?|<=?|=)?(\d+\.?\d*)$/i,
    );
    if (numericMatch) {
      filters.push({
        type: numericMatch[1].toLowerCase() as SearchFilter["type"],
        value: numericMatch[3],
        negate,
        operator: (numericMatch[2] as SearchFilter["operator"]) || "=",
        numericValue: parseFloat(numericMatch[3]),
      });
      continue;
    }

    // due:N (due within N days)
    if (/^due:\d+$/i.test(clean)) {
      filters.push({
        type: "due",
        value: clean.slice(4),
        negate,
      });
      continue;
    }

    // due:today / due:tomorrow
    if (/^due:(today|tomorrow)$/i.test(clean)) {
      const val = clean.slice(4).toLowerCase();
      filters.push({
        type: "due",
        value: val === "today" ? "0" : "1",
        negate,
      });
      continue;
    }

    // added:N (added in last N days)
    if (/^added:\d+$/i.test(clean)) {
      filters.push({
        type: "added",
        value: clean.slice(6),
        negate,
      });
      continue;
    }

    // rated:1-4
    if (/^rated:[1-4]$/i.test(clean)) {
      filters.push({
        type: "rated",
        value: clean.slice(6),
        negate,
      });
      continue;
    }

    // flag:N
    if (/^flag:\d+$/i.test(clean)) {
      filters.push({
        type: "flag",
        value: clean.slice(5),
        negate,
      });
      continue;
    }

    // Free text
    textTerms.push(negate ? `-${clean}` : clean);
  }

  return { filters, textTerms };
}

// ---------------------------------------------------------------------------
// Search syntax help text
// ---------------------------------------------------------------------------
export const SEARCH_SYNTAX_HELP = [
  { syntax: "deck:Name", description: "Cards in a specific deck" },
  { syntax: "tag:verb", description: "Cards with a specific tag" },
  { syntax: "note:Basic", description: "Cards with a note type" },
  { syntax: "is:due", description: "Cards due for review" },
  { syntax: "is:new", description: "New cards" },
  { syntax: "is:learning", description: "Cards in learning" },
  { syntax: "is:review", description: "Review cards" },
  { syntax: "is:suspended", description: "Suspended cards" },
  { syntax: "is:buried", description: "Buried cards" },
  { syntax: "is:leech", description: "Leech cards" },
  { syntax: "interval:>30", description: "Interval comparison" },
  { syntax: "ease:>2.5", description: "Ease/difficulty comparison" },
  { syntax: "reps:>5", description: "Repetition count" },
  { syntax: "lapses:>3", description: "Lapse count" },
  { syntax: "due:7", description: "Due within N days" },
  { syntax: "added:30", description: "Added in last N days" },
  { syntax: "source:anki", description: "Card source filter" },
  { syntax: "class:verb", description: "Word class filter" },
  { syntax: "-tag:easy", description: "Negate any filter with -" },
  { syntax: '"exact phrase"', description: "Search exact text" },
];

// ---------------------------------------------------------------------------
// Build human-readable description of active filters
// ---------------------------------------------------------------------------
export function describeFilters(parsed: ParsedQuery): string {
  const parts: string[] = [];

  for (const f of parsed.filters) {
    const neg = f.negate ? "NOT " : "";
    switch (f.type) {
      case "deck":
        parts.push(`${neg}deck "${f.value}"`);
        break;
      case "tag":
        parts.push(`${neg}tag "${f.value}"`);
        break;
      case "state":
        parts.push(`${neg}state: ${f.value}`);
        break;
      case "note":
        parts.push(`${neg}note type: ${f.value}`);
        break;
      case "due":
        parts.push(`${neg}due within ${f.value} days`);
        break;
      case "added":
        parts.push(`${neg}added within ${f.value} days`);
        break;
      case "suspended":
        parts.push(`${neg}suspended`);
        break;
      case "buried":
        parts.push(`${neg}buried`);
        break;
      case "leech":
        parts.push(`${neg}leech`);
        break;
      default:
        parts.push(`${neg}${f.type}${f.operator || "="}${f.value}`);
    }
  }

  if (parsed.textTerms.length > 0) {
    parts.push(`text: "${parsed.textTerms.join(" ")}"`);
  }

  return parts.join(", ") || "All cards";
}
