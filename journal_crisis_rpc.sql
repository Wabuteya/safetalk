-- RPC: Create crisis from journal/source (reuses existing routing logic)
-- Called by analyze-journal-entry Edge Function when derived_risk = high
-- Run after crisis_on_call_fallback_schema.sql

CREATE OR REPLACE FUNCTION create_crisis_from_source(
  p_student_id UUID,
  p_source TEXT DEFAULT 'journal_analysis'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_therapist_id UUID;
  v_primary_available BOOLEAN;
  v_triggered_at TIMESTAMPTZ;
  v_due_at TIMESTAMPTZ;
  v_crisis_id UUID;
  v_ack_window_minutes INT := 5;
BEGIN
  SELECT therapist_id INTO v_therapist_id
  FROM therapist_student_relations
  WHERE student_id = p_student_id
  LIMIT 1;

  IF v_therapist_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (status = 'online') INTO v_primary_available
  FROM therapist_profiles
  WHERE user_id = v_therapist_id
  LIMIT 1;
  v_primary_available := COALESCE(v_primary_available, false);

  v_triggered_at := NOW();
  v_due_at := v_triggered_at + (v_ack_window_minutes || ' minutes')::INTERVAL;

  INSERT INTO crisis_events (
    student_id,
    therapist_id,
    status,
    source,
    triggered_at,
    acknowledgement_due_at,
    routed_to_on_call_at
  ) VALUES (
    p_student_id,
    v_therapist_id,
    'triggered',
    p_source,
    v_triggered_at,
    v_due_at,
    CASE WHEN v_primary_available THEN NULL ELSE v_triggered_at END
  )
  RETURNING id INTO v_crisis_id;

  INSERT INTO crisis_routing_log (crisis_event_id, action, therapist_id, details)
  VALUES (
    v_crisis_id,
    'created',
    v_therapist_id,
    CASE WHEN v_primary_available THEN 'routed_to_primary' ELSE 'primary_unavailable' END
  );

  IF NOT v_primary_available THEN
    INSERT INTO crisis_routing_log (crisis_event_id, action, therapist_id, details)
    VALUES (v_crisis_id, 'routed_to_on_call', NULL, 'primary_away_or_offline');
  END IF;

  RETURN v_crisis_id;
END;
$$;

COMMENT ON FUNCTION create_crisis_from_source IS 'Creates crisis event for student using existing routing rules. Used by journal analysis Edge Function.';
