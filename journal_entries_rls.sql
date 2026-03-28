-- =============================================================================
-- Row Level Security for public.journal_entries_enc
-- =============================================================================
-- If you have NOT run the encrypt-at-rest migration yet, the table is still named
-- journal_entries: replace every journal_entries_enc below with journal_entries.
--
-- Applies to the physical table that stores journal rows (ciphertext in content).
-- Clients use the decrypted VIEW public.journal_entries; PostgREST enforces RLS
-- on the underlying table when the view uses security_invoker (PG15+).
--
-- Run after journal_entries_schema (and color migration) and, if you use at-rest
-- encryption, after supabase/migrations/*_journal_entries_encrypt_at_rest.sql.
--
-- ORDER: ENABLE ROW LEVEL SECURITY first, then CREATE POLICY in the same session.
--
-- Admin policy uses app_metadata.role (not user_metadata). Set per admin in Dashboard:
-- Authentication → Users → App Metadata: { "role": "admin" }.
--
-- Depends: therapist_student_relations and crisis_events readable by therapists for EXISTS.
-- Service role (Edge Functions) bypasses RLS.
-- =============================================================================

ALTER TABLE public.journal_entries_enc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage own journal entries" ON public.journal_entries_enc;
DROP POLICY IF EXISTS "Therapists select shared journals" ON public.journal_entries_enc;
DROP POLICY IF EXISTS "Therapists update shared journals viewed_at" ON public.journal_entries_enc;
DROP POLICY IF EXISTS "Admins select all journal entries" ON public.journal_entries_enc;

CREATE POLICY "Students manage own journal entries"
  ON public.journal_entries_enc
  FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Therapists select shared journals"
  ON public.journal_entries_enc
  FOR SELECT
  TO authenticated
  USING (
    is_shared_with_therapist = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = journal_entries_enc.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries_enc.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  );

CREATE POLICY "Therapists update shared journals viewed_at"
  ON public.journal_entries_enc
  FOR UPDATE
  TO authenticated
  USING (
    is_shared_with_therapist = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = journal_entries_enc.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries_enc.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  )
  WITH CHECK (
    is_shared_with_therapist = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = journal_entries_enc.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries_enc.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  );

CREATE POLICY "Admins select all journal entries"
  ON public.journal_entries_enc
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
