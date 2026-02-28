-- ============================================================================
-- Card Templates, Cloze Deletions, Image Occlusion & Reversed Cards
-- ============================================================================
-- Extends the flashcard system with:
--   - template_index, cloze_ordinal columns on flashcards
--   - deck_override for per-card deck routing
--   - card_css for cached per-card styling
--   - Image Occlusion built-in note type
-- ============================================================================

-- ── New columns on flashcards ──────────────────────────────────────────────

-- Which template within the note type this card was generated from
alter table flashcards
  add column if not exists template_index integer default null;

-- For cloze cards, which cloze ordinal (c1, c2, ...) this card represents
alter table flashcards
  add column if not exists cloze_ordinal integer default null;

-- Per-card deck override (optional, for routing specific templates to decks)
alter table flashcards
  add column if not exists deck_override uuid references decks(id) on delete set null default null;

-- Per-card CSS snapshot (from note type at generation time)
alter table flashcards
  add column if not exists card_css text default null;

-- ── Index for finding sibling cards efficiently ────────────────────────────
create index if not exists idx_flashcards_sibling_group
  on flashcards(sibling_group) where sibling_group is not null;

-- ── Index for cloze ordinal lookups ────────────────────────────────────────
create index if not exists idx_flashcards_cloze_ordinal
  on flashcards(cloze_ordinal) where cloze_ordinal is not null;

-- ── Update seed_default_note_types to include Image Occlusion ──────────────
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

  -- Basic (and reversed card) — generates both front→back and back→front
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Basic (and reversed)',
    '[{"name":"Front","sticky":false},{"name":"Back","sticky":false}]'::jsonb,
    '[{"name":"Card 1","front_template":"{{Front}}","back_template":"{{FrontSide}}<hr id=answer>{{Back}}"},{"name":"Card 2","front_template":"{{Back}}","back_template":"{{FrontSide}}<hr id=answer>{{Front}}"}]'::jsonb,
    true
  )
  on conflict do nothing;

  -- Cloze — uses {{cloze:Text}} in templates, generates one card per cN ordinal
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Cloze',
    '[{"name":"Text","sticky":false},{"name":"Extra","sticky":false}]'::jsonb,
    '[{"name":"Cloze","front_template":"{{cloze:Text}}","back_template":"{{cloze:Text}}<br>{{Extra}}"}]'::jsonb,
    true
  )
  on conflict do nothing;

  -- Image Occlusion — hides regions on an image for recall testing
  insert into note_types (user_id, name, fields, templates, is_builtin)
  values (
    p_user_id,
    'Image Occlusion',
    '[{"name":"Image","sticky":false},{"name":"Header","sticky":false},{"name":"Extra","sticky":false}]'::jsonb,
    '[{"name":"Occlusion","front_template":"{{#Header}}<div class=\"io-header\">{{Header}}</div>{{/Header}}{{Image}}","back_template":"{{#Header}}<div class=\"io-header\">{{Header}}</div>{{/Header}}{{Image}}{{#Extra}}<br><div class=\"io-extra\">{{Extra}}</div>{{/Extra}}"}]'::jsonb,
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
