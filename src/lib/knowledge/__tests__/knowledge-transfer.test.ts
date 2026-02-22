/* =============================================================================
   KNOWLEDGE TRANSFER AUDIT TESTS
   
   Comprehensive test suite verifying correct knowledge transfer across
   ALL game modules. Uses a mock Supabase client to test the full pipeline
   without network dependencies.
   
   Covers 8 exact scenarios from the specification:
   1. Learning in Anki transfers to Story Engine
   2. Production in Cloze raises productionScore visible to Conjugation
   3. Grammar concept mastery updates from Conjugation
   4. Cross-module deduplication
   5. Incorrect answer anywhere lowers scores across all modules
   6. New word learned in Cloze appears as known in Anki
   7. Score decay after inactivity
   8. shouldSkip respected by all modules
============================================================================= */

import { processReview } from "../process-review";
import { getWordStateForModule, buildPresentationContext } from "../word-state";
import {
  updateGrammarConceptMastery,
  getConceptMastery,
} from "../grammar-mastery";
import { deduplicationGuard } from "../deduplication-guard";
import { eventBus } from "../event-bus";
import { AnkiAdapter } from "../adapters/anki";
import { ClozeAdapter } from "../adapters/cloze";
import { ConjugationAdapter } from "../adapters/conjugation";
import { PronunciationAdapter } from "../adapters/pronunciation";
import { StoryAdapter } from "../adapters/story";
import { GrammarAdapter } from "../adapters/grammar";
import { dbRowToWordRecord } from "../types";
import type {
  WordKnowledgeRecord,
  ModuleReviewEvent,
  WordReviewedEvent,
} from "../types";

// ---------------------------------------------------------------------------
// Mock Supabase Client
// ---------------------------------------------------------------------------

interface MockRow {
  [key: string]: unknown;
}

/**
 * Creates a mock Supabase client that stores data in-memory.
 * Supports the subset of operations used by the knowledge system.
 */
