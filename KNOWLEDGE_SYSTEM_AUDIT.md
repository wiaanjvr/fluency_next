# Fluensea — Unified Knowledge/Progress System Audit

**Date:** 2026-02-23  
**Scope:** All 7 Propel activities and their integration with the shared knowledge system  
**Methodology:** Static code analysis — no runtime testing performed

---

## Section 1: System Overview

### Architecture Summary

The Fluensea app has evolved **three parallel vocabulary/progress systems** over time, plus a **unified knowledge graph** layer that was designed to bridge them but is only partially wired up.

| System                   | DB Table(s)                       | Status Enum                         | SRS Algorithm                       | Primary Consumers                 |
| ------------------------ | --------------------------------- | ----------------------------------- | ----------------------------------- | --------------------------------- |
| **System 1** (Legacy)    | `vocab`, `user_vocab`             | `unseen → learning → known`         | SM-2 v1 (0–2 scale)                 | Foundation review (`/api/review`) |
| **System 2** (Core)      | `user_words`, `word_interactions` | `new → learning → known → mastered` | SM-2 v2 (0–5 scale)                 | Knowledge graph, Propel modules   |
| **System 3** (Lesson V2) | `learner_words_v2`                | `introduced → learning → mastered`  | Streak-based (3 correct = mastered) | Dashboard, Lesson V2, word intro  |

A **sync bridge** (`src/lib/knowledge-graph/sync-learner-words.ts`) mirrors System 2 → System 3 after each `recordReview()` call, with a status mapping that collapses `known`/`mastered` into `mastered`.

The **knowledge graph** layer (`src/lib/knowledge-graph/`) was designed as the single entry point for all review writes. Its `recordReview()` function: fetches the word from `user_words` → runs SM-2 v2 → computes production/pronunciation scores → writes back → syncs to `learner_words_v2` → logs to `module_review_history` and `word_interactions`.

**However, only 2 out of 7 activities actually use this pipeline.**

### Key Files and Their Roles

#### Type Definitions

| File                           | Purpose                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `src/types/index.ts`           | Root type barrel — `UserWord`, `WordStatus`, `WordRating`, `WordInteraction`            |
| `src/types/knowledge-graph.ts` | `UnifiedWord` (extends `UserWord`), `ModuleSource`, `ReviewEvent`, `PRODUCTION_WEIGHTS` |
| `src/types/progression.ts`     | Milestone/graduation thresholds (100→500→1000 words)                                    |
| `src/types/lesson-v2.ts`       | `LearnerWord`, `WordMasteryStatus`, `MasteryStage`                                      |
| `src/types/flashcards.ts`      | FSRS `CardState`, `Rating` (1–4)                                                        |
| `src/types/cloze.ts`           | Cloze item and session types                                                            |
| `src/types/pronunciation.ts`   | Pronunciation-specific types                                                            |

#### SRS Algorithms (Three Implementations)

| File                       | Algorithm            | Rating Scale               | Used By                            |
| -------------------------- | -------------------- | -------------------------- | ---------------------------------- |
| `src/lib/srs.ts`           | SM-2 v1 (simplified) | 0–2 (forgot/hard/easy)     | Legacy `/api/review` route         |
| `src/lib/srs/algorithm.ts` | SM-2 v2 (full)       | 0–5 (blackout→perfect)     | Knowledge graph `recordReview()`   |
| `src/lib/fsrs.ts`          | FSRS-4.5             | 1–4 (Again/Hard/Good/Easy) | Flashcards only (`card_schedules`) |

#### Knowledge Graph Library (`src/lib/knowledge-graph/`)

| File                       | Purpose                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `index.ts`                 | Barrel export                                                                             |
| `record-review.ts`         | **Universal review pipeline** — THE function all modules should call                      |
| `module-adapter.ts`        | Converts module-specific results → universal `ReviewEvent`s; per-module adapter factories |
| `sync-learner-words.ts`    | Mirrors `user_words` → `learner_words_v2` (fire-and-forget)                               |
| `propel-recommendation.ts` | Recommends next Propel module based on score gaps                                         |
| `story-word-selector.ts`   | KG-aware word selection for stories (95% known / 5% new)                                  |
| `grammar-unlock.ts`        | Lowers `story_introduction_threshold` when grammar lessons complete                       |
| `analytics.ts`             | KG stats: total words, due for review, average scores, weak tags                          |

