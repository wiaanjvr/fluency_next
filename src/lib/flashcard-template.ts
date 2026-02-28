// ============================================================================
// Flashcard Template Engine
// ============================================================================
// Renders Anki-compatible Handlebars-style templates with field substitution,
// conditional rendering, cloze deletions, type-in-answer, and FrontSide refs.
// ============================================================================

// ── Cloze regex ────────────────────────────────────────────────────────────
// Matches {{c1::answer}} or {{c1::answer::hint}}
const CLOZE_RE = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g;

// ── Template syntax regexes ────────────────────────────────────────────────
const FIELD_RE = /\{\{([^#^/}][^}]*)\}\}/g;
const CONDITIONAL_RE = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const INVERSE_CONDITIONAL_RE = /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const TYPE_FIELD_RE = /\{\{type:(\w+)\}\}/g;
const CLOZE_TEMPLATE_RE = /\{\{cloze:(\w+)\}\}/g;

// ── Result of rendering a template ─────────────────────────────────────────
export interface RenderedCard {
  /** The rendered HTML for the front of the card */
  front: string;
  /** The rendered HTML for the back of the card */
  back: string;
  /** Per-card CSS (from the note type) */
  css: string;
  /** If this card uses type-in-answer, which field name */
  typeAnswerField: string | null;
  /** The expected answer for type-in cards */
  typeAnswerValue: string | null;
  /** The cloze ordinal (1, 2, etc.) if this is a cloze card */
  clozeOrdinal: number | null;
}

// ── Cloze detection ────────────────────────────────────────────────────────

/**
 * Extract all cloze ordinals from a set of field values.
 * e.g. "{{c1::Berlin}} is the capital of {{c2::Germany}}" → [1, 2]
 */
export function extractClozeOrdinals(fields: Record<string, string>): number[] {
  const ordinals = new Set<number>();
  for (const value of Object.values(fields)) {
    let match;
    const re = new RegExp(CLOZE_RE.source, "g");
    while ((match = re.exec(value)) !== null) {
      ordinals.add(parseInt(match[1], 10));
    }
  }
  return Array.from(ordinals).sort((a, b) => a - b);
}

/**
 * Render a cloze field for the front side (question).
 * The active cloze number is blanked out; other clozes are shown as plain text.
 */
export function renderClozeFront(text: string, activeOrdinal: number): string {
  return text.replace(
    new RegExp(CLOZE_RE.source, "g"),
    (_, num, answer, hint) => {
      const n = parseInt(num, 10);
      if (n === activeOrdinal) {
        const hintText = hint ? hint : "...";
        return `<span class="cloze-blank" data-ordinal="${n}">[${hintText}]</span>`;
      }
      // Inactive clozes: show the answer as plain text
      return answer;
    },
  );
}

/**
 * Render a cloze field for the back side (answer).
 * The active cloze number is highlighted; others shown normally.
 */
export function renderClozeBack(text: string, activeOrdinal: number): string {
  return text.replace(new RegExp(CLOZE_RE.source, "g"), (_, num, answer) => {
    const n = parseInt(num, 10);
    if (n === activeOrdinal) {
      return `<span class="cloze-answer" data-ordinal="${n}">${answer}</span>`;
    }
    return answer;
  });
}

// ── Field substitution helpers ─────────────────────────────────────────────

function isFieldEmpty(value: string | undefined): boolean {
  if (!value) return true;
  // Strip HTML tags and check if anything remains
  const stripped = value.replace(/<[^>]*>/g, "").trim();
  return stripped.length === 0;
}

/**
 * Process conditional blocks: {{#FieldName}}content{{/FieldName}}
 * Shows content only if the field is non-empty.
 */
function processConditionals(
  template: string,
  fields: Record<string, string>,
): string {
  return template.replace(CONDITIONAL_RE, (_, fieldName, content) => {
    return isFieldEmpty(fields[fieldName]) ? "" : content;
  });
}

/**
 * Process inverse conditional blocks: {{^FieldName}}content{{/FieldName}}
 * Shows content only if the field IS empty.
 */
function processInverseConditionals(
  template: string,
  fields: Record<string, string>,
): string {
  return template.replace(INVERSE_CONDITIONAL_RE, (_, fieldName, content) => {
    return isFieldEmpty(fields[fieldName]) ? content : "";
  });
}

/**
 * Process {{type:FieldName}} — inserts a text input placeholder.
 * On the front, shows an input field. On the back, shows the correct answer.
 */
function processTypeAnswer(
  template: string,
  fields: Record<string, string>,
  side: "front" | "back",
): { html: string; typeField: string | null; typeValue: string | null } {
  let typeField: string | null = null;
  let typeValue: string | null = null;

  const html = template.replace(TYPE_FIELD_RE, (_, fieldName) => {
    typeField = fieldName;
    typeValue = fields[fieldName]
      ? fields[fieldName].replace(/<[^>]*>/g, "").trim()
      : "";

    if (side === "front") {
      return `<div class="type-answer-input" data-field="${fieldName}"><input type="text" placeholder="Type your answer..." class="type-answer-field" autocomplete="off" autocapitalize="off" spellcheck="false" /></div>`;
    } else {
      return `<div class="type-answer-result" data-field="${fieldName}" data-expected="${escapeHtml(typeValue)}"></div>`;
    }
  });

  return { html, typeField, typeValue };
}

/**
 * Process {{cloze:FieldName}} — renders the cloze field for the given ordinal.
 */
function processClozeTemplate(
  template: string,
  fields: Record<string, string>,
  clozeOrdinal: number,
  side: "front" | "back",
): string {
  return template.replace(CLOZE_TEMPLATE_RE, (_, fieldName) => {
    const fieldValue = fields[fieldName] || "";
    if (side === "front") {
      return renderClozeFront(fieldValue, clozeOrdinal);
    } else {
      return renderClozeBack(fieldValue, clozeOrdinal);
    }
  });
}

/**
 * Substitute simple field references: {{FieldName}}
 * Skips special references like FrontSide, cloze:, type:, and conditional blocks.
 */
function substituteFields(
  template: string,
  fields: Record<string, string>,
): string {
  return template.replace(FIELD_RE, (match, fieldName) => {
    const trimmed = fieldName.trim();
    // Skip special references
    if (
      trimmed === "FrontSide" ||
      trimmed.startsWith("type:") ||
      trimmed.startsWith("cloze:") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("^") ||
      trimmed.startsWith("/")
    ) {
      return match;
    }
    return fields[trimmed] ?? "";
  });
}

// ── Main render function ───────────────────────────────────────────────────

export interface RenderOptions {
  /** The card template's front template string */
  frontTemplate: string;
  /** The card template's back template string */
  backTemplate: string;
  /** The note's field values */
  fields: Record<string, string>;
  /** Per-card CSS from the note type */
  css?: string;
  /** For cloze cards, which ordinal this card represents */
  clozeOrdinal?: number;
}

/**
 * Render a card from its template and field values.
 *
 * Supports:
 * - {{FieldName}} field substitution
 * - {{#FieldName}}...{{/FieldName}} conditional (non-empty)
 * - {{^FieldName}}...{{/FieldName}} inverse conditional (empty)
 * - {{FrontSide}} on back template (replaced with rendered front)
 * - {{type:FieldName}} type-in-answer input
 * - {{cloze:FieldName}} cloze deletion rendering
 * - Per-card CSS
 */
export function renderCardTemplate(options: RenderOptions): RenderedCard {
  const {
    frontTemplate,
    backTemplate,
    fields,
    css = "",
    clozeOrdinal,
  } = options;

  const isCloze = clozeOrdinal != null;

  // ── Render Front ─────────────────────────────────────────────────────
  let front = frontTemplate;

  // 1. Process cloze templates
  if (isCloze) {
    front = processClozeTemplate(front, fields, clozeOrdinal, "front");
  }

  // 2. Process conditionals
  front = processConditionals(front, fields);
  front = processInverseConditionals(front, fields);

  // 3. Substitute fields
  front = substituteFields(front, fields);

  // 4. Process type-in-answer
  const frontType = processTypeAnswer(front, fields, "front");
  front = frontType.html;

  // ── Render Back ──────────────────────────────────────────────────────
  let back = backTemplate;

  // 1. Replace {{FrontSide}} with the rendered front content
  back = back.replace(/\{\{FrontSide\}\}/g, front);

  // 2. Process cloze templates
  if (isCloze) {
    back = processClozeTemplate(back, fields, clozeOrdinal, "back");
  }

  // 3. Process conditionals
  back = processConditionals(back, fields);
  back = processInverseConditionals(back, fields);

  // 4. Substitute fields
  back = substituteFields(back, fields);

  // 5. Process type-in-answer (on back, show comparison)
  const backType = processTypeAnswer(back, fields, "back");
  back = backType.html;

  return {
    front,
    back,
    css,
    typeAnswerField: frontType.typeField || backType.typeField,
    typeAnswerValue: frontType.typeValue || backType.typeValue,
    clozeOrdinal: clozeOrdinal ?? null,
  };
}

// ── Type-in-answer comparison ──────────────────────────────────────────────

/**
 * Compare user's typed answer against the expected answer and produce
 * a diff-style HTML string highlighting correct/incorrect characters.
 */
export function compareTypeAnswer(
  userAnswer: string,
  expected: string,
): { html: string; isCorrect: boolean } {
  const clean = (s: string) => s.trim();
  const user = clean(userAnswer);
  const exp = clean(expected);

  if (user.toLowerCase() === exp.toLowerCase()) {
    // Exact match (case-insensitive)
    const exact = user === exp;
    return {
      html: `<span class="type-correct">${escapeHtml(exp)}</span>`,
      isCorrect: exact,
    };
  }

  // Character-by-character diff
  const parts: string[] = [];
  const maxLen = Math.max(user.length, exp.length);

  for (let i = 0; i < maxLen; i++) {
    const uc = user[i];
    const ec = exp[i];

    if (uc === ec) {
      parts.push(`<span class="type-correct">${escapeHtml(ec)}</span>`);
    } else if (uc && ec) {
      parts.push(`<span class="type-wrong">${escapeHtml(uc)}</span>`);
    } else if (uc && !ec) {
      parts.push(`<span class="type-extra">${escapeHtml(uc)}</span>`);
    } else if (!uc && ec) {
      parts.push(`<span class="type-missing">${escapeHtml(ec)}</span>`);
    }
  }

  return {
    html: parts.join(""),
    isCorrect: false,
  };
}

// ── Utility ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ── CSS for card template rendering ────────────────────────────────────────

/**
 * Default CSS for cloze blanks, type-in answer, and card styling.
 * This is injected into the card rendering wrapper alongside per-card CSS.
 */
export const CARD_TEMPLATE_CSS = `
/* ── Cloze Deletions ────────────────────────────────────── */
.cloze-blank {
  display: inline-block;
  min-width: 3em;
  padding: 0.15em 0.5em;
  border-bottom: 2px solid #2dd4bf;
  color: #2dd4bf;
  font-weight: 600;
  font-style: italic;
  background: rgba(45, 212, 191, 0.08);
  border-radius: 4px;
}

.cloze-answer {
  display: inline;
  color: #2dd4bf;
  font-weight: 700;
  text-decoration: underline;
  text-decoration-color: rgba(45, 212, 191, 0.4);
  text-underline-offset: 3px;
}

/* ── Type-in Answer ─────────────────────────────────────── */
.type-answer-input {
  margin: 0.75em 0;
}

.type-answer-field {
  width: 100%;
  padding: 0.6em 0.8em;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 1.1em;
  outline: none;
  transition: border-color 0.2s;
}

.type-answer-field:focus {
  border-color: #2dd4bf;
}

.type-answer-result {
  margin: 0.5em 0;
  padding: 0.5em 0.8em;
  border-radius: 0.5rem;
  font-size: 1.1em;
  font-family: monospace;
}

.type-correct { color: #4ade80; }
.type-wrong   { color: #f87171; text-decoration: line-through; }
.type-extra   { color: #f87171; text-decoration: line-through; opacity: 0.6; }
.type-missing { color: #facc15; text-decoration: underline; }

/* ── Image Occlusion ────────────────────────────────────── */
.image-occlusion-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
}

.image-occlusion-container img {
  display: block;
  max-width: 100%;
  border-radius: 0.5rem;
}

.occlusion-rect {
  position: absolute;
  background: #e11d48;
  border-radius: 4px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: default;
}

.occlusion-rect.revealed {
  background: rgba(45, 212, 191, 0.2);
  border: 2px solid #2dd4bf;
  opacity: 1;
}

.occlusion-rect.revealed .occlusion-label {
  color: #2dd4bf;
}
`;
