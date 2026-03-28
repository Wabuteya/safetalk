-- Row Level Security for public.journal_recommendations
-- Students see links for their own journals (drives Resources "Recommended" from analysis).
-- Therapists/admins do not need direct table access for current UI.
-- Service role (Edge Function inserts) bypasses RLS.

ALTER TABLE public.journal_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students select own journal recommendations" ON public.journal_recommendations;

CREATE POLICY "Students select own journal recommendations"
  ON public.journal_recommendations
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());