#### State Management

| File                                | Purpose                                      | Persistence                                      |
| ----------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| `src/lib/store/knowledgeStore.ts`   | Zustand — in-memory production score tracker | **None** (lost on refresh)                       |
| `src/lib/store/conjugationStore.ts` | Zustand — conjugation drill session state    | Flushes to `conjugation_progress` on session end |

#### Hooks

| File                              | Purpose                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| `src/hooks/useKnowledgeGraph.ts`  | Client-side KG access — `submitSessionResults()`, `getRecommendation()`, `getStats()` |
| `src/hooks/useExerciseSession.ts` | Zustand store for grammar exercise sessions                                           |
| `src/hooks/useGrammarProgress.ts` | Grammar progress summary                                                              |
| `src/hooks/useSessionTracker.ts`  | Session lifecycle tracking (streak, fatigue, events)                                  |

#### API Routes

| Route                                   | Tables Touched                                                   | KG Integration              |
| --------------------------------------- | ---------------------------------------------------------------- | --------------------------- |
| `POST /api/words/rate`                  | `user_words`, `word_interactions`                                | Uses SM-2 v2 directly       |
| `GET /api/words`                        | `user_words`                                                     | Read only                   |
| `GET /api/words/stats`                  | `user_words`                                                     | Read only                   |
| `POST /api/reading/mark-known`          | `user_words`, `learner_words_v2`                                 | **Bypasses** `recordReview` |
| `POST /api/reading/interact`            | `user_words`, `learner_words_v2`                                 | **Bypasses** `recordReview` |
| `POST /api/reading/add-flashcard`       | `flashcards`, `card_schedules`, `user_words`, `learner_words_v2` | Direct upsert               |
| `POST /api/conjugation/sessions`        | `conjugation_progress`, `conjugation_sessions`                   | **Separate silo**           |
| `POST /api/pronunciation/progress`      | `user_pronunciation_sessions`                                    | **Separate silo**           |
| `POST /api/pronunciation/minimal-pairs` | `user_pronunciation_progress`                                    | **Separate silo**           |
| `POST /api/review` (legacy)             | `user_vocab`                                                     | **System 1 only**           |

#### Database Tables (via Supabase migrations)

