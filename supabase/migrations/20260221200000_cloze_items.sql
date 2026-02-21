-- Cloze Items: Pre-generated cloze exercise pool
-- Part of the Cloze Activities feature for Propel

-- Main cloze item pool
create table if not exists cloze_items (
  id uuid primary key default gen_random_uuid(),
  language char(2) not null,        -- 'de', 'fr', 'it'
  level text not null,               -- 'A1','A2','B1','B2','C1'
  sentence text not null,            -- full sentence with ___ blank
  answer text not null,              -- the removed word
  answer_position int not null,      -- index of blank in sentence tokens
  translation text not null,         -- English translation
  explanation text not null,         -- grammar/vocab explanation
  distractors text[] not null,       -- 3 wrong multiple choice options
  source text not null,              -- e.g. 'wikipedia', 'gutenberg', 'reddit'
  source_url text,
  created_at timestamptz default now(),
  used_count int default 0
);

-- Per-user progress tracking
create table if not exists user_cloze_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  cloze_item_id uuid references cloze_items(id) on delete cascade,
  answered_correctly boolean not null,
  answered_at timestamptz default now()
);

-- Indexes for efficient querying
create index if not exists idx_cloze_items_language_level on cloze_items(language, level);
create index if not exists idx_cloze_items_language_used on cloze_items(language, used_count);
create index if not exists idx_user_cloze_progress_user on user_cloze_progress(user_id, cloze_item_id);
create index if not exists idx_user_cloze_progress_answered on user_cloze_progress(user_id, answered_at);

-- Unique constraint to prevent duplicate sentences per language
create unique index if not exists idx_cloze_items_unique_sentence on cloze_items(language, sentence);

-- RLS policies
alter table cloze_items enable row level security;
alter table user_cloze_progress enable row level security;

-- Anyone authenticated can read cloze items
create policy "Anyone can read cloze items"
  on cloze_items for select
  to authenticated
  using (true);

-- Only service role can insert/update cloze items (pipeline)
create policy "Service role can manage cloze items"
  on cloze_items for all
  to service_role
  using (true)
  with check (true);

-- Users can read their own progress
create policy "Users can read own cloze progress"
  on user_cloze_progress for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can insert their own progress
create policy "Users can insert own cloze progress"
  on user_cloze_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Service role can manage all progress
create policy "Service role can manage cloze progress"
  on user_cloze_progress for all
  to service_role
  using (true)
  with check (true);
