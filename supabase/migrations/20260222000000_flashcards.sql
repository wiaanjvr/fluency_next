-- ============================================================================
-- Flashcards feature: decks, cards, FSRS scheduling, review log
-- ============================================================================

-- Decks
create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  language char(2) not null,          -- 'de', 'fr', 'it'
  cover_color text default '#0d2137',
  created_at timestamptz default now(),
  card_count int default 0,
  new_per_day int default 20,
  review_per_day int default 100
);

-- Cards
create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  front text not null,                -- target language word/phrase
  back text not null,                 -- translation
  example_sentence text,              -- optional example in target language
  example_translation text,           -- English translation of example
  audio_url text,                     -- optional TTS audio URL
  image_url text,                     -- optional image
  word_class text,                    -- noun, verb, adjective, etc.
  grammar_notes text,                 -- optional grammar explanation
  tags text[],
  source text default 'manual',       -- 'manual' | 'csv' | 'anki' | 'cloze' | 'conjugation'
  created_at timestamptz default now()
);

-- FSRS scheduling state per user per card
create table if not exists card_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  card_id uuid references flashcards(id) on delete cascade,
  stability float default 0,
  difficulty float default 0,
  elapsed_days int default 0,
  scheduled_days int default 0,
  reps int default 0,
  lapses int default 0,
  state text default 'new',           -- 'new' | 'learning' | 'review' | 'relearning'
  due timestamptz default now(),
  last_review timestamptz,
  unique(user_id, card_id)
);

-- Review log for analytics
create table if not exists review_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  card_id uuid references flashcards(id),
  deck_id uuid references decks(id),
  rating int not null,                -- 1=Again, 2=Hard, 3=Good, 4=Easy
  review_time_ms int,                 -- how long user spent on card
  reviewed_at timestamptz default now()
);

-- Indexes
create index if not exists idx_flashcards_deck on flashcards(deck_id);
create index if not exists idx_card_schedules_due on card_schedules(user_id, due);
create index if not exists idx_card_schedules_state on card_schedules(user_id, state);
create index if not exists idx_review_log_user on review_log(user_id, reviewed_at);

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table decks enable row level security;
alter table flashcards enable row level security;
alter table card_schedules enable row level security;
alter table review_log enable row level security;

-- Decks: users can only CRUD their own
create policy "Users can view own decks" on decks for select using (auth.uid() = user_id);
create policy "Users can create own decks" on decks for insert with check (auth.uid() = user_id);
create policy "Users can update own decks" on decks for update using (auth.uid() = user_id);
create policy "Users can delete own decks" on decks for delete using (auth.uid() = user_id);

-- Flashcards: users can only CRUD their own
create policy "Users can view own flashcards" on flashcards for select using (auth.uid() = user_id);
create policy "Users can create own flashcards" on flashcards for insert with check (auth.uid() = user_id);
create policy "Users can update own flashcards" on flashcards for update using (auth.uid() = user_id);
create policy "Users can delete own flashcards" on flashcards for delete using (auth.uid() = user_id);

-- Card schedules: users can only CRUD their own
create policy "Users can view own schedules" on card_schedules for select using (auth.uid() = user_id);
create policy "Users can create own schedules" on card_schedules for insert with check (auth.uid() = user_id);
create policy "Users can update own schedules" on card_schedules for update using (auth.uid() = user_id);
create policy "Users can delete own schedules" on card_schedules for delete using (auth.uid() = user_id);

-- Review log: users can only read/write their own
create policy "Users can view own reviews" on review_log for select using (auth.uid() = user_id);
create policy "Users can create own reviews" on review_log for insert with check (auth.uid() = user_id);

-- ============================================================================
-- Function to update deck card_count on flashcard insert/delete
-- ============================================================================
create or replace function update_deck_card_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update decks set card_count = card_count + 1 where id = NEW.deck_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update decks set card_count = card_count - 1 where id = OLD.deck_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_flashcard_count_insert
  after insert on flashcards
  for each row execute function update_deck_card_count();

create trigger trg_flashcard_count_delete
  after delete on flashcards
  for each row execute function update_deck_card_count();
