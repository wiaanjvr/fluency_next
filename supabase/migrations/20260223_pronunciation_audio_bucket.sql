-- ============================================================================
-- Pronunciation Audio Storage Bucket
-- ============================================================================
-- Public bucket for pre-generated phoneme, minimal-pair and shadowing audio.
-- Unlike lesson-audio / reading-audio (user-scoped), these files are shared
-- content uploaded by admin scripts — no per-user RLS prefix needed.

INSERT INTO storage.buckets (id, name, public)
VALUES ('pronunciation-audio', 'pronunciation-audio', true)
ON CONFLICT (id) DO NOTHING;

-- ── Read policy ────────────────────────────────────────────────────────────
-- Anyone (including unauthenticated learners) may stream pronunciation files.
CREATE POLICY "Pronunciation audio is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pronunciation-audio');

-- ── Write policies (service-role scripts only) ─────────────────────────────
-- Service-role bypasses RLS entirely, so no explicit INSERT/UPDATE/DELETE
-- policy is required for the Python generation script.
-- These "authenticated" policies exist so that future admin UI tools can also
-- upload replacement files from a logged-in admin account.

CREATE POLICY "Authenticated users can upload pronunciation audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pronunciation-audio'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update pronunciation audio"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pronunciation-audio'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete pronunciation audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pronunciation-audio'
    AND auth.role() = 'authenticated'
  );
