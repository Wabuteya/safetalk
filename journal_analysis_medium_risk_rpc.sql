-- RPC: Check if student has medium-risk journal (for resource recommendation)
-- Returns boolean only - does NOT expose emotion scores or derived_risk to students.
-- Students can only check themselves (auth.uid() must match p_student_id).
-- Run after journal_analysis_schema.sql

CREATE OR REPLACE FUNCTION has_medium_risk_journal(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Students can only check their own status
  IF auth.uid() IS NULL OR auth.uid() != p_student_id THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM journal_analysis
    WHERE student_id = p_student_id
      AND derived_risk = 'medium'
    LIMIT 1
  );
END;
$$;

COMMENT ON FUNCTION has_medium_risk_journal IS 'Returns true if student has any medium-risk journal entry. Students can only call for themselves. Does not expose analysis data.';

GRANT EXECUTE ON FUNCTION has_medium_risk_journal(UUID) TO authenticated;
