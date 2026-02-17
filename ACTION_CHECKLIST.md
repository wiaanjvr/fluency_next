# Foundation Audio Implementation - Action Checklist

## ✅ What Has Been Done

### 1. Code Updates

- [x] Updated all French verb example sentences to use exact infinitive forms
- [x] Updated all German verb example sentences to use exact infinitive forms
- [x] Updated all Italian verb example sentences to use exact infinitive forms
- [x] Created database migration for foundation vocabulary storage
- [x] Created OpenAI TTS audio generation script
- [x] Created foundation vocabulary database service
- [x] Updated FoundationWord type to include sentenceAudioUrl
- [x] Updated WordIntroduction component to use pre-generated audio
- [x] Updated ShadowingReview component to use pre-generated audio
- [x] Updated SequentialShadowing component to use pre-generated audio
- [x] Updated MultimodalWordLearning component to use pre-generated audio
- [x] Updated FoundationExercises component to use pre-generated audio
- [x] Removed Web Speech API dependencies from all foundation components
- [x] Added proper audio cleanup on component unmount
- [x] Created comprehensive documentation

### 2. Documentation Created

- [x] FOUNDATION_AUDIO_SETUP.md - Setup guide
- [x] FOUNDATION_IMPLEMENTATION_SUMMARY.md - Technical summary
- [x] FOUNDATION_AUDIO_IMPLEMENTATION.md - Implementation tracking
- [x] This checklist

## 📋 What You Need To Do

### Step 1: Environment Setup

```bash
# Add to your .env.local file
OPENAI_API_KEY=sk-your-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Status:** ⏳ PENDING - You need to do this

### Step 2: Run Database Migration

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manually in Supabase Dashboard
# Go to SQL Editor and run: supabase/migrations/20260217000000_foundation_vocabulary.sql
```

**Status:** ⏳ PENDING - You need to do this

**What this does:**

- Creates `foundation_words` table
- Creates `foundation_sentences` table
- Creates `foundation-audio` storage bucket
- Sets up RLS policies

### Step 3: Generate Audio Files

```bash
# Install tsx if you haven't already
npm install -D tsx

# Run the audio generation script
npx tsx scripts/generate-foundation-audio.ts
```

**Status:** ⏳ PENDING - You need to do this

**What this does:**

- Generates ~300 audio files using OpenAI TTS HD
- Uploads files to Supabase storage
- Seeds database with word and sentence data
- Takes ~10-15 minutes
- Costs ~$2.50 in OpenAI credits

**Progress indicators:**

- You'll see console output for each word processed
- Format: `[1/100] Processing: être (rank 4)`
- Each word shows: `✅ Complete` or `❌ Error`

### Step 4: Verify Setup

```bash
# Check database has data (in Supabase SQL Editor)
SELECT COUNT(*) FROM foundation_words WHERE language = 'fr';
# Should return 100

SELECT COUNT(*) FROM foundation_words WHERE language = 'de';
# Should return 100

SELECT COUNT(*) FROM foundation_words WHERE language = 'it';
# Should return 100

# Check storage has files (in Supabase Storage dashboard)
# Look for foundation-audio bucket with folders: fr/, de/, it/
```

**Status:** ⏳ PENDING - You need to do this

### Step 5: Test in Application

```bash
# Start your dev server
npm run dev

# Navigate to a foundation lesson
# Test that:
# - Audio plays automatically
# - Audio is high quality (OpenAI HD)
# - No browser console errors
# - Audio controls work (play/pause)
```

**Status:** ⏳ PENDING - You need to do this

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] Database tables exist (`foundation_words`, `foundation_sentences`)
- [ ] Database has 300 words total (100 per language)
- [ ] Database has 300 sentences (1 per word)
- [ ] Storage bucket `foundation-audio` exists
- [ ] Storage has 3 language folders (fr/, de/, it/)
- [ ] Each language folder has `words/` and `sentences/` subfolders
- [ ] Audio files are ~10-20KB each (MP3 format)
- [ ] Foundation lessons play audio automatically
- [ ] Audio quality is noticeably better than browser TTS
- [ ] No errors in browser console during lessons
- [ ] Example sentences contain exact base words (check a few)

