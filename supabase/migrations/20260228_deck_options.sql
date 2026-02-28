-- ============================================================================
-- Deck options — per-deck SRS configuration
-- ============================================================================

-- ── New Cards ──────────────────────────────────────────────────────────────

-- Learning steps: array of minute values for each in-session step, e.g. {1,10}
alter table decks
  add column if not exists learning_steps integer[] default ARRAY[1, 10];

-- Graduating interval: minimum days assigned when card first graduates to Review
-- (triggered by Good rating on the last learning step)
alter table decks
  add column if not exists graduating_interval integer default 1;

-- Easy interval: minimum days assigned when card graduates via Easy
-- (bypasses remaining steps immediately)
alter table decks
  add column if not exists easy_interval integer default 4;

-- Insertion order: whether new cards are introduced sequentially (deck order)
-- or shuffled randomly each session
alter table decks
  add column if not exists insertion_order text default 'random'
  check (insertion_order in ('sequential', 'random'));

-- ── Reviews ────────────────────────────────────────────────────────────────

-- Maximum interval: absolute cap (in days) on how far out a card can be
-- scheduled. Default 36500 ≈ 100 years (effectively unlimited).
alter table decks
  add column if not exists max_interval integer default 36500;

-- Interval modifier: global multiplier applied to every review interval.
-- 1.0 = 100% (no change). Use < 1.0 for shorter intervals, > 1.0 for longer.
alter table decks
  add column if not exists interval_modifier real default 1.0;

-- Hard interval multiplier: fraction of the previous interval assigned when
-- the Hard button is pressed on a review card. Default 1.2 (120%).
alter table decks
  add column if not exists hard_interval_mult real default 1.2;

-- Easy bonus: extra multiplier applied to intervals when the Easy button is
-- pressed on a review card. Default 1.3 (130%).
alter table decks
  add column if not exists easy_bonus real default 1.3;

-- ── Lapses (Relearning) ───────────────────────────────────────────────────

-- Relearning steps: array of minute values for relearning cards, e.g. {10}
alter table decks
  add column if not exists relearning_steps integer[] default ARRAY[10];

-- Minimum interval after lapse: the shortest interval (days) a card receives
-- after re-graduating from relearning. Default 1 day.
alter table decks
  add column if not exists min_interval_after_lapse integer default 1;

-- New interval multiplier: after a lapse the old interval is multiplied by
-- this value to produce the new interval (0 = reset to min_interval_after_lapse).
alter table decks
  add column if not exists new_interval_multiplier real default 0.0;

-- ── Leeches ────────────────────────────────────────────────────────────────

-- Leech threshold: number of lapses before a card is flagged as a leech.
-- Default 8 (matching Anki).
alter table decks
  add column if not exists leech_threshold integer default 8;

-- Leech action: what happens when a card becomes a leech.
-- 'suspend' removes it from reviews; 'tag' adds a "leech" tag for visibility.
alter table decks
  add column if not exists leech_action text default 'tag'
  check (leech_action in ('suspend', 'tag'));

-- ── Card-level fields for leech / suspension support ───────────────────────

-- Whether this schedule is suspended (leech or manual)
alter table card_schedules
  add column if not exists is_suspended boolean default false;

-- Whether this card has been flagged as a leech
alter table card_schedules
  add column if not exists is_leech boolean default false;
-- ============================================================================
-- Display Order options
-- ============================================================================

-- New card gather order: how new cards are pulled from the deck
-- 'deck_order' = by position in deck, 'random' = shuffled,
-- 'ascending_position' = lowest position first, 'descending_position' = highest first
alter table decks
  add column if not exists new_gather_order text default 'deck_order'
  check (new_gather_order in ('deck_order', 'ascending_position', 'descending_position', 'random'));

-- New card sort order: how gathered new cards are sorted within the session
-- 'card_type' = by card type, 'order_gathered' = same as gather order,
-- 'card_type_then_random' = group by type then shuffle, 'random' = fully random
alter table decks
  add column if not exists new_sort_order text default 'order_gathered'
  check (new_sort_order in ('card_type', 'order_gathered', 'card_type_then_random', 'random'));

-- Review sort order: how review cards are ordered
-- 'due_date' = earliest due first, 'random' = shuffled,
-- 'intervals_ascending' = shortest intervals first,
-- 'intervals_descending' = longest intervals first,
-- 'relative_overdueness' = most overdue relative to interval first
alter table decks
  add column if not exists review_sort_order text default 'due_date'
  check (review_sort_order in ('due_date', 'random', 'intervals_ascending', 'intervals_descending', 'relative_overdueness'));

-- Interleave mode: whether to mix new and review cards or show them separately
-- 'mix' = interleave, 'new_first' = all new then reviews,
-- 'reviews_first' = all reviews then new
alter table decks
  add column if not exists interleave_mode text default 'mix'
  check (interleave_mode in ('mix', 'new_first', 'reviews_first'));

-- ============================================================================
-- Burying options
-- ============================================================================

-- Bury new siblings: when reviewing a card, bury its new siblings
-- (other new cards from the same note) until the next day
alter table decks
  add column if not exists bury_new_siblings boolean default false;

-- Bury review siblings: when reviewing a card, bury its review siblings
-- (other review cards from the same note) until the next day
alter table decks
  add column if not exists bury_review_siblings boolean default false;

-- Card-level: sibling group identifier (cards with the same front text
-- or derived from the same source note share a sibling group)
alter table flashcards
  add column if not exists sibling_group text default null;

-- Card-level: whether this card is buried for today's session
alter table card_schedules
  add column if not exists is_buried boolean default false;

-- Card-level: date this card was buried (auto-unbury next day)
alter table card_schedules
  add column if not exists buried_until timestamptz default null;

-- ============================================================================
-- Timer options
-- ============================================================================

-- Show an answer timer on cards during review
alter table decks
  add column if not exists show_answer_timer boolean default false;

-- Stop/cap the timer at N seconds (0 = no cap)
alter table decks
  add column if not exists answer_timer_limit integer default 60;

-- ============================================================================
-- Auto Advance options (newer Anki feature)
-- ============================================================================

-- Automatically reveal the answer after N seconds (0 = disabled)
alter table decks
  add column if not exists auto_advance_answer_seconds real default 0;

-- Automatically rate the card after N seconds (0 = disabled)
-- When enabled, uses "Good" rating by default
alter table decks
  add column if not exists auto_advance_rate_seconds real default 0;