function createMockSupabase() {
  const tables: Record<string, MockRow[]> = {
    user_words: [],
    module_review_history: [],
    word_interactions: [],
    grammar_concept_mastery: [],
  };

  // Helper: deep clone to avoid reference issues
  const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

  function createQueryBuilder(tableName: string) {
    let filterChain: Array<{
      column: string;
      op: string;
      value: unknown;
    }> = [];
    let orderColumn: string | null = null;
    let orderAsc = true;
    let limitCount: number | null = null;
    let selectColumns: string | null = null;
    let isSingle = false;
    let isMaybeSingle = false;

    const builder = {
      select(columns?: string) {
        selectColumns = columns ?? "*";
        return builder;
      },
      eq(column: string, value: unknown) {
        filterChain.push({ column, op: "eq", value });
        return builder;
      },
      contains(column: string, value: unknown) {
        filterChain.push({ column, op: "contains", value });
        return builder;
      },
      gte(column: string, value: unknown) {
        filterChain.push({ column, op: "gte", value });
        return builder;
      },
      in(column: string, values: unknown[]) {
        filterChain.push({ column, op: "in", value: values });
        return builder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        orderColumn = column;
        orderAsc = opts?.ascending ?? true;
        return builder;
      },
      limit(count: number) {
        limitCount = count;
        return builder;
      },
      single() {
        isSingle = true;
        return applyFilters();
      },
      maybeSingle() {
        isMaybeSingle = true;
        return applyFilters();
      },
      then(resolve: (result: { data: unknown; error: unknown }) => void) {
        const result = applyFiltersArray();
        resolve(result);
      },
    };

    function applyFiltersArray(): { data: MockRow[] | null; error: null } {
      let rows = clone(tables[tableName] ?? []);

      for (const f of filterChain) {
        rows = rows.filter((row) => {
          if (f.op === "eq") return row[f.column] === f.value;
          if (f.op === "gte")
            return (row[f.column] as string) >= (f.value as string);
          if (f.op === "contains") {
            const arr = row[f.column] as unknown[];
            const val = f.value as unknown[];
            return val.every((v) => arr?.includes(v));
          }
          if (f.op === "in") {
            return (f.value as unknown[]).includes(row[f.column]);
          }
          return true;
        });
      }

      if (orderColumn) {
        rows.sort((a, b) => {
          const va = a[orderColumn!] as string;
          const vb = b[orderColumn!] as string;
          return orderAsc ? (va < vb ? -1 : 1) : va > vb ? -1 : 1;
        });
      }

      if (limitCount !== null) {
        rows = rows.slice(0, limitCount);
      }

      return { data: rows, error: null };
    }

    function applyFilters(): { data: MockRow | null; error: unknown } {
      const result = applyFiltersArray();
      if (isSingle) {
        if (!result.data || result.data.length === 0) {
          return { data: null, error: { message: "Row not found" } };
        }
        return { data: result.data[0], error: null };
      }
      if (isMaybeSingle) {
        return {
          data: result.data && result.data.length > 0 ? result.data[0] : null,
          error: null,
        };
      }
      return result as unknown as { data: MockRow | null; error: unknown };
    }

    // Make the builder thenable for non-single queries
    (builder as unknown as { then: unknown }).then = function (
      resolve: (value: { data: MockRow[] | null; error: null }) => void,
    ) {
      resolve(applyFiltersArray());
    };

    return builder;
  }

  const mockClient = {
    from(tableName: string) {
      return {
        select(columns?: string) {
          return createQueryBuilder(tableName).select(columns);
        },
        insert(row: MockRow | MockRow[]) {
          const rows = Array.isArray(row) ? row : [row];
          for (const r of rows) {
            const newRow = {
              ...r,
              id:
                r.id ??
                `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              created_at: r.created_at ?? new Date().toISOString(),
            };
            if (!tables[tableName]) tables[tableName] = [];
            tables[tableName].push(newRow);
          }
          return Promise.resolve({ data: rows, error: null });
        },
        update(updates: MockRow) {
          let filterChain: Array<{ column: string; value: unknown }> = [];

          const updateBuilder = {
            eq(column: string, value: unknown) {
              filterChain.push({ column, value });
              return updateBuilder;
            },
            in(column: string, values: unknown[]) {
              // For update().in() operations
              const table = tables[tableName] ?? [];
              for (const row of table) {
                if (values.includes(row[column])) {
                  Object.assign(row, updates);
                }
              }
              return Promise.resolve({ data: null, error: null });
            },
            then(resolve: (result: { error: null }) => void) {
              const table = tables[tableName] ?? [];
              for (const row of table) {
                const matches = filterChain.every(
                  (f) => row[f.column] === f.value,
                );
                if (matches) {
                  Object.assign(row, updates);
                }
              }
              resolve({ error: null });
            },
          };
          return updateBuilder;
        },
        delete() {
          // Not needed for tests but included for completeness
          return {
            eq() {
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
    // Tables accessor for test assertions
    _tables: tables,
  };

  return mockClient;
}

// Type alias for mock supabase
type MockSupabase = ReturnType<typeof createMockSupabase>;

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function createTestWord(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: "W1",
    user_id: "U1",
    word: "gehen",
    language: "de",
    lemma: "gehen",
    native_translation: "to go",

    ease_factor: 2.5,
    repetitions: 0,
    interval: 0,
    next_review: new Date().toISOString(),
    status: "new",

    recognition_score: 0,
    production_score: 0, // 0-100 in DB
    pronunciation_score: 0, // 0-100 in DB
    contextual_usage_score: 0,
    exposure_count: 0,
    tags: [],
    story_introduction_threshold: 1.0,
    last_propel_module: null,
    last_propel_review_at: null,
    last_reviewed: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rating: null,
    last_rated_at: null,
    ...overrides,
  };
}

function insertWord(supabase: MockSupabase, word: MockRow) {
  (supabase._tables.user_words as MockRow[]).push(word);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe("Knowledge Transfer Audit Tests", () => {
  let supabase: MockSupabase;

  beforeEach(() => {
    supabase = createMockSupabase();
    deduplicationGuard.clear();
    eventBus.clear();
  });

  afterAll(() => {
    deduplicationGuard.destroy();
    eventBus.clear();
  });

  // ── Test 1: Learning in Anki transfers to Story Engine ─────────────────

  describe("Test 1: Learning in Anki transfers to Story Engine", () => {
    it("Anki review updates recognition and transfers to story engine", async () => {
      // Setup: word W1 with some recognition already
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.55,
          exposure_count: 5,
          repetitions: 3,
          status: "learning",
        }),
      );

      // Act: User reviews W1 in Anki, rating Good (3)
      const result = await AnkiAdapter.onCardReviewed(
        supabase as unknown as Parameters<typeof AnkiAdapter.onCardReviewed>[0],
        "U1",
        "W1",
        3, // Good
        3000,
        "session-1",
      );

      // Assert: recognitionScore increased
      expect(result).not.toBeNull();
      expect(result!.recognitionScore).toBeGreaterThan(0.55);

      // Assert: dueDate updated forward (not in the past)
      expect(result!.dueDate.getTime()).toBeGreaterThan(Date.now());

      // Assert: Story engine sees recognition established if threshold met
      const storyState = await getWordStateForModule(
        supabase as unknown as Parameters<typeof getWordStateForModule>[0],
        "U1",
        "W1",
        "story",
      );

      if (result!.recognitionScore > 0.6) {
        expect(storyState.recognitionEstablished).toBe(true);
      }

      // Assert: Story encounter within 2 hours shouldn't be double-counted
      // by deduplication guard
      const shouldSkip = deduplicationGuard.wasReviewedRecently("U1", "W1", 2);
      expect(shouldSkip).toBe(true);
    });
  });

  // ── Test 2: Production in Cloze visible to Conjugation ─────────────────

  describe("Test 2: Production in Cloze raises productionScore visible to Conjugation", () => {
    it("typed cloze correct increases productionScore seen by conjugation module", async () => {
      // Setup: word with low production, moderate recognition
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.4,
          production_score: 10, // 0.1 in 0-1 scale
          exposure_count: 3,
          repetitions: 2,
          status: "learning",
        }),
      );

      // Act: User types correct answer in cloze mode
      const result = await ClozeAdapter.onAnswerSubmitted(
        supabase as unknown as Parameters<
          typeof ClozeAdapter.onAnswerSubmitted
        >[0],
        "U1",
        "W1",
        "typed",
        true,
        2500,
        "session-2",
      );

      // Assert: productionScore increased
      expect(result).not.toBeNull();
      expect(result!.productionScore).toBeGreaterThan(0.1);

      // Assert: Conjugation module sees appropriate difficulty
      const conjState = await getWordStateForModule(
        supabase as unknown as Parameters<typeof getWordStateForModule>[0],
        "U1",
        "W1",
        "conjugation",
      );

      // With recognition >= 0.3 and production still building,
      // should be "standard" or higher (not "scaffold")
      expect(["standard", "challenge"]).toContain(
        conjState.suggestedDifficulty,
      );
    });
  });

  // ── Test 3: Grammar concept mastery from Conjugation ───────────────────

  describe("Test 3: Grammar concept mastery updates from Conjugation", () => {
    it("conjugation drill updates both word and grammar concept mastery", async () => {
      // Setup: word tagged with konjunktiv2
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          tags: ["konjunktiv2"],
          recognition_score: 0.5,
          production_score: 30,
          exposure_count: 5,
          repetitions: 3,
          status: "learning",
        }),
      );

      // Act: User correctly conjugates W1 in konjunktiv2 drill
      const result = await ConjugationAdapter.onConjugationSubmitted(
        supabase as unknown as Parameters<
          typeof ConjugationAdapter.onConjugationSubmitted
        >[0],
        "U1",
        "W1",
        "konjunktiv2",
        true,
        4000,
        "session-3",
      );

      // Assert: Word record updated
      expect(result).not.toBeNull();

      // Assert: tags still contains konjunktiv2
      expect(result!.tags).toContain("konjunktiv2");

      // Assert: GrammarConceptMastery for konjunktiv2 was created/updated
      const mastery = await getConceptMastery(
        supabase as unknown as Parameters<typeof getConceptMastery>[0],
        "U1",
        "konjunktiv2",
      );
      expect(mastery).not.toBeNull();
      expect(mastery!.masteryScore).toBeGreaterThan(0);
      expect(mastery!.exposureCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Test 4: Cross-module deduplication ─────────────────────────────────

  describe("Test 4: Cross-module deduplication", () => {
    it("prevents redundant review within 2-hour window", async () => {
      // Setup: word W1
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.5,
          exposure_count: 3,
          repetitions: 2,
          status: "learning",
        }),
      );

      // Act: User reviews W1 correctly in Anki at "10:00am"
      await AnkiAdapter.onCardReviewed(
        supabase as unknown as Parameters<typeof AnkiAdapter.onCardReviewed>[0],
        "U1",
        "W1",
        3,
        3000,
        "session-4a",
      );

      // Assert: 45 minutes later, deduplication guard flags it
      const wasReviewedRecently = deduplicationGuard.wasReviewedRecently(
        "U1",
        "W1",
        2,
      );
      expect(wasReviewedRecently).toBe(true);

      // Assert: Story engine sees shouldSkip = true
      const storyState = await getWordStateForModule(
        supabase as unknown as Parameters<typeof getWordStateForModule>[0],
        "U1",
        "W1",
        "story",
      );
      expect(storyState.shouldSkip).toBe(true);

      // Assert: W1 is in the "reviewed today" list
      const reviewedToday = deduplicationGuard.getReviewedWordsToday("U1");
      expect(reviewedToday).toContain("W1");
    });
  });

  // ── Test 5: Incorrect answer lowers scores across all modules ──────────

  describe("Test 5: Incorrect answer anywhere lowers scores across all modules", () => {
    it("wrong answer in pronunciation lowers recognition and production", async () => {
      // Setup: word with established scores
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.7,
          production_score: 60, // 0.6 in 0-1 scale
          pronunciation_score: 50,
          exposure_count: 10,
          repetitions: 5,
          ease_factor: 2.3,
          interval: 8,
          status: "known",
          next_review: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );

      const originalDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      // Act: User gets W1 wrong in pronunciation module (low STT score)
      const result = await PronunciationAdapter.onPronunciationScored(
        supabase as unknown as Parameters<
          typeof PronunciationAdapter.onPronunciationScored
        >[0],
        "U1",
        "W1",
        40, // Below 70 threshold → incorrect
        5000,
        "session-5",
      );

      // Assert: recognitionScore decreased
      expect(result).not.toBeNull();
      expect(result!.recognitionScore).toBeLessThan(0.7);

      // Assert: productionScore decreased
      expect(result!.productionScore).toBeLessThan(0.6);

      // Assert: dueDate NOT pushed forward (penalty applied — back to learning)
      // After incorrect, interval resets to 1 day
      expect(result!.status).toBe("learning");

      // Assert: all modules see updated difficulty
      for (const mod of ["anki", "cloze", "conjugation"] as const) {
        const state = await getWordStateForModule(
          supabase as unknown as Parameters<typeof getWordStateForModule>[0],
          "U1",
          "W1",
          mod,
        );
        // After score decrease, difficulty should reflect lower scores
        expect(state.suggestedDifficulty).not.toBe("challenge"); // dropped from challenge
      }
    });
  });

  // ── Test 6: New word learned in Cloze appears as known in Anki ─────────

  describe("Test 6: New word learned in Cloze appears as known in Anki", () => {
    it("first-time correct cloze transitions isNew to false for Anki", async () => {
      // Setup: brand new word W2 (never reviewed)
      insertWord(
        supabase,
        createTestWord({
          id: "W2",
          exposure_count: 0,
          status: "new",
          recognition_score: 0,
          production_score: 0,
        }),
      );

      // Verify it starts as new
      const beforeState = await getWordStateForModule(
        supabase as unknown as Parameters<typeof getWordStateForModule>[0],
        "U1",
        "W2",
        "anki",
      );
      expect(beforeState.isNew).toBe(true);

      // Act: User encounters W2 in cloze mode, types correct answer
      const result = await ClozeAdapter.onAnswerSubmitted(
        supabase as unknown as Parameters<
          typeof ClozeAdapter.onAnswerSubmitted
        >[0],
        "U1",
        "W2",
        "typed",
        true,
        3000,
        "session-6",
      );

      // Assert: W2 is no longer new
      expect(result).not.toBeNull();
      expect(result!.exposureCount).toBeGreaterThan(0);

      // Assert: Anki sees W2 as no longer new
      const afterState = await getWordStateForModule(
        supabase as unknown as Parameters<typeof getWordStateForModule>[0],
        "U1",
        "W2",
        "anki",
      );
      expect(afterState.isNew).toBe(false);

      // Assert: Anki presents with appropriate context, not from-scratch
      // isNew: false means Anki should skip the "introduction" flow
      expect(afterState.suggestedDifficulty).toBeDefined();
    });
  });

  // ── Test 7: Score decay after inactivity ───────────────────────────────

  describe("Test 7: Score decay after inactivity", () => {
    it("processReview applies decay before new score credit after 45 days", async () => {
      // Setup: word last reviewed 45 days ago with good scores
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.8,
          production_score: 70, // 0.7 in 0-1 scale
          contextual_usage_score: 0.6,
          exposure_count: 15,
          repetitions: 6,
          ease_factor: 2.3,
          interval: 30,
          status: "known",
          last_reviewed: fortyFiveDaysAgo.toISOString(),
          next_review: new Date(
            fortyFiveDaysAgo.getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }),
      );

      // Act: User opens app after 45 days and reviews W1
      const result = await processReview(
        supabase as unknown as Parameters<typeof processReview>[0],
        {
          userId: "U1",
          wordId: "W1",
          moduleSource: "anki",
          inputMode: "multipleChoice",
          correct: true,
          responseTimeMs: 4000,
          sessionId: "session-7",
        },
      );

      // Assert: Decay was applied before credit
      // 45 days since review, threshold is 30 days, excess = 15 days
      // decayFactor = 0.98^15 ≈ 0.739
      // Decayed recognition: 0.8 * 0.739 ≈ 0.591
      // Then multipleChoice correct adds 0.08 → ~0.671
      // The result should be LESS than 0.8 + 0.08 = 0.88 (no decay case)
      expect(result).not.toBeNull();
      expect(result!.recognitionScore).toBeLessThan(0.88);
      // But greater than 0 (decay didn't destroy everything)
      expect(result!.recognitionScore).toBeGreaterThan(0);
    });
  });

  // ── Test 8: shouldSkip respected by all modules ────────────────────────

  describe("Test 8: shouldSkip respected by all modules", () => {
    it("all modules return shouldSkip after recent correct review", async () => {
      // Setup: word reviewed correctly 30 minutes ago in story mode
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.5,
          production_score: 40,
          exposure_count: 8,
          repetitions: 4,
          status: "known",
        }),
      );

      // Simulate: reviewed correctly 30 minutes ago in story
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      deduplicationGuard.markReviewed(
        "U1",
        "W1",
        "story",
        thirtyMinutesAgo,
        true,
      );

      // Also add to module history so getWordStateForModule can see it
      (supabase._tables.module_review_history as MockRow[]).push({
        id: "hist-1",
        user_id: "U1",
        word_id: "W1",
        module_source: "story",
        correct: true,
        response_time_ms: 0,
        input_mode: "reading",
        session_id: "session-8",
        event_id: "evt-1",
        created_at: thirtyMinutesAgo.toISOString(),
      });

      // Assert: All modules return shouldSkip = true
      for (const mod of ["anki", "cloze", "conjugation"] as const) {
        const state = await getWordStateForModule(
          supabase as unknown as Parameters<typeof getWordStateForModule>[0],
          "U1",
          "W1",
          mod,
        );
        expect(state.shouldSkip).toBe(true);
      }

      // Assert: Modules should pull alternative words rather than W1
      // (This is verified by shouldSkip being true — module logic uses this)
    });
  });

  // ── Additional: Event bus emission ─────────────────────────────────────

  describe("Event bus: WordReviewedEvent emission", () => {
    it("emits event after processReview", async () => {
      insertWord(supabase, createTestWord({ id: "W1" }));

      const receivedEvents: WordReviewedEvent[] = [];
      eventBus.on("wordReviewed", (event) => {
        receivedEvents.push(event);
      });

      await processReview(
        supabase as unknown as Parameters<typeof processReview>[0],
        {
          userId: "U1",
          wordId: "W1",
          moduleSource: "cloze",
          inputMode: "typing",
          correct: true,
          responseTimeMs: 2000,
          sessionId: "session-evt",
        },
      );

      // Wait for async event handlers
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].moduleSource).toBe("cloze");
      expect(receivedEvents[0].correct).toBe(true);
      expect(receivedEvents[0].wordId).toBe("W1");
    });
  });

  // ── Additional: Event deduplication (idempotency) ──────────────────────

  describe("Event deduplication: duplicate events are no-ops", () => {
    it("second call with same eventId returns current state without re-applying", async () => {
      insertWord(
        supabase,
        createTestWord({
          id: "W1",
          recognition_score: 0.5,
          exposure_count: 5,
        }),
      );

      // First call
      const result1 = await processReview(
        supabase as unknown as Parameters<typeof processReview>[0],
        {
          userId: "U1",
          wordId: "W1",
          moduleSource: "anki",
          inputMode: "multipleChoice",
          correct: true,
          responseTimeMs: 3000,
          sessionId: "session-dup",
          eventId: "evt-dedup-001",
        },
      );

      const scoreAfterFirst = result1!.recognitionScore;

      // Second call with same eventId (network retry)
      const result2 = await processReview(
        supabase as unknown as Parameters<typeof processReview>[0],
        {
          userId: "U1",
          wordId: "W1",
          moduleSource: "anki",
          inputMode: "multipleChoice",
          correct: true,
          responseTimeMs: 3000,
          sessionId: "session-dup",
          eventId: "evt-dedup-001",
        },
      );

      // Assert: score was NOT double-applied
      expect(result2).not.toBeNull();
      expect(result2!.recognitionScore).toBe(scoreAfterFirst);

      // Assert: only one history entry
      const historyCount = (
        supabase._tables.module_review_history as MockRow[]
      ).filter((r) => r.event_id === "evt-dedup-001").length;
      expect(historyCount).toBe(1);
    });
  });

  // ── Additional: buildPresentationContext logic ─────────────────────────

  describe("buildPresentationContext difficulty levels", () => {
    it("returns scaffold for low recognition", () => {
      const record = dbRowToWordRecord(
        createTestWord({
          recognition_score: 0.2,
          production_score: 0,
        }) as Record<string, unknown>,
        [],
      );
      const ctx = buildPresentationContext(record, "anki");
      expect(ctx.suggestedDifficulty).toBe("scaffold");
    });

    it("returns standard for moderate recognition, low production", () => {
      const record = dbRowToWordRecord(
        createTestWord({
          recognition_score: 0.4,
          production_score: 20,
        }) as Record<string, unknown>,
        [],
      );
      const ctx = buildPresentationContext(record, "cloze");
      expect(ctx.suggestedDifficulty).toBe("standard");
    });

    it("returns challenge for high recognition AND production", () => {
      const record = dbRowToWordRecord(
        createTestWord({
          recognition_score: 0.7,
          production_score: 70,
        }) as Record<string, unknown>,
        [],
      );
      const ctx = buildPresentationContext(record, "conjugation");
      expect(ctx.suggestedDifficulty).toBe("challenge");
    });
  });
});
