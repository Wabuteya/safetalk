-- Mood tracking: optional, student-only, one log per student per 24-hour period (rolling).
-- Mood data is for display/context only: it must NOT trigger alerts, risk classification, or escalation.

CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_logs_student_id ON mood_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_logged_at ON mood_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_student_logged ON mood_logs(student_id, logged_at DESC);

COMMENT ON TABLE mood_logs IS 'Optional student mood logs. One per student per 24h (rolling). Display/context only; never used for alerts, risk, or escalation.';

ALTER TABLE mood_logs DISABLE ROW LEVEL SECURITY;
