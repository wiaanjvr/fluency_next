# Placement Test Integration & Vocabulary Seeding

## Overview

This document explains how the placement test determines a user's starting vocabulary and lesson path, ensuring they begin their learning journey at the appropriate difficulty level.

## Flow Diagram

```
┌─────────────────────┐
│ New User Sign-Up    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Placement Test      │
│ - Audio (5 items)   │
│ - Reading (5 items) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Proficiency Level   │
│ Determination       │
│ (A0, A1, A2, etc.)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Vocabulary Seeding  │
│ Based on Level:     │
│ • A0 → 0 words      │
│ • A1 → 100 words    │
│ • A2 → 200 words    │
│ • B1 → 500 words    │
│ • B2+ → 1000 words  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Lesson Path         │
│ Auto-Assignment     │
│ Based on Word Count │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User Begins         │
│ Learning Journey    │
└─────────────────────┘
```

## Proficiency Levels → Word Counts

| Proficiency Level | Words Seeded | Description        | Initial Lesson Path          |
| ----------------- | ------------ | ------------------ | ---------------------------- |
| **A0**            | 0 words      | Complete beginner  | `/learn/foundation`          |
| **A1**            | 100 words    | Elementary         | `/learn/foundation`          |
| **A2**            | 200 words    | Pre-intermediate   | `/learn/foundation`          |
| **B1**            | 500 words    | Intermediate       | `/learn/stories`             |
| **B2**            | 1000 words   | Upper-intermediate | `/lesson` (Acquisition Mode) |
| **C1**            | 1000 words   | Advanced           | `/lesson` (Acquisition Mode) |
| **C2**            | 1000 words   | Proficient         | `/lesson` (Acquisition Mode) |

**Note:** Maximum of 1000 words available in `common-french-words.json`.

## Lesson Path Determination

The system automatically routes users to the appropriate lesson type based on their total word count:

### **0-99 Words: Foundation Phase**

- Path: `/learn/foundation`
- Focus: Learn first 300 high-frequency words
- Method: Image + audio + multiple-choice exercises
- Progress: Word introduction → Recognition → Recall

### **100-299 Words: Foundation + Sentences**

- Path: `/learn/sentences` (unlocked)
- Path: `/learn/foundation` (still recommended)
- Focus: Complete foundation vocabulary
- Method: Simple sentence patterns, word-to-image matching
- Progress: Building core vocabulary base

### **300-499 Words: Micro-Stories Phase**

- Path: `/learn/stories`
- Focus: Short 3-5 sentence stories
- Method: Comprehensible input with 95%+ known words
- Progress: Context-based learning, pattern recognition

### **500+ Words: Acquisition Mode**

- Path: `/lesson`
- Focus: Full comprehensible input stories
- Method: Listen → Speak → Read methodology
- Progress: Natural acquisition through exposure

## Technical Implementation

### 1. Placement Test Scoring

**File:** `src/lib/placement/scoring.ts`

```typescript
export function calculatePlacementResults(
  audioResponses: TestResponse[],
  readingResponses: TestResponse[],
  // ...
): PlacementTestResults {
  // Weighted scoring based on difficulty
  // Returns determined proficiency level
}
```

### 2. Vocabulary Seeding

**File:** `src/lib/srs/seed-vocabulary.ts`

```typescript
export const LEVEL_WORD_ALLOCATION: Record<ProficiencyLevel, number> = {
  A0: 0,
  A1: 100,
  A2: 200,
  B1: 500,
  B2: 1000,
  // ...
};

export async function seedUserVocabulary(
  userId: string,
  level: ProficiencyLevel,
  language: string = "fr",
): Promise<number> {
  // Seeds known words from common-french-words.json
  // Marks them as "known" status with SRS parameters
  // Returns count of seeded words
}
```

### 3. Lesson Path Helper

**File:** `src/lib/srs/seed-vocabulary.ts`

```typescript
export function getLessonPathForWordCount(wordCount: number): string {
  if (wordCount >= 500) return "/lesson";
  if (wordCount >= 300) return "/learn/stories";
  if (wordCount >= 100) return "/learn/sentences";
  return "/learn/foundation";
}
```

