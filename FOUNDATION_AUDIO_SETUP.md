# Foundation Audio Setup Guide

## Overview

This guide explains how to set up the foundation vocabulary system with pre-generated OpenAI HD TTS audio for French, German, and Italian.

## Prerequisites

1. **OpenAI API Key**: You need an OpenAI API key with access to the TTS API
2. **Supabase Access**: Service role key for uploading to storage
3. **Environment Variables**: Properly configured `.env.local` file

## Setup Steps

### 1. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Database Migration

Apply the foundation vocabulary schema migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL file in Supabase Dashboard
# File: supabase/migrations/20260217000000_foundation_vocabulary.sql
```

This creates:

- `foundation_words` table
- `foundation_sentences` table
- `foundation-audio` storage bucket
- Appropriate RLS policies

### 3. Generate Audio Files

Run the audio generation script to create OpenAI TTS audio for all foundation vocabulary:

```bash
# Using tsx (recommended)
npx tsx scripts/generate-foundation-audio.ts

# Or using ts-node
node --loader ts-node/esm scripts/generate-foundation-audio.ts
```

**Note**: This will:

- Generate ~300 audio files (100 words × 3 languages, plus sentences)
- Upload them to Supabase storage
- Insert all data into the database
- Cost approximately $1-2 in OpenAI TTS HD credits
- Take 10-15 minutes to complete (with rate limiting delays)

### 4. Verify Setup

Check that everything is working:

1. **Database**: Verify tables have data

   ```sql
   SELECT COUNT(*) FROM foundation_words;
   -- Should return 300 (100 per language)

   SELECT COUNT(*) FROM foundation_sentences;
   -- Should return 300
   ```

2. **Storage**: Check `foundation-audio` bucket has files
   - Should have folders: `fr/`, `de/`, `it/`
   - Each with `words/` and `sentences/` subdirectories

3. **Frontend**: Test a foundation lesson
   - Audio should play automatically (no browser TTS)
   - Audio should sound like OpenAI HD quality

## Architecture

### Database Schema

**foundation_words**

- Stores individual words with metadata
- `audio_url` points to word pronunciation in storage

**foundation_sentences**

- Stores example sentences for each word
- `audio_url` points to sentence audio in storage

### Audio Storage

Files are organized in Supabase storage:

```
foundation-audio/
├── fr/
│   ├── words/
│   │   ├── 1_être.mp3
│   │   ├── 2_avoir.mp3
│   │   └── ...
│   └── sentences/
│       ├── 1_être.mp3
│       ├── 2_avoir.mp3
│       └── ...
├── de/
│   └── ...
└── it/
    └── ...
```

### Component Updates

All foundation components now use pre-generated audio:

- `WordIntroduction.tsx`
- `ShadowingReview.tsx`
- `SequentialShadowing.tsx`
- `MultimodalWordLearning.tsx`
- `FoundationExercises.tsx`

## Regenerating Audio

If you need to regenerate audio (e.g., after updating sentences):

1. Update the sentences in `src/data/foundation-vocabulary.ts`
2. Run the generation script again (it will overwrite existing files)
3. Audio files in storage are automatically updated (upsert: true)

## Cost Estimates

- **OpenAI TTS HD**: ~$15/million characters
- **Per word**: ~10 characters = $0.00015
- **Per sentence**: ~40 characters = $0.0006
- **Total for 300 items**: ~$0.50 for words + $2.00 for sentences = **~$2.50**

## Troubleshooting

### Audio Not Playing

1. Check browser console for errors
2. Verify `audioUrl` is set on word objects
3. Check Supabase storage permissions (should be public read)
4. Verify files exist in storage bucket

### Generation Script Fails

1. Check OpenAI API key is valid
2. Verify Supabase credentials
3. Check rate limits (script has 500ms delays)
4. Review console output for specific errors

### Database Migration Issues

1. Ensure PostgreSQL version compatibility (14+)
2. Check if tables already exist (migration is idempotent)
3. Verify RLS policies are enabled

## Development Notes

- Audio files are ~10-20KB each (MP3 format)
- Total storage: ~3-6 MB for all foundation audio
- Browser caching: Audio files are cached (Cache-Control: 3600)
- Fallback: If audio URL is missing, component logs error but doesn't crash

## Future Enhancements

- [ ] Add progress tracking for audio generation
- [ ] Implement batch audio generation API
- [ ] Add audio quality verification
- [ ] Create admin UI for audio management
- [ ] Support for additional languages