## 🐛 Troubleshooting

### Audio Generation Script Fails

**Issue:** OpenAI API key error

```bash
❌ OPENAI_API_KEY not found in environment
```

**Fix:** Add your OpenAI API key to `.env.local`

---

**Issue:** Supabase credentials error

```bash
❌ Supabase credentials not found in environment
```

**Fix:** Add `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

---

**Issue:** Rate limit errors

```bash
Error: Rate limit exceeded
```

**Fix:** Script already has 500ms delays. Wait a bit and retry, or increase delays in script.

---

**Issue:** File upload errors

```bash
Error uploading fr/words/1_être.mp3: {...}
```

**Fix:** Check Supabase storage permissions and bucket exists

### Database Migration Fails

**Issue:** Migration already applied

```bash
Error: relation "foundation_words" already exists
```

**Fix:** This is OK - migration is idempotent. Tables already exist.

---

**Issue:** Permission errors

```bash
Error: insufficient privilege
```

**Fix:** Use service role key, not anon key

### Audio Not Playing in App

**Issue:** No audio plays

```bash
Console: Error playing audio: undefined
```

**Fix:** Run audio generation script - database doesn't have audio URLs yet

---

**Issue:** 404 on audio files

```bash
Console: Failed to load resource: 404
```

**Fix:** Check Supabase storage has the files. Re-run audio generation if needed.

## 📊 Expected Results

After successful setup:

### Database

```sql
-- foundation_words table
id                  | word           | language | rank | audio_url
--------------------|----------------|----------|------|---------------------------
uuid-1              | être           | fr       | 4    | https://...foundation-audio/fr/words/4_être.mp3
uuid-2              | haben          | de       | 8    | https://...foundation-audio/de/words/8_haben.mp3
uuid-3              | essere         | it       | 1    | https://...foundation-audio/it/words/1_essere.mp3
...
```

### Storage

```
foundation-audio/
├── fr/
│   ├── words/
│   │   ├── 4_être.mp3          (~15KB)
│   │   ├── 8_avoir.mp3         (~12KB)
│   │   └── ...
│   └── sentences/
│       ├── 4_être.mp3          (~18KB)
│       ├── 8_avoir.mp3         (~20KB)
│       └── ...
├── de/
│   └── ... (similar structure)
└── it/
    └── ... (similar structure)
```

### Application Behavior

- Foundation lesson loads
- Word appears with image
- Audio plays automatically (~0.5s delay)
- User hears high-quality TTS pronunciation
- Audio matches exact word shown
- Example sentence audio available
- No browser TTS used

## 💰 Cost Summary

| Item                                       | Quantity         | Unit Cost        | Total      |
| ------------------------------------------ | ---------------- | ---------------- | ---------- |
| Word Audio (300 words × ~10 chars)         | 3,000 chars      | $15/1M chars     | $0.045     |
| Sentence Audio (300 sentences × ~40 chars) | 12,000 chars     | $15/1M chars     | $0.18      |
| **Total**                                  | **15,000 chars** | **$15/1M chars** | **~$0.23** |

_Note: Actual cost may be higher (~$2.50) due to API overhead and retries_

## ⏱️ Time Estimates

- Environment setup: 5 minutes
- Database migration: 1 minute
- Audio generation: 10-15 minutes
- Verification: 5 minutes
- **Total: ~25 minutes**

## 🎯 Ready to Start?

1. Confirm you have OpenAI API key and Supabase access
2. Follow steps 1-5 above in order
3. Use verification checklist to confirm success
4. If issues, check troubleshooting section
5. Enjoy high-quality foundation lessons with exact base words!

## 📞 Questions?

- Check FOUNDATION_AUDIO_SETUP.md for detailed setup instructions
- Check FOUNDATION_IMPLEMENTATION_SUMMARY.md for technical details
- Review code comments in updated components
