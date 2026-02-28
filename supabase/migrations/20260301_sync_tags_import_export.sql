-- ============================================================================
-- Sync, Tags, and Import/Export infrastructure
-- ============================================================================

-- ── Tags table (normalised tag storage) ────────────────────────────────────
-- Tags are stored as text[] on flashcards already, but this gives us a
-- first-class table for rename/delete/hierarchy management.
create table if not exists flashcard_tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  -- Parent tag: for hierarchical tags using :: notation
  -- e.g. "grammar::verbs" → parent_id points to "grammar"
  parent_id   uuid references flashcard_tags(id) on delete set null,
  color       text default null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, name)
);

alter table flashcard_tags enable row level security;

create policy "Users can read own tags"
  on flashcard_tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on flashcard_tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on flashcard_tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on flashcard_tags for delete
  using (auth.uid() = user_id);

-- Index for fast hierarchical lookups
create index if not exists idx_flashcard_tags_parent
  on flashcard_tags(user_id, parent_id);

create index if not exists idx_flashcard_tags_name
  on flashcard_tags(user_id, name);

-- ── Sync state table ───────────────────────────────────────────────────────
-- Tracks per-entity modification timestamps for bidirectional sync
create table if not exists sync_state (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- entity_type: 'deck', 'flashcard', 'card_schedule', 'review_log', 'note_type', 'tag'
  entity_type   text not null,
  entity_id     uuid not null,
  -- last modified locally
  local_mod     timestamptz not null default now(),
  -- last synced to remote
  remote_mod    timestamptz,
  -- sync status: 'pending', 'synced', 'conflict'
  sync_status   text not null default 'pending'
    check (sync_status in ('pending', 'synced', 'conflict')),
  -- conflict data (JSON snapshot of remote version) if status = 'conflict'
  conflict_data jsonb,
  created_at    timestamptz default now(),
  unique (user_id, entity_type, entity_id)
);

alter table sync_state enable row level security;

create policy "Users can read own sync state"
  on sync_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own sync state"
  on sync_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sync state"
  on sync_state for update
  using (auth.uid() = user_id);

create policy "Users can delete own sync state"
  on sync_state for delete
  using (auth.uid() = user_id);

create index if not exists idx_sync_state_user_status
  on sync_state(user_id, sync_status);

create index if not exists idx_sync_state_entity
  on sync_state(user_id, entity_type, entity_id);

-- ── Sync log (history of sync operations) ──────────────────────────────────
create table if not exists sync_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sync_started_at timestamptz not null default now(),
  sync_finished_at timestamptz,
  direction       text not null check (direction in ('push', 'pull', 'bidirectional')),
  status          text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed', 'partial')),
  entities_pushed int default 0,
  entities_pulled int default 0,
  conflicts       int default 0,
  error_message   text,
  device_name     text,
  device_type     text check (device_type in ('desktop', 'ios', 'android', 'web')),
  details         jsonb
);

alter table sync_log enable row level security;

create policy "Users can read own sync log"
  on sync_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own sync log"
  on sync_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sync log"
  on sync_log for update
  using (auth.uid() = user_id);

-- ── Media sync tracking ────────────────────────────────────────────────────
-- Tracks which media files have been synced to cloud
alter table card_media
  add column if not exists sync_status text default 'local'
    check (sync_status in ('local', 'syncing', 'synced', 'error'));

alter table card_media
  add column if not exists remote_url text;

alter table card_media
  add column if not exists checksum text;

alter table card_media
  add column if not exists last_synced_at timestamptz;

-- ── Import/Export history ──────────────────────────────────────────────────
create table if not exists import_export_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  operation       text not null check (operation in ('import', 'export')),
  format          text not null
    check (format in ('apkg', 'colpkg', 'csv', 'txt')),
  filename        text,
  deck_id         uuid references decks(id) on delete set null,
  card_count      int default 0,
  media_count     int default 0,
  -- Import-specific: duplicate handling strategy used
  duplicate_mode  text check (duplicate_mode in ('ignore', 'update', 'create_new')),
  -- Export-specific: what was included
  include_scheduling boolean default false,
  include_media   boolean default false,
  status          text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message   text,
  created_at      timestamptz default now(),
  completed_at    timestamptz
);

alter table import_export_log enable row level security;

create policy "Users can read own import/export log"
  on import_export_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own import/export log"
  on import_export_log for insert
  with check (auth.uid() = user_id);

create policy "Users can update own import/export log"
  on import_export_log for update
  using (auth.uid() = user_id);

-- ── Modification tracking columns ──────────────────────────────────────────
-- Add updated_at columns for sync change detection
alter table decks
  add column if not exists updated_at timestamptz default now();

alter table flashcards
  add column if not exists updated_at timestamptz default now();

alter table card_schedules
  add column if not exists updated_at timestamptz default now();

-- ── Auto-update triggers for updated_at ────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_decks_updated_at
  before update on decks
  for each row execute function set_updated_at();

create trigger trg_flashcards_updated_at
  before update on flashcards
  for each row execute function set_updated_at();

create trigger trg_card_schedules_updated_at
  before update on card_schedules
  for each row execute function set_updated_at();

-- ── Function: rename a tag globally ────────────────────────────────────────
create or replace function rename_tag_globally(
  p_user_id uuid,
  p_old_name text,
  p_new_name text
) returns int as $$
declare
  affected_count int;
begin
  -- Update the normalised tags table
  update flashcard_tags
  set name = p_new_name, updated_at = now()
  where user_id = p_user_id and name = p_old_name;

  -- Update the text[] array on all flashcards
  update flashcards
  set tags = array_replace(tags, p_old_name, p_new_name)
  where user_id = p_user_id and p_old_name = any(tags);

  get diagnostics affected_count = row_count;

  -- Also rename child tags (hierarchical :: notation)
  update flashcard_tags
  set name = p_new_name || substring(name from length(p_old_name) + 1),
      updated_at = now()
  where user_id = p_user_id
    and name like p_old_name || '::%';

  update flashcards
  set tags = (
    select array_agg(
      case
        when t like p_old_name || '::%'
        then p_new_name || substring(t from length(p_old_name) + 1)
        else t
      end
    )
    from unnest(tags) as t
  )
  where user_id = p_user_id
    and exists (
      select 1 from unnest(tags) as t
      where t like p_old_name || '::%'
    );

  return affected_count;
end;
$$ language plpgsql security definer;

-- ── Function: delete a tag globally ────────────────────────────────────────
create or replace function delete_tag_globally(
  p_user_id uuid,
  p_tag_name text,
  p_include_children boolean default false
) returns int as $$
declare
  affected_count int := 0;
  child_count int := 0;
begin
  -- Remove from flashcards array
  update flashcards
  set tags = array_remove(tags, p_tag_name)
  where user_id = p_user_id and p_tag_name = any(tags);

  get diagnostics affected_count = row_count;

  -- Remove from normalised table
  delete from flashcard_tags
  where user_id = p_user_id and name = p_tag_name;

  -- Optionally remove children
  if p_include_children then
    -- Remove child tags from flashcards array
    update flashcards
    set tags = (
      select coalesce(array_agg(t), '{}')
      from unnest(tags) as t
      where t not like p_tag_name || '::%'
    )
    where user_id = p_user_id
      and exists (
        select 1 from unnest(tags) as t
        where t like p_tag_name || '::%'
      );

    get diagnostics child_count = row_count;
    affected_count := affected_count + child_count;

    delete from flashcard_tags
    where user_id = p_user_id and name like p_tag_name || '::%';
  end if;

  return affected_count;
end;
$$ language plpgsql security definer;