| Table                         | System            | Key Columns                                                                                                                                     |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_words`                  | System 2 (Core)   | `word, lemma, language, ease_factor, repetitions, interval_days, next_review, status, production_score, pronunciation_score, recognition_score` |
| `word_interactions`           | System 2          | `word_id, story_id, rating, response_time_ms`                                                                                                   |
| `module_review_history`       | KG                | `word_id, module_source, correct, rating, input_mode, session_id`                                                                               |
| `learner_words_v2`            | System 3          | `word, lemma, translation, status, correct_streak, total_reviews, total_correct`                                                                |
| `user_vocab`                  | System 1 (Legacy) | `vocab_id, status, ease_factor, interval_days, next_review_at, repetitions`                                                                     |
| `card_schedules`              | Flashcards        | `flashcard_id, stability, difficulty, state, due, reps, lapses`                                                                                 |
| `review_log`                  | Flashcards        | `card_schedule_id, rating, state, elapsed_days`                                                                                                 |
| `conjugation_progress`        | Conjugation       | `verb, tense, pronoun, production_score, attempts, correct_count`                                                                               |
| `user_pronunciation_progress` | Pronunciation     | `phoneme_id, familiarity_score, attempts, correct_count`                                                                                        |
| `user_pronunciation_sessions` | Pronunciation     | `module, total_attempts, correct_count, duration_seconds`                                                                                       |
| `grammar_concept_mastery`     | Grammar           | `concept_tag, mastery_score, review_count`                                                                                                      |
| `user_lesson_completions`     | Grammar           | `lesson_id, completed_at, score`                                                                                                                |
| `user_exercise_attempts`      | Grammar           | `exercise_id, is_correct, user_answer`                                                                                                          |

---

## Section 2: Activity Matrix

| Activity          | Reads shared data? | Writes shared data? | Uses SRS? | Persisted?  | Notes                                                                                                                                                            |
| ----------------- | ------------------ | ------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free Reading**  | ⚠️ Partial         | ⚠️ Partial          | ❌        | ✅ Supabase | Reads `user_words` for story generation (known-word set), but bypasses `recordReview` — writes directly to `user_words` with hardcoded SM-2 values               |
| **Cloze**         | ❌                 | ✅                  | ❌        | ✅ Supabase | Writes via `recordReview()` ✅, but reads items from `cloze_items` table with no SRS/vocabulary awareness                                                        |
| **Flashcards**    | ❌                 | ⚠️ Partial          | ✅ FSRS   | ✅ Supabase | Has own FSRS scheduling ✅, syncs to KG at session end only — mid-session close loses KG writes; index mapping bug                                               |
| **Conjugation**   | ❌                 | ❌                  | ❌        | ⚠️ Own silo | 🔴 Completely isolated — uses own `conjugation_progress` table; never calls `recordReview`; `knowledgeStore` is in-memory dead end                               |
| **Pronunciation** | ❌                 | ❌                  | ❌        | ⚠️ Own silo | 🔴 Completely isolated — uses own `user_pronunciation_progress` table; adapters exist but are never called (dead code)                                           |
| **Grammar**       | ❌                 | ❌                  | ❌        | ⚠️ Own silo | 🔴 `recordReview` and `onGrammarLessonComplete` exist in `grammarApi.ts` but are **never triggered** — required params (`wordId`, `grammarTag`) are never passed |
| **Conversation**  | ❌                 | ❌                  | ❌        | ❌          | 🔴 Completely ephemeral — no persistence at all, no DB writes, no KG integration, sessions lost on navigation                                                    |

### Summary Counts

- **Activities that READ from shared knowledge:** 1 of 7 (partial)
- **Activities that WRITE to shared knowledge:** 2 of 7 (1 partial)
- **Activities fully integrated (read + write):** 0 of 7
- **Activities completely isolated:** 4 of 7 (Conjugation, Pronunciation, Grammar, Conversation)

---

## Section 3: Bugs & Gaps Found

### Critical (🔴)

**1. Conjugation drills are completely isolated from the knowledge graph**

- **Location:** `src/lib/store/conjugationStore.ts` (entire file), `src/app/api/conjugation/sessions/route.ts`
- **Description:** Conjugation writes only to its own `conjugation_progress` table and updates `knowledgeStore` (Zustand, in-memory). It never calls `recordReview()` or `recordReviewBatch()`. The `knowledgeStore` has no persistence layer — scores are lost on page refresh. A user could master verb conjugations and the knowledge graph would have zero record of it.
- **Severity:** Critical
- **Fix:** After `finishSession()`, call `recordReviewBatch()` for each verb form drilled, mapping conjugation results to `user_words` entries. Use `createConjugationAdapter()` from `module-adapter.ts` (already exists, unused).

**2. Pronunciation training is completely isolated from the knowledge graph**

- **Location:** `src/app/propel/pronunciation/page.tsx`, all `src/components/pronunciation/*.tsx`, `src/app/api/pronunciation/*/route.ts`
- **Description:** Pronunciation writes to `user_pronunciation_progress` and `user_pronunciation_sessions` but never updates `user_words.pronunciation_score`. Adapters (`createPronunciationAdapter`) exist in `module-adapter.ts` but are dead code. The recommendation engine permanently recommends pronunciation because it reads `pronunciation_score` from `user_words` which is always 0.
- **Severity:** Critical
- **Fix:** Wire `MinimalPairsGame` and `ShadowingStudio` results through `createPronunciationAdapter()` → `recordReviewBatch()` to update `user_words.pronunciation_score`.

**3. Grammar exercises never trigger `recordReview` despite plumbing being in place**

- **Location:** `src/hooks/useExerciseSession.ts` lines 69 and 85
- **Description:** `recordExerciseAttempt(exercise.id, wasCorrect, answer)` never passes the optional `wordId` parameter. `markLessonComplete(lessonId)` never passes the optional `grammarTag` parameter. Both guard clauses (`if (wordId)` and `if (grammarTag)`) in `grammarApi.ts` are therefore never satisfied, meaning `recordReview` and `onGrammarLessonComplete` are dead code paths.
- **Severity:** Critical
- **Fix:** Add `word_id` column to `grammar_exercises` table; add `grammar_tag` column to `grammar_lessons` table. Pass these through `useExerciseSession.ts` to their respective API functions.

**4. Grammar-gated words are never unlocked for story introduction**

- **Location:** `src/lib/knowledge-graph/grammar-unlock.ts` (entire file is dead code from grammar UI perspective)
- **Description:** Direct consequence of bug #3. `onGrammarLessonComplete()` never fires, so `story_introduction_threshold` is never lowered for grammar-tagged words. Words gated behind grammar lessons remain permanently inaccessible in stories.
- **Severity:** Critical
- **Fix:** Linked to bug #3 — once `grammarTag` is passed, this resolves automatically.

**5. Live Conversation is completely ephemeral — zero persistence**

- **Location:** `src/app/propel/conversation/page.tsx`, `src/components/conversation/*.tsx`, `src/hooks/useGeminiLive.ts`
- **Description:** No data from conversation sessions is written to any database table, API route, or knowledge graph. Transcripts, corrections, vocabulary used, and session metadata are held in React state and discarded on navigation. The system has no record that a conversation ever occurred.
- **Severity:** Critical
- **Fix:** Post-session, extract vocabulary from transcript, match against `user_words`, call `recordReviewBatch()` with `moduleSource: "conversation"`. Persist session metadata to a `conversation_sessions` table.

### Major

**6. Free Reading bypasses the `recordReview` pipeline**

- **Location:** `src/app/api/reading/mark-known/route.ts` lines 37–62, `src/app/api/reading/interact/route.ts` lines 63–86
- **Description:** When a user marks a word as known, the API upserts directly into `user_words` with hardcoded SM-2 values (`ease_factor: 2.5`, `interval: 30`, `repetitions: 3`) instead of calling `recordReview()`. This skips: SM-2 calculation, review history logging, ML event emission, and proper production score computation. Creates phantom "reviewed" words with fake SRS state.
- **Severity:** Major
- **Fix:** Replace direct upserts with `recordReview(supabase, userId, { wordId, moduleSource: "free_reading", correct: true, rating: 4 })`.

**7. Free Reading has duplicate writes on mark-known**

- **Location:** `src/components/reading/WordDrawer.tsx` lines 112 and 143
- **Description:** Marking a word as known fires two independent API calls (`/api/reading/mark-known` AND `/api/reading/interact` with `action: "marked_known"`), both of which independently upsert the same data into `user_words` and `learner_words_v2`. Redundant double-write.
- **Severity:** Major
- **Fix:** Remove the duplicate write from the interact route, or consolidate both actions into a single API call.

**8. Flashcards KG sync only fires at session end — mid-session close loses all KG writes**

- **Location:** `src/app/propel/flashcards/[deckId]/study/page.tsx` lines 1073–1145
- **Description:** FSRS scheduling (`card_schedules`) is written immediately per-card, but the knowledge graph sync (`user_words` via `createFlashcardAdapter`) only fires when `state.sessionComplete` becomes true. If the user closes the browser mid-session, `card_schedules` has updated FSRS data but `user_words` has stale SM-2 data. The two systems drift.
- **Severity:** Major
- **Fix:** Either sync to KG per-card (alongside FSRS write) or use `beforeunload`/`visibilitychange` to flush pending KG results.

**9. Flashcards learning queue re-enqueue causes wrong card↔result mapping**

- **Location:** `src/app/propel/flashcards/[deckId]/study/page.tsx` lines 1099–1101
- **Description:** `sessionResultsRef` accumulates across queue resets, but result→card mapping uses `idx % state.cards.length` where `state.cards` at session end may only contain the final learning queue's cards. This maps wrong cards to wrong results, causing incorrect `user_words` updates.
- **Severity:** Major
- **Fix:** Store the `cardId` alongside each session result in `sessionResultsRef` rather than relying on index position.

**10. Cloze does not read from the knowledge graph for item selection**

- **Location:** `src/app/propel/cloze/page.tsx` lines 65–109
- **Description:** Cloze items are selected from `cloze_items` ordered by `used_count ASC`, with no awareness of the user's vocabulary. Words the user is weak on are not prioritized; already-mastered words can reappear. The CEFR level filter is manually selected, not derived from the user's profile.
- **Severity:** Major
- **Fix:** Query `user_words` to build a set of weak/due words, then filter `cloze_items` to prioritize items whose target word is in the weak set.

**11. Three separate SRS algorithms with incompatible rating scales**

- **Location:** `src/lib/srs.ts` (0–2), `src/lib/srs/algorithm.ts` (0–5), `src/lib/fsrs.ts` (1–4)
- **Description:** The codebase has three different spaced repetition implementations with different rating scales, promotion thresholds, and interval calculations. The FSRS→SM-2 mapping in `module-adapter.ts` is reasonable but the SM-2 v1 system (`user_vocab`) is completely disconnected.
- **Severity:** Major
- **Fix:** Deprecate SM-2 v1 (`srs.ts` + `user_vocab`). Standardize on SM-2 v2 for knowledge graph + FSRS for flashcards, with the existing adapter bridge.

### Minor

**12. `knowledgeStore.ts` (Zustand) is a dead-end store with no persistence**

- **Location:** `src/lib/store/knowledgeStore.ts`
- **Description:** Tracks production scores in-memory, imported only by `conjugationStore`. No persistence, no subscribers, resets on page refresh. Effectively dead code.
- **Severity:** Minor
- **Fix:** Either give it persistence (sync to `user_words`) or remove it and have conjugation write through `recordReview` directly.

**13. Cloze word creation uses surface form as lemma**

- **Location:** `src/app/propel/cloze/page.tsx` lines 247–256
- **Description:** When creating a new `user_words` entry, sets `lemma = word = answerWord` using the raw surface form (e.g., "mangé") instead of the proper lemma ("manger"). This creates duplicate entries when the same lemma appears in different inflections.
- **Severity:** Minor
- **Fix:** Use the lemmatization utility from `src/lib/srs/word-utils.ts` to derive the lemma before inserting.

**14. Cloze seen-IDs are device-local (localStorage only)**

- **Location:** `src/app/propel/cloze/page.tsx` lines 35–50
- **Description:** IDs of seen cloze items are tracked in `localStorage` under `fluensea_cloze_seen_ids`, capped at 500. Not synced to Supabase, lost on cache clear or device switch, despite `user_cloze_progress` already tracking the same data server-side.
- **Severity:** Minor
- **Fix:** Query `user_cloze_progress` for previously-answered item IDs instead of relying on localStorage.

**15. Free Reading `flushSessionVocab` is best-effort on unmount**

- **Location:** `src/app/propel/free-reading/page.tsx` lines 107–132
- **Description:** Batch upsert of looked-up words fires on component unmount. On mobile or fast navigation, the cleanup may not complete, losing word encounter data.
- **Severity:** Minor
- **Fix:** Also flush on `visibilitychange` event, or persist encountered words incrementally.

**16. Free Reading silently swallows all API errors**

- **Location:** `src/components/reading/WordDrawer.tsx` — all `.catch(() => {})` calls
- **Description:** Every API call in WordDrawer uses `.catch(() => {})`, making failures completely invisible. If `mark-known` fails, the UI shows the word as known but the write is lost.
- **Severity:** Minor
- **Fix:** Add error handling — at minimum a toast notification or retry logic.

**17. No `responseTimeMs` or `sessionId` passed from Cloze to `recordReview`**

- **Location:** `src/app/propel/cloze/page.tsx` lines 260–264
- **Description:** The review event lacks `responseTimeMs` and `sessionId`, so the SM-2 rating always defaults to `3` (Good) for correct / `1` (Wrong) for incorrect — no speed-based granularity. ML pipeline gets incomplete data.
- **Severity:** Minor
- **Fix:** Track answer start time in the reducer, compute response time, pass it to `recordReview`.

**18. No shared Knowledge Context/Provider wrapping activities**

- **Location:** `src/app/layout.tsx`
- **Description:** The root layout provides `AuthProvider`, `LocationProvider`, `AmbientPlayerProvider`. There is no `KnowledgeProvider` or `ProgressProvider`. Each activity independently fetches its own data (or doesn't). There is no reactive shared state — if a user completes a flashcard session and immediately opens cloze, cloze has no awareness of the updated knowledge.
- **Severity:** Minor (architectural, not a bug per se)
- **Fix:** Either add a `KnowledgeProvider` that caches `user_words` state client-side, or accept the fetch-on-mount pattern but ensure every activity re-fetches fresh data.

**19. Flashcards: manually-created cards have no `user_words` entry**

- **Location:** `src/app/propel/flashcards/[deckId]/page.tsx` lines 189–194 (card creation)
- **Description:** When a user manually adds a flashcard, no `user_words` row is created. The KG sync at session end queries `user_words` to find matches — if none exist, the KG write silently does nothing for that card. Only cards from Free Reading's "Add to flashcards" action get `user_words` entries.
- **Severity:** Minor
- **Fix:** On card creation, also upsert a `user_words` entry with `status: "new"`.

**20. Recommendation engine permanently recommends pronunciation**

- **Location:** `src/lib/knowledge-graph/propel-recommendation.ts` ~line 144
- **Description:** The recommendation engine checks `pronunciation_score` on `user_words` to decide whether to recommend pronunciation practice. Since pronunciation never writes to this field (bug #2), it's always 0, causing the engine to permanently recommend pronunciation.
- **Severity:** Minor (consequence of bug #2)
- **Fix:** Resolves automatically when bug #2 is fixed.

---

## Section 4: Recommendations

### Must Fix Before Launch

| Priority | Issue                                                                     | Effort                                                                           |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P0       | **#5 — Conversation: add session persistence and KG writes**              | Medium — need transcript extraction, word matching, new DB table                 |
| P0       | **#1 — Conjugation: wire through `recordReviewBatch`**                    | Small — adapter already exists, just need to call it in `finishSession()`        |
| P0       | **#2 — Pronunciation: wire through `recordReviewBatch`**                  | Small — adapter already exists, need to call it from each sub-module             |
| P0       | **#3 + #4 — Grammar: pass `wordId` and `grammarTag` to enable KG writes** | Medium — requires schema changes to `grammar_exercises`/`grammar_lessons` tables |
| P0       | **#6 — Free Reading: route mark-known through `recordReview`**            | Small — replace 2 direct upserts with `recordReview()` calls                     |
| P0       | **#8 — Flashcards: sync KG per-card, not just at session end**            | Small — move the adapter call inside `handleRate()`                              |
| P0       | **#9 — Flashcards: store cardId in session results**                      | Small — data structure change in `sessionResultsRef`                             |

### Should Fix Soon

| Priority | Issue                                                              | Effort                                                                |
| -------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| P1       | **#10 — Cloze: add vocabulary-aware item selection**               | Medium — query `user_words` and cross-reference with `cloze_items`    |
| P1       | **#11 — Deprecate SM-2 v1 and `user_vocab` table**                 | Large — migration needed, but reduces system complexity significantly |
| P1       | **#7 — Free Reading: eliminate duplicate writes**                  | Small — remove the duplicate path                                     |
| P1       | **#12 — Remove or persist `knowledgeStore.ts`**                    | Small — either add Supabase sync or delete the file                   |
| P1       | **#18 — Consider a `KnowledgeProvider` context**                   | Medium — would improve cross-activity reactivity                      |
| P1       | **#19 — Create `user_words` entries on manual flashcard creation** | Small — upsert on card create                                         |

### Nice to Have

| Priority | Issue                                                                    | Effort                |
| -------- | ------------------------------------------------------------------------ | --------------------- |
| P2       | **#13 — Cloze: use lemmatization for word creation**                     | Small                 |
| P2       | **#14 — Cloze: replace localStorage seen-IDs with server query**         | Small                 |
| P2       | **#15 — Free Reading: flush on `visibilitychange`**                      | Small                 |
| P2       | **#16 — Free Reading: add error handling to API calls**                  | Small                 |
| P2       | **#17 — Cloze: pass `responseTimeMs` and `sessionId` to `recordReview`** | Small                 |
| P2       | **#20 — Pronunciation recommendation fix**                               | Auto-resolves with #2 |

---

## Appendix A: Data Flow Consistency Analysis

### Schema Mismatch

| Activity      | Data Shape Written                                                            | Target Table                    | Via `recordReview`?       |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------- | ------------------------- |
| Free Reading  | Hardcoded `{ease_factor: 2.5, interval: 30, repetitions: 3, status: "known"}` | `user_words`                    | ❌ Direct upsert          |
| Cloze         | SM-2 v2 computed fields                                                       | `user_words`                    | ✅                        |
| Flashcards    | FSRS fields → adapter → SM-2 v2 fields                                        | `card_schedules` + `user_words` | ⚠️ Batched at session end |
| Conjugation   | `{production_score: float}`                                                   | `conjugation_progress`          | ❌ Own silo               |
| Pronunciation | `{familiarity_score: float}`                                                  | `user_pronunciation_progress`   | ❌ Own silo               |
| Grammar       | `{is_correct: boolean}`                                                       | `user_exercise_attempts`        | ❌ Dead path              |
| Conversation  | Nothing                                                                       | Nothing                         | ❌                        |

**Verdict:** Only Cloze writes through the canonical pipeline. Every other activity either bypasses it or uses a separate schema.

### Stale Reads

There is no shared reactive context or cache invalidation. Each activity fetches its own data on mount. If a user:

1. Studies flashcards (KG sync happens at session end)
2. Immediately opens cloze

...the cloze activity won't see the updated knowledge because:

- Cloze doesn't read from `user_words` at all (bug #10)
- Even if it did, it would re-fetch on mount, which would catch the flashcard writes — so staleness is mainly an issue of **not reading at all**

### Write Collisions

If a user reviews word "maison" in both Cloze (which calls `recordReview`) and Free Reading (which does a direct upsert), the Free Reading write could overwrite SM-2 state computed by `recordReview` with hardcoded values. There is no merge strategy — last write wins.

### Orphaned Writes

| Location                      | Data Written                              | Reaches Shared Store?                              |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------- |
| `knowledgeStore.ts` (Zustand) | production scores                         | ❌ Lost on refresh                                 |
| Conjugation `finishSession()` | scores → Zustand + `conjugation_progress` | ❌ Never reaches `user_words`                      |
| Pronunciation sub-modules     | scores → `user_pronunciation_progress`    | ❌ Never reaches `user_words`                      |
| Conversation transcripts      | React `useState`                          | ❌ Lost on navigation                              |
| Cloze `sessionHistory`        | Reducer state                             | ❌ UI only, never persisted                        |
| Free Reading `knownWordsRef`  | Optimistic UI set                         | ⚠️ Reaches DB via API, but silent failure possible |

### Missing Word Coverage

| Item Type                | Tracked in `user_words`?                                                      | Has SRS?                      |
| ------------------------ | ----------------------------------------------------------------------------- | ----------------------------- |
| Vocabulary words         | ✅ (via story engine, cloze, free reading)                                    | ✅ SM-2 v2                    |
| Verb conjugations        | ❌ (separate `conjugation_progress` table)                                    | ❌ (weighted random only)     |
| Grammar rules/concepts   | ❌ (`grammar_concept_mastery` exists but is never written to from grammar UI) | ❌                            |
| Pronunciation (phonemes) | ❌ (separate `user_pronunciation_progress` table)                             | ❌ (simple familiarity float) |
| Flashcard scheduling     | ✅ (via `card_schedules` FSRS)                                                | ✅ FSRS                       |
| Conversation vocabulary  | ❌ (not tracked at all)                                                       | ❌                            |

### Context Provider Coverage

The root layout (`src/app/layout.tsx`) wraps all routes with:

- `AuthProvider` ✅
- `LocationProvider` ✅
- `AmbientPlayerProvider` ✅

There is **no** `KnowledgeProvider`, `ProgressProvider`, or `VocabularyProvider`. Activities access knowledge data via:

- Direct Supabase queries (most common)
- The `useKnowledgeGraph` hook (available but rarely used)
- Zustand stores (conjugation only, non-persistent)

The grammar module lives at `/grammar` (not `/propel/grammar`), routed through a catch-all redirect. All other activities are under `/propel/*`. This routing difference doesn't affect KG access but means grammar doesn't benefit from any propel-level layout if one is added later.

---

## Appendix B: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE GRAPH                          │
│  recordReview() → SM-2 v2 → user_words → sync → learner_words  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ record   │ │ module   │ │ sync-learner │ │ propel-       │  │
│  │ review   │ │ adapter  │ │ -words       │ │ recommendation│  │
│  └────▲─────┘ └────▲─────┘ └──────────────┘ └───────────────┘  │
│       │             │                                            │
├───────┼─────────────┼────────────────────────────────────────────┤
│       │             │                                            │
│  ✅ Cloze     ⚠️ Flashcards (session end only)                  │
│       │             │                                            │
│  ❌ Free Reading (bypasses — direct upsert)                     │
│  ❌ Conjugation (own silo — conjugation_progress)               │
│  ❌ Pronunciation (own silo — user_pronunciation_progress)      │
│  ❌ Grammar (dead code path — params never passed)              │
│  ❌ Conversation (completely ephemeral)                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

_End of audit. Generated 2026-02-23 by automated code analysis._
