# Usage Limits Implementation

This document describes the implementation of daily usage limits for Free tier users in the Lingua 2.0 app.

## Overview

Free tier users now have the following daily limits:

- **Foundation Vocabulary**: 5 sessions per day
- **Sentence Sessions**: 3 sessions per day
- **Microstory Sessions**: 1 session per day
- **Main/Acquisition Lessons**: 1 lesson per day

Premium users have **unlimited access** to all session types.

## Implementation Details

### 1. Database Schema (`supabase/migrations/add_usage_limits.sql`)

Created a new table `user_daily_usage` to track daily session counts:

```sql
CREATE TABLE user_daily_usage (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    usage_date DATE DEFAULT CURRENT_DATE,
    foundation_sessions INTEGER DEFAULT 0,
    sentence_sessions INTEGER DEFAULT 0,
    microstory_sessions INTEGER DEFAULT 0,
    main_lessons INTEGER DEFAULT 0,
    ...
);
```

**Database Functions:**

- `can_start_session(user_id, session_type)` - Check if user can start a session
- `increment_session_count(user_id, session_type)` - Increment count after completion
- `get_today_usage(user_id)` - Get current daily usage stats

### 2. TypeScript Utilities (`src/lib/usage-limits.ts`)

Helper functions to interact with the database:

- `canStartSession()` - Check if user can start a session
- `incrementSessionCount()` - Increment session count
- `getTodayUsage()` - Get today's usage statistics
- `getRemainingSessionsByType()` - Get remaining sessions for each type

### 3. API Routes

**`/api/usage` (GET)** - Get current usage stats for authenticated user

**`/api/usage/check` (POST)** - Check if user can start a specific session type

```typescript
POST / api / usage / check;
Body: {
  sessionType: "foundation" | "sentence" | "microstory" | "main";
}
```

**`/api/usage/increment` (POST)** - Increment session count after completion

```typescript
POST / api / usage / increment;
Body: {
  sessionType: "foundation" | "sentence" | "microstory" | "main";
}
```

### 4. Session Tracking

**Foundation Sessions** (`src/lib/srs/foundation-srs.ts`)

- Added usage increment in `completeSession()` function

**Sentence Sessions** (`src/app/learn/sentences/session/[sessionId]/page.tsx`)

- Check limits before starting session
- Increment count on completion
- Show limit reached UI

**Microstory Sessions** (`src/app/learn/stories/session/page.tsx`)

- Check limits before starting session
- Increment count on completion
- Show limit reached UI

**Main Lessons** (`src/app/api/lesson/generate/route.ts`)

- Check limits before generating lesson (returns 429 status)
- Increment count on lesson completion (`src/app/lesson/page.tsx`)

### 5. UI Components

**`UsageLimitBanner`** (`src/components/ui/UsageLimitBanner.tsx`)

- Shows remaining sessions for Free users
- Displays upgrade prompt when limits reached
- Added to Dashboard for visibility

**Limit Reached Screens**

- Each session type shows a friendly "limit reached" message
- Offers upgrade to Premium option
- Links back to the respective learning section

## Setup Instructions

### Step 1: Run the Database Migration

You need to apply the migration to create the tables and functions:

```bash
# Option 1: Via Supabase CLI (if installed)
supabase db push

# Option 2: Via Supabase Dashboard
# 1. Go to your Supabase project dashboard
# 2. Navigate to SQL Editor
# 3. Copy the contents of supabase/migrations/add_usage_limits.sql
# 4. Paste and run the SQL
```

### Step 2: Test the Implementation

1. **Create a test user with Free tier** (default)
2. **Complete multiple foundation sessions** - should be blocked after 5
3. **Try sentence sessions** - should be blocked after 3
4. **Try microstory session** - should be blocked after 1
5. **Try main lesson** - should be blocked after 1
6. **Check the dashboard** - should see usage banner
7. **Upgrade to Premium** - should get unlimited access

### Step 3: Verify Database Functions

Test the database functions in Supabase SQL Editor:

```sql
-- Check if user can start a session
SELECT can_start_session('user-uuid-here', 'foundation');

-- Get today's usage
SELECT * FROM get_today_usage('user-uuid-here');

-- View usage table
SELECT * FROM user_daily_usage WHERE user_id = 'user-uuid-here';
```

## Testing Premium Users

To test Premium user experience:

1. Update user's subscription tier in the database:

```sql
UPDATE profiles
SET subscription_tier = 'premium'
WHERE id = 'user-uuid-here';
```

2. Premium users should:
   - Not see the usage limit banner
   - Have unlimited access to all session types
   - Still have usage tracked (but not enforced)

## Resetting Usage (for testing)

Usage automatically resets daily (based on `usage_date`), but for testing you can manually reset:

```sql
-- Delete today's usage for a user
DELETE FROM user_daily_usage
WHERE user_id = 'user-uuid-here'
AND usage_date = CURRENT_DATE;
```

## Future Enhancements

Possible improvements:

1. **Email notifications** when users hit daily limits
2. **Weekly/monthly analytics** for usage patterns
3. **Grace period** for new users (first week unlimited)
4. **Referral bonuses** (extra sessions for referrals)
5. **Streak bonuses** (extra sessions for maintaining streaks)

## Files Modified

### New Files

- `supabase/migrations/add_usage_limits.sql`
- `src/lib/usage-limits.ts`
- `src/app/api/usage/route.ts`
- `src/app/api/usage/increment/route.ts`
- `src/components/ui/UsageLimitBanner.tsx`

### Modified Files

- `src/lib/srs/foundation-srs.ts`
- `src/app/learn/sentences/session/[sessionId]/page.tsx`
- `src/app/learn/stories/session/page.tsx`
- `src/app/api/lesson/generate/route.ts`
- `src/app/lesson/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/foundation/FoundationSession.tsx`

## Troubleshooting

### Issue: Limits not enforcing

- **Check**: Migration has been run
- **Check**: User has `subscription_tier = 'free'` in profiles table
- **Check**: Database functions exist (query `pg_proc` table)

### Issue: Premium users seeing limits

- **Check**: User's `subscription_tier` is set to 'premium'
- **Check**: Profile record exists for the user

### Issue: Usage not resetting daily

- **Check**: Database timezone is set correctly
- **Check**: `usage_date` column is using `CURRENT_DATE` (not timestamps)

## Support

For issues or questions about this implementation, check:

1. Database migrations have been applied
2. API routes are accessible (check Network tab)
3. User authentication is working
4. Profile table has required columns
