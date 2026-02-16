-- On-call therapist fallback for crisis alerts.
-- When primary is away/offline or crisis escalates, route to on-call pool.
-- First on-call therapist to acknowledge becomes handler. Audit log all routing/handling.
-- Do not expose fallback or availability to students (handled in app only).

-- On-call pool: list of therapist user_ids who can receive fallback crises
CREATE TABLE IF NOT EXISTS on_call_pool (
  therapist_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_on_call_pool_added_at ON on_call_pool(added_at);

COMMENT ON TABLE on_call_pool IS 'Therapists who receive escalated/unavailable-primary crisis alerts. Internal only.';

-- Crisis events: add handler and on-call routing
ALTER TABLE crisis_events
  ADD COLUMN IF NOT EXISTS handled_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routed_to_on_call_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_crisis_events_handled_by_id ON crisis_events(handled_by_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_routed_to_on_call_at ON crisis_events(routed_to_on_call_at) WHERE routed_to_on_call_at IS NOT NULL;

COMMENT ON COLUMN crisis_events.handled_by_id IS 'Therapist currently handling (set when they acknowledge). Null until acknowledged.';
COMMENT ON COLUMN crisis_events.routed_to_on_call_at IS 'When crisis was offered to on-call pool (primary unavailable or escalated).';

-- Audit log for routing, acknowledgements, handler changes
CREATE TABLE IF NOT EXISTS crisis_routing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_event_id UUID NOT NULL REFERENCES crisis_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  therapist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_routing_log_crisis_event_id ON crisis_routing_log(crisis_event_id);
CREATE INDEX IF NOT EXISTS idx_crisis_routing_log_created_at ON crisis_routing_log(created_at DESC);

COMMENT ON TABLE crisis_routing_log IS 'Audit log: routing to primary/on-call, acknowledgements, handler changes.';

ALTER TABLE on_call_pool DISABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_routing_log DISABLE ROW LEVEL SECURITY;
