-- RLS for mood_logs: students manage own data; therapists read-only for attached students only.
-- Run after mood_logs_schema.sql.

ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

-- Students: full access to their own mood logs (select, insert, update)
CREATE POLICY "Students can manage own mood logs"
  ON mood_logs
  FOR ALL
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Therapists: read-only access only for students formally attached via therapist_student_relations
CREATE POLICY "Therapists can view mood for attached students only"
  ON mood_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.therapist_student_relations t
      WHERE t.therapist_id = auth.uid()
        AND t.student_id = mood_logs.student_id
    )
  );
