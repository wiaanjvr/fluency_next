# Vocabulary Database Migration Guide

## Overview

This guide explains the migration of vocabulary data from static JSON files to Supabase database tables. This change improves maintainability, allows for dynamic updates, and centralizes data management.

## What Changed

### ✅ Migrated to Database

- **common-french-words.json** → `vocabulary` table (language='fr')
- **common-german-words.json** → `vocabulary` table (language='de')
- **common-italian-words.json** → `vocabulary` table (language='it')
- Level allocations → `vocabulary_level_allocation` table

### ❌ Removed (Unused Files)

- **foundation-lessons.json** - Not being used (foundation lessons use database table)
- **foundation-lessons-german.json** - Not being used
- **foundation-lessons-italian.json** - Not being used
- **scripts/generate_foundation_audio.py** - Related to removed JSON files
- **supabase/migrations/add_foundation_lessons.sql** - Duplicate migration

### ✔️ Kept (Still in Database)

- `foundation_lessons` database table - Used by `/api/foundation` route
- `placement-test*.json` files - Will be migrated later
- `micro-stories.json` - Still in use

## Migration Steps

### 1. Update Supabase Schema

Run the updated schema in your Supabase SQL Editor:

```bash
# Option A: Apply the full CLEAN_SCHEMA.sql
# This will create all tables including the new vocabulary tables
# (Only do this for a fresh database or if you know what you're doing)

# Option B: Apply just the vocabulary migration
# Run this in Supabase SQL Editor:
```

Run `supabase/migrations/add_vocabulary_table.sql` in your Supabase SQL Editor.

### 2. Seed Vocabulary Data

You need to populate the vocabulary tables from the JSON files. This only needs to be done ONCE.

**Prerequisites:**

- `NEXT_PUBLIC_SUPABASE_URL` must be set in `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` must be set in `.env.local`

**Run the seeding script:**

```bash
npx tsx scripts/seed-vocabulary-db.ts
```

This will:

1. Clear any existing vocabulary data
2. Insert all words from the JSON files (~3000 words total)
3. Insert level allocations for all languages
4. Verify the data was inserted correctly

**Expected output:**

```
🌱 Starting vocabulary database seeding...

🗑️  Clearing existing vocabulary data...

📚 Processing FR vocabulary...
  ✓ Inserted 1000/1000 words
  ✅ Completed FR: 1000 words

📚 Processing DE vocabulary...
  ✓ Inserted 1000/1000 words
  ✅ Completed DE: 1000 words

📚 Processing IT vocabulary...
  ✓ Inserted 1000/1000 words
  ✅ Completed IT: 1000 words

📊 Inserting level allocations...
  ✅ Inserted 21 level allocations

🔍 Verifying data...
  ✓ Vocabulary words: 3000
  ✓ Level allocations: 21

✨ Vocabulary seeding completed successfully!

📈 Summary:
   - Total words inserted: 3000
   - Languages: FR, DE, IT
   - Level allocations: 21
```

### 3. Update Your Code (Already Done)

The following files have been updated to support database-backed vocabulary:

#### New Files

- `src/lib/languages/vocabulary-db.ts` - Database loader with caching
- `src/app/api/vocabulary/route.ts` - API endpoint for vocabulary data
- `scripts/seed-vocabulary-db.ts` - Migration script

#### Updated Files

- `src/lib/languages/data-loader.ts` - Now supports both database and JSON fallback
  - Added `getVocabularyDataAsync()` - Async database loader
  - Added `getVocabularyForLevelAsync()` - Async level-based loader
  - Kept old functions for backward compatibility (uses JSON fallback)

### 4. Using the New API

#### In Server Components (Recommended)

```typescript
import { getVocabularyDataAsync } from "@/lib/languages/data-loader";

export default async function MyComponent() {
  const vocabulary = await getVocabularyDataAsync("fr");

  return (
    <div>
      {vocabulary.words.map(word => (
        <div key={word.rank}>{word.word}</div>
      ))}
    </div>
  );
}
```

#### In Client Components

```typescript
"use client";

import { useEffect, useState } from "react";
import { fetchVocabularyFromDB } from "@/lib/languages/vocabulary-db";

export default function MyComponent() {
  const [vocabulary, setVocabulary] = useState(null);

  useEffect(() => {
    fetchVocabularyFromDB("fr").then(setVocabulary);
  }, []);

  if (!vocabulary) return <div>Loading...</div>;

  return (
    <div>
      {vocabulary.words.map(word => (
        <div key={word.rank}>{word.word}</div>
      ))}
    </div>
  );
}
```

#### Via API Route

```typescript
const response = await fetch(
  "/api/vocabulary?language=fr&includeAllocation=true",
);
const data = await response.json();
```

## Database Schema

### `vocabulary` Table

| Column           | Type    | Description                            |
| ---------------- | ------- | -------------------------------------- |
| id               | UUID    | Primary key                            |
| word             | TEXT    | The word                               |
| lemma            | TEXT    | Base/dictionary form                   |
| language         | TEXT    | Language code (fr, de, it)             |
| part_of_speech   | TEXT    | article, verb, noun, etc.              |
| frequency_rank   | INTEGER | Rank by frequency (1 = most common)    |
| translation_en   | TEXT    | English translation (optional)         |
| pronunciation    | TEXT    | IPA or phonetic (optional)             |
| audio_url        | TEXT    | Link to pronunciation audio (optional) |
| example_sentence | TEXT    | Example usage (optional)               |

### `vocabulary_level_allocation` Table

| Column   | Type    | Description                      |
| -------- | ------- | -------------------------------- |
| id       | UUID    | Primary key                      |
| language | TEXT    | Language code (fr, de, it)       |
| level    | TEXT    | CEFR level (A0-C2)               |
| max_rank | INTEGER | Maximum word rank for this level |

## Benefits

1. **Centralized Data Management**: All vocabulary in one place
2. **Easy Updates**: Can update words without code deployment
3. **Extensibility**: Can add translations, audio, examples dynamically
4. **Multi-language Support**: Easy to add new languages
5. **Performance**: Database indexing for fast lookups
6. **Caching**: In-memory caching reduces database queries

## Future Improvements

- [ ] Migrate placement test data to database
- [ ] Add translations for all words
- [ ] Add audio URLs for pronunciation
- [ ] Add example sentences
- [ ] Create admin UI for vocabulary management
- [ ] Add more languages (Spanish, Portuguese, etc.)

## Troubleshooting

### Migration script fails

**Issue**: `Missing Supabase credentials`

**Solution**: Make sure `.env.local` has both:

```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
```

### No data returned from database

**Issue**: `fetchVocabularyFromDB` returns null or empty

**Solution**:

1. Verify the seeding script ran successfully
2. Check Supabase SQL Editor: `SELECT COUNT(*) FROM vocabulary;`
3. Verify RLS policies allow public read access

### Build errors after migration

**Issue**: TypeScript errors about missing imports

**Solution**: The old JSON imports are kept as fallbacks. If you see errors:

1. Make sure you're using the async versions of functions
2. Check that `vocabulary-db.ts` is in the correct location

## Rollback Plan

If you need to rollback:

1. The JSON files are kept in the codebase as fallbacks
2. Old synchronous functions still work (they use JSON)
3. To fully rollback, remove the new async functions and vocabulary-db.ts

## Support

For issues or questions, check:

- Supabase dashboard for table data
- Browser console for client-side errors
- Server logs for API errors
