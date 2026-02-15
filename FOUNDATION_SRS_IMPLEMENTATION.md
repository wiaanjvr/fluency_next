# Foundation Vocabulary - Spaced Repetition System

## Overview

The foundation vocabulary phase has been transformed from a fixed sequence of 25 sessions into a **dynamic, adaptive learning system** based on spaced repetition. Instead of predefined word lists, each session now adapts to the learner's progress and review needs.

## How It Works

### Dynamic Session Generation

Each session contains **4 words** determined by:

1. **Priority 1: Review Words** - Words that are due for review based on their SRS schedule
2. **Priority 2: New Words** - If fewer than 4 words need review, new words are introduced

### Example Flow

#### First Session

- User starts: **0 words learned**
- Session contains: **4 new words**

#### Second Session (24 hours later)

- Scenario A: If some words are due for review
  - Session contains: **2 review words + 2 new words**
- Scenario B: If no words need review yet
  - Session contains: **4 new words**

#### After Learning All 100 Words

- Sessions contain: **4 words due for review**
- Words appear at optimal intervals based on performance

## Technical Implementation

### Database Schema

The system uses the existing `user_words` table with SRS fields:

```sql
CREATE TABLE user_words (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  word TEXT NOT NULL,
  language TEXT NOT NULL,
  lemma TEXT NOT NULL,

  -- SRS tracking (SM-2 algorithm)
  easiness_factor DECIMAL(3,2) DEFAULT 2.5,
  repetitions INTEGER DEFAULT 0,
  interval_days DECIMAL(10,2) DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE,

  -- Learning state
  status TEXT CHECK (status IN ('new', 'learning', 'known', 'mastered')),
  times_seen INTEGER DEFAULT 0,

  UNIQUE(user_id, word, language)
);
```

### Key Functions

#### `getNextSessionWords()`

Location: `src/lib/srs/foundation-srs.ts`

Determines the next session's words:

- Queries words due for review
- Fills remaining slots with new words
- Returns session data with counts

```typescript
const sessionData = await getNextSessionWords(allFoundationWords, language, 4);
// Returns: { words, reviewCount, newCount, totalLearned, allWordsLearned }
```

#### `saveWordToDatabase()`

Location: `src/lib/srs/foundation-srs.ts`

Saves word progress with SRS data:

- Updates or creates word entry
- Calculates next review date using SM-2 algorithm
- Tracks performance metrics

#### `saveSessionWordsToDatabase()`

Location: `src/lib/srs/foundation-srs.ts`

Processes session completion:

- Analyzes exercise results
- Determines performance rating (1-4)
- Updates all session words in database

### SM-2 Algorithm

The system uses the SuperMemo 2 algorithm for optimal spacing:

**Rating Scale:**

- **4 (Easy)**: 90%+ accuracy → Longer interval
- **3 (Good)**: 70-89% accuracy → Standard interval
- **2 (Hard)**: 50-69% accuracy → Shorter interval
- **1 (Wrong)**: <50% accuracy → Reset interval

**Interval Progression:**

- First review: 1 day
- Second review: 6 days
- Subsequent: Previous interval × easiness factor (2.5 default)

## User Experience Changes

### Foundation Page

**Before:**

- List of 25 numbered sessions
- Sequential progression (unlock next after completing previous)
- Fixed word order

**After:**

- Single "Next Session" card
- Shows session type (Review/New Words)
- Displays review count and new word count
- Progress circle shows words learned out of 100

### Session Flow

**URL Structure:**

- Dynamic: `/learn/foundation/session/next` (SRS-based)
- Legacy: `/learn/foundation/session/0` (backward compatible)

**Session Types:**

1. **Review Session**: Contains words due for review
2. **New Words Session**: Introduces fresh vocabulary
3. **Mixed Session**: Combines review + new words

### Progress Tracking

Users can see:

- **Total words learned**: X/100
- **Words due for review**: Count of words ready to practice
- **Progress percentage**: Visual circle indicator

## Multi-Language Support

The system works seamlessly with all supported languages:

- **French (fr)**: ✅ Fully supported
- **German (de)**: ✅ Fully supported
- **Italian (it)**: ✅ Fully supported

Each language has:

- 100 foundation words from `common-{language}-words.json`
- Language-specific vocabulary data
- Independent SRS tracking per language

### Language Switching

Users can learn multiple languages:

- Each language has separate progress
- SRS schedules are language-specific
- Words are stored with `language` field in database

## Benefits

### For Learners

1. **Optimal Retention**: Words appear when you're about to forget them
2. **Personalized Pacing**: Progress at your own speed
3. **Efficient Learning**: Focus on words that need attention
4. **No Wasted Time**: Skip words you already know well

### For the System

1. **Adaptive**: Responds to individual learning patterns
2. **Scalable**: Works beyond 100 words
3. **Data-Driven**: Uses performance metrics
4. **Scientifically Backed**: SM-2 algorithm proven effective

## Migration Notes

### Backward Compatibility

The old session system still works:

- Numbered session URLs (`/session/0`, `/session/1`, etc.) still function
- Foundation progress tracking maintained
- Existing users' progress preserved

### Database Migration

No migration needed:

- Uses existing `user_words` table
- Creates rows on-demand as words are learned
- Foundation progress table still tracks overall completion

## Future Enhancements

Potential improvements:

1. **Manual Review**: Allow users to trigger review of specific words
2. **Difficulty Adjustment**: Let users mark words as "too easy" or "too hard"
3. **Review Forecasting**: Show when next review is needed
4. **Statistics Dashboard**: Detailed SRS metrics and learning curves
5. **Smart Batching**: Group related words (e.g., same category) in sessions

## Testing

To test the system:

1. **Start fresh**: New user with 0 words learned
2. **Complete first session**: Should show 4 new words
3. **Complete second session immediately**: Should show 4 new words (no reviews due)
4. **Wait 24 hours**: Next session should include reviews
5. **Complete all 100 words**: Session should show only reviews
6. **Test multiple languages**: Switch language and verify independent tracking

---

**Last Updated**: February 2026  
**Implemented By**: Copilot  
**Status**: ✅ Production Ready
