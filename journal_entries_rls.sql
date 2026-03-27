-- =============================================================================
-- Row Level Security for public.journal_entries
-- =============================================================================
-- Run in Supabase SQL Editor after journal_entries_schema.sql (and color migration).
--
-- ORDER (PostgreSQL requirement):
--   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
--   2. CREATE POLICY ... (policies cannot be created until RLS is enabled)
--
-- If you enabled RLS with no policies first, clients would see no rows until
-- policies exist — run this whole script in one go (or inside a transaction).
--
-- Depends: therapist_student_relations and crisis_events should remain readable
-- by therapists for the EXISTS subqueries (either RLS off on those tables, or
-- policies added there before tightening journal_entries).
--
-- Service role (Edge Functions) bypasses RLS — analyze-journal-entry unchanged.
-- =============================================================================

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Students manage own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Therapists select shared journals" ON public.journal_entries;
DROP POLICY IF EXISTS "Therapists update shared journals viewed_at" ON public.journal_entries;
DROP POLICY IF EXISTS "Admins select all journal entries" ON public.journal_entries;

-- -----------------------------------------------------------------------------
-- Students: full CRUD on own rows only
-- -----------------------------------------------------------------------------
CREATE POLICY "Students manage own journal entries"
  ON public.journal_entries
  FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Therapists: read shared entries for students on caseload OR crisis handler
-- -----------------------------------------------------------------------------
CREATE POLICY "Therapists select shared journals"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (
    is_shared_with_therapist = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = journal_entries.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Therapists: update therapist_viewed_at (and row metadata) for same rows
-- App only sends therapist_viewed_at; consider an RPC later to lock columns.
-- -----------------------------------------------------------------------------
CREATE POLICY "Therapists update shared journals viewed_at"
  ON public.journal_entries
  FOR UPDATE
  TO authenticated
  USING (
    is_shared_with_therapist = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = journal_entries.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries.student_id
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
          AND t.student_id = journal_entries.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = journal_entries.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Admins: read all (dashboard counts / health page). Adjust if admins differ.
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins select all journal entries"
  ON public.journal_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Optional: grant usage (usually already granted via API)
-- REVOKE ALL ON public.journal_entries FROM PUBLIC;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
-- (Supabase typically grants via API roles — only run if you manage grants manually.)
