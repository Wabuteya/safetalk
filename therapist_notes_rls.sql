-- =============================================================================
-- Row Level Security for public.therapist_notes
-- =============================================================================
-- Run in Supabase SQL Editor (or migration) after therapist_notes_schema.sql.
--
-- Apply ENABLE + all policies in one session/transaction so clients never see
-- a window with RLS on and zero policies.
--
-- App behavior:
--   - TherapistNotes / Caseload: filter by therapist_id = current user.
--   - Inserts use student_id from the open student detail (caseload or crisis).
-- Crisis-only access (no therapist_student_relations row) must still allow
-- INSERT for students with an active crisis handled by this user (same pattern
-- as journal_entries).
--
-- INSERT is restricted to caseload or active crisis student so therapists cannot
-- attach notes to arbitrary user IDs while still passing therapist_id = self.
--
-- Students and admins do not query this table in the app; no policies for them.
-- Service role bypasses RLS.
-- =============================================================================

ALTER TABLE public.therapist_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Therapists manage own notes" ON public.therapist_notes;
DROP POLICY IF EXISTS "Therapists select update delete own notes" ON public.therapist_notes;
DROP POLICY IF EXISTS "Therapists select own notes" ON public.therapist_notes;
DROP POLICY IF EXISTS "Therapists update own notes" ON public.therapist_notes;
DROP POLICY IF EXISTS "Therapists delete own notes" ON public.therapist_notes;
DROP POLICY IF EXISTS "Therapists insert notes for caseload or crisis student" ON public.therapist_notes;

CREATE POLICY "Therapists select own notes"
  ON public.therapist_notes
  FOR SELECT
  TO authenticated
  USING (therapist_id = auth.uid());

CREATE POLICY "Therapists insert notes for caseload or crisis student"
  ON public.therapist_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    therapist_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.therapist_student_relations t
        WHERE t.therapist_id = auth.uid()
          AND t.student_id = therapist_notes.student_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.crisis_events c
        WHERE c.student_id = therapist_notes.student_id
          AND c.handled_by_id = auth.uid()
          AND c.status IS DISTINCT FROM 'resolved'
      )
    )
  );

CREATE POLICY "Therapists update own notes"
  ON public.therapist_notes
  FOR UPDATE
  TO authenticated
  USING (therapist_id = auth.uid())
  WITH CHECK (therapist_id = auth.uid());

CREATE POLICY "Therapists delete own notes"
  ON public.therapist_notes
  FOR DELETE
  TO authenticated
  USING (therapist_id = auth.uid());
