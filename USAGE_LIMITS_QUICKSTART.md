# Quick Setup: Usage Limits

## Apply the Database Migration

You have two options to apply the migration:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Copy the entire contents of:
   ```
   supabase/migrations/add_usage_limits.sql
   ```
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl/Cmd + Enter)
8. You should see "Success. No rows returned" - this is correct!

### Option 2: Using Supabase CLI (if installed)

```bash
# Navigate to project root
cd c:\Developer\Projects\data-academy\personal\lingua_2.0

# Apply migration
supabase db push
```

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check if table exists
SELECT * FROM user_daily_usage LIMIT 1;

-- Check if functions exist
SELECT can_start_session(auth.uid(), 'foundation');
```

## Test the Feature

1. **Log in as a Free user** (default subscription_tier)
2. **Go to Dashboard** - you should see the usage limit banner
3. **Complete a foundation session** - count should increment
4. **Try to start 6 foundation sessions** - should be blocked on the 6th
5. **Check usage stats** at `/api/usage` endpoint

## That's it!

The usage limits are now active. Free users will see daily limits, Premium users get unlimited access.

## Need Help?

See [USAGE_LIMITS_IMPLEMENTATION.md](./USAGE_LIMITS_IMPLEMENTATION.md) for detailed documentation.
