-- Pre-generated content table for background generation queue
-- Stores AI-generated stories and words ahead of time so users
-- consume pre-built content instead of waiting for live generation.

create table if not exists pre_generated_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id text not null,
  type text not null check (type in ('story', 'word')),
  content jsonb not null,
  status text not null default 'ready' check (status in ('ready', 'used')),
  created_at timestamptz not null default now()
);

-- Index for fast lookup: find ready content for a user, ordered by creation time
create index idx_pre_generated_content_user_status
  on pre_generated_content (user_id, status, created_at);

-- Index for deduplication: prevent generating the same lesson twice
create index idx_pre_generated_content_user_lesson
  on pre_generated_content (user_id, lesson_id, type);

-- Enable RLS
alter table pre_generated_content enable row level security;

-- Users can only read their own pre-generated content
create policy "Users can read own pre-generated content"
  on pre_generated_content for select
  using (auth.uid() = user_id);

-- Users can update status of their own content (ready → used)
create policy "Users can update own pre-generated content"
  on pre_generated_content for update
  using (auth.uid() = user_id);

-- Only service role (worker) can insert — no user-facing insert policy
-- The worker uses the service role key, which bypasses RLS.
