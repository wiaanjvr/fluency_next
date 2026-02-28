-- ============================================================================
-- Note Types & Media support for the Card Editor
-- ============================================================================

-- ── Note Types ─────────────────────────────────────────────────────────────
-- A note type defines the template/schema for a card (like Anki's note types).
-- Each note type has an ordered array of fields and card templates.
create table if not exists note_types (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  -- JSON array of field definitions: [{name, sticky, font_size, rtl}]
  fields      jsonb not null default '[{"name":"Front","sticky":false},{"name":"Back","sticky":false}]'::jsonb,
  -- CSS for card rendering
  css         text default '',
  -- JSON array of card templates: [{name, front_template, back_template}]
  templates   jsonb not null default '[{"name":"Card 1","front_template":"{{Front}}","back_template":"{{FrontSide}}<hr id=answer>{{Back}}"}]'::jsonb,
  sort_field  integer default 0,
  is_builtin  boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table note_types enable row level security;

create policy "Users can manage own note types"
  on note_types for all using (auth.uid() = user_id);

-- ── Card Media ─────────────────────────────────────────────────────────────
-- Tracks media files attached to cards (images, audio, video).
create table if not exists card_media (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  card_id     uuid references flashcards(id) on delete set null,
  filename    text not null,
  mime_type   text not null,
  storage_path text not null,
  file_size   integer default 0,
  created_at  timestamptz default now()
);

alter table card_media enable row level security;

create policy "Users can manage own card media"
  on card_media for all using (auth.uid() = user_id);

create index if not exists idx_card_media_card on card_media(card_id);
create index if not exists idx_card_media_user on card_media(user_id);

-- ── Add note_type_id and fields to flashcards ──────────────────────────────
-- note_type_id links to the note type template used for this card.
-- fields stores the actual field values as JSON: {"Front":"...", "Back":"...", ...}
alter table flashcards
  add column if not exists note_type_id uuid references note_types(id) on delete set null;

alter table flashcards
  add column if not exists fields jsonb default null;

-- ── Storage bucket for card media ──────────────────────────────────────────
insert into storage.buckets (id, name, public) 
values ('card-media', 'card-media', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder
create policy "Users can upload card media"
  on storage.objects for insert
  with check (
    bucket_id = 'card-media' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own card media"
  on storage.objects for select
  using (
    bucket_id = 'card-media' AND
    auth.role() = 'authenticated'
  );

create policy "Users can delete own card media"
  on storage.objects for delete
  using (
    bucket_id = 'card-media' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Seed built-in note types function ──────────────────────────────────────
-- This function creates default note types for a user if they don't exist.
create or replace function seed_default_note_types(p_user_id uuid)
returns void as $$
begin
  -- Basic (Front / Back)
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Basic',
    '[{"name":"Front","sticky":false},{"name":"Back","sticky":false}]'::jsonb,
    '[{"name":"Card 1","front_template":"{{Front}}","back_template":"{{FrontSide}}<hr id=answer>{{Back}}"}]'::jsonb,
    true
  )
  on conflict do nothing;

  -- Basic (and reversed card)
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Basic (and reversed)',
    '[{"name":"Front","sticky":false},{"name":"Back","sticky":false}]'::jsonb,
    '[{"name":"Card 1","front_template":"{{Front}}","back_template":"{{FrontSide}}<hr id=answer>{{Back}}"},{"name":"Card 2","front_template":"{{Back}}","back_template":"{{FrontSide}}<hr id=answer>{{Front}}"}]'::jsonb,
    true
  )
  on conflict do nothing;

  -- Cloze
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Cloze',
    '[{"name":"Text","sticky":false},{"name":"Extra","sticky":false}]'::jsonb,
    '[{"name":"Cloze","front_template":"{{cloze:Text}}","back_template":"{{cloze:Text}}<br>{{Extra}}"}]'::jsonb,
    true
  )
  on conflict do nothing;

  -- Vocabulary (language learning specific)
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Vocabulary',
    '[{"name":"Word","sticky":false},{"name":"Translation","sticky":false},{"name":"Example","sticky":true},{"name":"Grammar","sticky":false},{"name":"Audio","sticky":false},{"name":"Image","sticky":false}]'::jsonb,
    '[{"name":"Recognition","front_template":"{{Word}}","back_template":"{{Word}}<hr id=answer>{{Translation}}<br>{{Example}}{{#Grammar}}<br><small>{{Grammar}}</small>{{/Grammar}}{{#Audio}}<br>{{Audio}}{{/Audio}}{{#Image}}<br>{{Image}}{{/Image}}"}]'::jsonb,
    true
  )
  on conflict do nothing;
end;
$$ language plpgsql security definer;
