/* =============================================================================
   GOALS SYSTEM — SEED DATA
   
   Seeds 12 goal templates: 6 monthly + 6 weekly.
   Uses ON CONFLICT to be safely re-runnable.
============================================================================= */

INSERT INTO goal_templates (slug, title, description, category, period_type, target_value, target_unit, tracking_event, icon, tier_required)
VALUES
  -- ── Monthly Goals ─────────────────────────────────────────────────────────
  (
    'monthly_streak_20',
    'Maintain a 20-day streak',
    'Stay active for 20 days this month to prove your commitment.',
    'streak', 'monthly', 20, 'days', 'daily_activity',
    '🔥', 'tide'
  ),
  (
    'monthly_vocab_150',
    'Learn 150 new words',
    'Expand your vocabulary by learning 150 new words this month.',
    'vocabulary', 'monthly', 150, 'words', 'word_learned',
    '📚', 'tide'
  ),
  (
    'monthly_immersion_8hrs',
    'Listen to 8 hours of immersion content',
    'Immerse yourself in 8 hours of native audio content this month.',
    'immersion', 'monthly', 480, 'minutes', 'immersion_listened',
    '🎧', 'tide'
  ),
  (
    'monthly_ai_conversations_4',
    'Complete 4 AI conversation sessions',
    'Practice speaking with the AI tutor 4 times this month.',
    'speaking', 'monthly', 4, 'sessions', 'ai_conversation_completed',
    '🗣️', 'tide'
  ),
  (
    'monthly_quiz_wins_3',
    'Win 3 async quizzes against other users',
    'Challenge other learners and win 3 quizzes this month.',
    'social', 'monthly', 3, 'wins', 'quiz_won',
    '⚔️', 'tide'
  ),
  (
    'monthly_ai_stories_3',
    'Finish 3 personalised AI stories',
    'Read and complete 3 AI-generated stories tailored to your level.',
    'cloze', 'monthly', 3, 'stories', 'story_completed',
    '📖', 'tide'
  ),

  -- ── Weekly Goals ──────────────────────────────────────────────────────────
  (
    'weekly_vocab_40',
    'Learn 40 new words this week',
    'Add 40 new words to your vocabulary this week.',
    'vocabulary', 'weekly', 40, 'words', 'word_learned',
    '📚', 'tide'
  ),
  (
    'weekly_immersion_2hrs',
    'Listen to 2 hours of content this week',
    'Spend 2 hours listening to immersion content this week.',
    'immersion', 'weekly', 120, 'minutes', 'immersion_listened',
    '🎧', 'tide'
  ),
  (
    'weekly_flashcards_5days',
    'Complete flashcard reviews 5 days this week',
    'Review your flashcards on 5 different days this week.',
    'vocabulary', 'weekly', 5, 'days', 'flashcard_session_completed',
    '🃏', 'tide'
  ),
  (
    'weekly_cloze_25',
    'Complete 25 cloze exercises',
    'Finish 25 fill-in-the-blank exercises this week.',
    'cloze', 'weekly', 25, 'exercises', 'cloze_completed',
    '✏️', 'tide'
  ),
  (
    'weekly_pronunciation_2',
    'Complete 2 pronunciation sessions',
    'Practice your pronunciation in 2 sessions this week.',
    'speaking', 'weekly', 2, 'sessions', 'pronunciation_completed',
    '🎙️', 'tide'
  ),
  (
    'weekly_active_days_5',
    'Be active at least 5 days this week',
    'Open the app and do any activity on 5 days this week.',
    'streak', 'weekly', 5, 'days', 'daily_activity',
    '📅', 'tide'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  target_value = EXCLUDED.target_value,
  target_unit = EXCLUDED.target_unit,
  tracking_event = EXCLUDED.tracking_event,
  icon = EXCLUDED.icon,
  tier_required = EXCLUDED.tier_required;
