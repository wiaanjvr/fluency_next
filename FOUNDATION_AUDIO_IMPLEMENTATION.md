# Foundation Audio Implementation

## Overview

Implementation of pre-generated OpenAI HD TTS audio for foundation lessons across French, German, and Italian.

## Requirements

1. Example sentences MUST contain the exact base word (no conjugations/variations)
2. All audio pre-generated using OpenAI HD TTS in the correct language
3. Audio stored in database/storage (no dynamic generation during lessons)
4. Separate audio files for:
   - Individual words
   - Example sentences

## Implementation Status

### 1. Example Sentence Updates

- [ ] French example sentences updated to use exact base words
- [ ] German example sentences updated to use exact base words
- [ ] Italian example sentences updated to use exact base words

### 2. Database Schema

- [ ] Create foundation_vocabulary table
- [ ] Create foundation_sentences table
- [ ] Add audio storage bucket configuration

### 3. Audio Generation Script

- [ ] Create OpenAI TTS generation script
- [ ] Generate word audio files
- [ ] Generate sentence audio files
- [ ] Upload to Supabase storage

### 4. Component Updates

- [ ] Update WordIntroduction to use pre-generated audio
- [ ] Update ShadowingReview to use pre-generated audio
- [ ] Update SequentialShadowing to use pre-generated audio
- [ ] Update MultimodalWordLearning to use pre-generated audio
- [ ] Update FoundationExercises to use pre-generated audio

## Notes

- For verbs, using infinitive form in sentences (e.g., "Je veux être" instead of "Je suis")
- For nouns, exact base form including articles where appropriate
- Audio files stored in Supabase storage under `foundation-audio` bucket