### 4. Onboarding Integration

**File:** `src/app/onboarding/page.tsx`

After placement test completion:

1. Save proficiency level to profile
2. Seed vocabulary based on level
3. Redirect to dashboard
4. Dashboard auto-routes to appropriate lesson

### 5. Dashboard Routing

**File:** `src/app/dashboard/page.tsx`

```typescript
const lessonPath = getLessonPathForWordCount(stats.wordsEncountered);
const lessonType = getLessonTypeDescription();

// Dynamically shows:
// - Correct lesson title
// - Appropriate description
// - Right learning path
```

## Progression Gateway Integration

The placement test seeding integrates with the **Progression Gateway System**:

### Milestones

- **100 words**: First Steps milestone unlocked
- **200 words**: Audio speed control unlocked
- **300 words**: Micro-stories unlocked
- **500 words**: Ready for acquisition mode
- **1000 words**: Advanced stories unlocked

### Graduation Requirements (500 words)

Users must maintain:

- ✅ 500 words with 80%+ retention
- ✅ 80%+ story comprehension
- ✅ 80%+ listening comprehension

### Dynamic Difficulty

The system automatically adjusts:

- Sentence complexity
- Max new words per session
- Audio playback speed
- Scaffolding level

Based on current word count (regardless of initial placement).

## Example User Journeys

### Scenario 1: Complete Beginner (A0)

1. Takes placement test → scores A0
2. System seeds **0 words**
3. Starts at `/learn/foundation`
4. Learns 100 words → unlocks sentence patterns
5. Learns 300 words → unlocks micro-stories
6. Learns 500 words → graduates to acquisition mode

### Scenario 2: Elementary Student (A1)

1. Takes placement test → scores A1
2. System seeds **100 known words**
3. Starts at `/learn/foundation` (continues to 300)
4. Can optionally practice `/learn/sentences`
5. Learns to 300 words → unlocks micro-stories
6. Learns to 500 words → graduates to acquisition mode

### Scenario 3: Intermediate Learner (B1)

1. Takes placement test → scores B1
2. System seeds **500 known words**
3. Starts at `/learn/stories` (micro-stories phase)
4. Immediately has access to story themes
5. All features up to 500 words unlocked
6. Can start acquisition mode immediately (graduation requirements met)

### Scenario 4: Advanced Learner (B2+)

1. Takes placement test → scores B2
2. System seeds **1000 known words**
3. Starts at `/lesson` (acquisition mode)
4. Has all features unlocked
5. Focuses on complex narratives
6. Can access advanced stories immediately

## Data Source

**File:** `src/data/common-french-words.json`

Contains 1000 most common French words with:

- Word form
- Lemma (base form)
- Part of speech
- Frequency rank
- Translation

These are the words seeded for placement-tested users.

## Benefits of This System

1. **No Re-Teaching**: Users aren't forced to re-learn words they already know
2. **Appropriate Difficulty**: Content matches their actual ability level
3. **Clear Progression**: Visual path shows journey from current level to next milestone
4. **Motivation**: Immediate progress visible (not starting from zero)
5. **Efficient Learning**: Focus time on genuinely new material
6. **Smart Routing**: Automatic lesson type selection removes decision paralysis

## Future Enhancements

- [ ] Custom vocabulary import (add personal word lists)
- [ ] Re-assessment option (update placement if needed)
- [ ] Partial credit for "learning" status words
- [ ] Domain-specific vocabulary tracks (business, medical, etc.)
- [ ] Export known words list for other tools

## Related Files

- `src/lib/srs/seed-vocabulary.ts` - Vocabulary seeding logic
- `src/lib/placement/scoring.ts` - Placement test scoring
- `src/app/onboarding/page.tsx` - Onboarding flow
- `src/app/dashboard/page.tsx` - Lesson routing
- `src/lib/progression/index.ts` - Progression gateway
- `src/data/common-french-words.json` - Word database
