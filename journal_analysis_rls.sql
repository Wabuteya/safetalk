-- RLS for journal_analysis: only linked therapists can read
-- Students have NO direct access. Use has_medium_risk_journal RPC for resource recommendation.
-- Service role (Edge Functions) bypasses RLS as expected.
-- Run after journal_analysis_schema.sql

ALTER TABLE journal_analysis ENABLE ROW LEVEL SECURITY;

-- Remove any existing student read policies
DROP POLICY IF EXISTS "Students can read own journal analysis" ON journal_analysis;

-- Linked therapist can read student journal analysis
-- Allow SELECT only if: student is attached to the therapist (therapist_student_relations)
DROP POLICY IF EXISTS "Linked therapist can read student journal analysis" ON journal_analysis;
CREATE POLICY "Linked therapist can read student journal analysis"
  ON journal_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM therapist_student_relations
      WHERE therapist_student_relations.student_id = journal_analysis.student_id
        AND therapist_student_relations.therapist_id = auth.uid()
    )
  );
