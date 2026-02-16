-- Crisis acknowledgement timer: 5-minute window, escalation when expired.
-- Run after crisis_events_schema.sql. Supports both 'active' (legacy) and 'triggered' (new) states.

-- Add new columns to crisis_events
ALTER TABLE crisis_events
  ADD COLUMN IF NOT EXISTS acknowledgement_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unacknowledged BOOLEAN DEFAULT false;

-- Extend status check to include triggered and escalated (keep backward compat)
ALTER TABLE crisis_events DROP CONSTRAINT IF EXISTS crisis_events_status_check;
ALTER TABLE crisis_events ADD CONSTRAINT crisis_events_status_check
  CHECK (status IN ('active', 'triggered', 'acknowledged', 'in_progress', 'escalated', 'resolved'));

-- State transitions log (all transitions with timestamps)
CREATE TABLE IF NOT EXISTS crisis_state_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_state_log_crisis_event_id ON crisis_state_log(crisis_event_id);
CREATE INDEX IF NOT EXISTS idx_crisis_state_log_created_at ON crisis_state_log(created_at DESC);

-- Trigger: log status changes on crisis_events
CREATE OR REPLACE FUNCTION log_crisis_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO crisis_state_log (crisis_event_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_crisis_state_transition ON crisis_events;
CREATE TRIGGER log_crisis_state_transition
  AFTER UPDATE ON crisis_events
  FOR EACH ROW
  EXECUTE FUNCTION log_crisis_state_transition();

-- Also log initial trigger (INSERT)
CREATE OR REPLACE FUNCTION log_crisis_state_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crisis_state_log (crisis_event_id, from_status, to_status)
  VALUES (NEW.id, NULL, NEW.status);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_crisis_state_on_insert ON crisis_events;
CREATE TRIGGER log_crisis_state_on_insert
  AFTER INSERT ON crisis_events
  FOR EACH ROW
  EXECUTE FUNCTION log_crisis_state_on_insert();

COMMENT ON COLUMN crisis_events.acknowledgement_due_at IS '5 minutes after triggered_at. If not acknowledged before this, status becomes escalated.';
COMMENT ON COLUMN crisis_events.escalated_at IS 'When the crisis was auto-escalated due to timer expiry.';
COMMENT ON COLUMN crisis_events.unacknowledged IS 'True when crisis escalated without therapist acknowledgement.';
