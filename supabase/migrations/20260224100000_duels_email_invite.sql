-- ==========================================================================
-- Allow duel invites to any email address (registered or not)
--
-- Changes:
--   1. Make opponent_id nullable (email invites have no user ID yet)
--   2. Add opponent_email column
--   3. Enforce that at least one of the two is set
--   4. Update RLS policies so unregistered invitees can see their invites
--      once they sign up with the same email
-- ==========================================================================

-- 1. Drop the NOT NULL constraint on opponent_id
ALTER TABLE duels ALTER COLUMN opponent_id DROP NOT NULL;

-- 2. Add opponent_email for invites to non-registered addresses
ALTER TABLE duels ADD COLUMN IF NOT EXISTS opponent_email TEXT;

-- 3. At least one of opponent_id / opponent_email must be populated
ALTER TABLE duels ADD CONSTRAINT check_opponent_set
  CHECK (opponent_id IS NOT NULL OR opponent_email IS NOT NULL);

-- 4. Update view policy to let email-invited users see their invites
--    auth.email() returns the current user's email in Supabase RLS context
DROP POLICY IF EXISTS "Users can view own duels" ON duels;
CREATE POLICY "Users can view own duels"
  ON duels FOR SELECT
  USING (
    auth.uid() = challenger_id
    OR auth.uid() = opponent_id
    OR (opponent_id IS NULL AND lower(opponent_email) = lower(auth.email()))
  );

-- 5. Update update policy similarly (so the invitee can accept/decline)
DROP POLICY IF EXISTS "Participants can update duels" ON duels;
CREATE POLICY "Participants can update duels"
  ON duels FOR UPDATE
  USING (
    auth.uid() = challenger_id
    OR auth.uid() = opponent_id
    OR (opponent_id IS NULL AND lower(opponent_email) = lower(auth.email()))
  );

-- 6. Update duel_rounds view policy to match
DROP POLICY IF EXISTS "Users can view own duel rounds" ON duel_rounds;
CREATE POLICY "Users can view own duel rounds"
  ON duel_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = duel_rounds.duel_id
        AND (
          duels.challenger_id = auth.uid()
          OR duels.opponent_id = auth.uid()
          OR (duels.opponent_id IS NULL AND lower(duels.opponent_email) = lower(auth.email()))
        )
    )
  );

-- Index to speed up email-based lookups
CREATE INDEX IF NOT EXISTS idx_duels_opponent_email ON duels(opponent_email)
  WHERE opponent_email IS NOT NULL;
