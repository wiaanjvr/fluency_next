-- ==========================================================================
-- Duel Multiplayer Trivia Feature
-- Asynchronous, turn-based language quiz game between two users.
-- ==========================================================================

-- A duel between two users
CREATE TABLE IF NOT EXISTS duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL CHECK (language_code IN ('de', 'fr', 'it')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('A1', 'A2', 'B1', 'B2')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined')) DEFAULT 'pending',
  current_turn UUID REFERENCES auth.users(id),
  challenger_score INT NOT NULL DEFAULT 0,
  opponent_score INT NOT NULL DEFAULT 0,
  current_round INT NOT NULL DEFAULT 1,
  max_rounds INT NOT NULL DEFAULT 5,
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient duel lookups
CREATE INDEX idx_duels_challenger ON duels(challenger_id);
CREATE INDEX idx_duels_opponent ON duels(opponent_id);
CREATE INDEX idx_duels_status ON duels(status);
CREATE INDEX idx_duels_current_turn ON duels(current_turn);
CREATE INDEX idx_duels_active_player ON duels(status, current_turn) WHERE status = 'active';

-- Each round is 7 questions, one per category
CREATE TABLE IF NOT EXISTS duel_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES duels(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  challenger_answers JSONB,
  opponent_answers JSONB,
  challenger_score INT,
  opponent_score INT,
  challenger_completed_at TIMESTAMPTZ,
  opponent_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(duel_id, round_number)
);

CREATE INDEX idx_duel_rounds_duel ON duel_rounds(duel_id);

-- User aggregate stats for duels
CREATE TABLE IF NOT EXISTS duel_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  duels_played INT NOT NULL DEFAULT 0,
  duels_won INT NOT NULL DEFAULT 0,
  total_correct INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE duel_stats ENABLE ROW LEVEL SECURITY;

-- Duels: users can see duels they are part of
CREATE POLICY "Users can view own duels"
  ON duels FOR SELECT
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Duels: any authenticated user can create a duel (challenger)
CREATE POLICY "Users can create duels"
  ON duels FOR INSERT
  WITH CHECK (auth.uid() = challenger_id);

-- Duels: participants can update their duels
CREATE POLICY "Participants can update duels"
  ON duels FOR UPDATE
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

-- Rounds: participants can view rounds of their duels
CREATE POLICY "Users can view own duel rounds"
  ON duel_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = duel_rounds.duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

-- Rounds: allow insert by participants (or service role for generation)
CREATE POLICY "Participants can insert rounds"
  ON duel_rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = duel_rounds.duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

-- Rounds: participants can update rounds (submit answers)
CREATE POLICY "Participants can update rounds"
  ON duel_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM duels
      WHERE duels.id = duel_rounds.duel_id
        AND (duels.challenger_id = auth.uid() OR duels.opponent_id = auth.uid())
    )
  );

-- Stats: users can view any stats (for leaderboard)
CREATE POLICY "Anyone can view duel stats"
  ON duel_stats FOR SELECT
  USING (true);

-- Stats: users can insert their own stats
CREATE POLICY "Users can insert own stats"
  ON duel_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Stats: users can update own stats
CREATE POLICY "Users can update own stats"
  ON duel_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── Updated_at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_duel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_duels_updated_at
  BEFORE UPDATE ON duels
  FOR EACH ROW
  EXECUTE FUNCTION update_duel_updated_at();

CREATE TRIGGER trigger_duel_stats_updated_at
  BEFORE UPDATE ON duel_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_duel_updated_at();
