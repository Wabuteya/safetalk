-- Crisis events: one row per crisis. Assigned to the student's linked therapist.
-- Status flow: active -> acknowledged (therapist acknowledges) -> in_progress (optional) -> resolved (explicit only).
-- Privacy: dashboard shows only student alias; no real names or contact info here.

CREATE TABLE IF NOT EXISTS crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'in_progress', 'resolved')),
  source TEXT,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_events_therapist_id ON crisis_events(therapist_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_student_id ON crisis_events(student_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_status ON crisis_events(status);
CREATE INDEX IF NOT EXISTS idx_crisis_events_triggered_at ON crisis_events(triggered_at DESC);

COMMENT ON TABLE crisis_events IS 'Crisis alerts for therapist dashboard. Status: active, acknowledged, in_progress, resolved. Resolution is explicit only.';

ALTER TABLE crisis_events DISABLE ROW LEVEL SECURITY;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_crisis_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_crisis_events_updated_at ON crisis_events;
CREATE TRIGGER update_crisis_events_updated_at
  BEFORE UPDATE ON crisis_events
  FOR EACH ROW
  EXECUTE FUNCTION update_crisis_events_updated_at();
