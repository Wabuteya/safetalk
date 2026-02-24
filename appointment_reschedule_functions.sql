-- Appointment reschedule and emergency cancel functions
-- Run after: can_student_reschedule(appointment_id), therapist_bulk_cancel(therapist_id, target_date)
-- If you haven't yet, run the status constraint update first:

-- 0. Update status constraint (if not already applied)
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
CHECK (status IN (
  'scheduled', 'completed', 'cancelled_by_student', 'cancelled_by_therapist',
  'rescheduled', 'no_show'
));

-- 1. Update unique constraint to include rescheduled (prevents double-booking)
DROP INDEX IF EXISTS idx_appointments_unique_slot;
CREATE UNIQUE INDEX idx_appointments_unique_slot
ON appointments(therapist_id, appointment_date, start_time)
WHERE status IN ('scheduled', 'rescheduled');

-- 2. Student reschedule: validates 24h rule, availability, then updates
CREATE OR REPLACE FUNCTION student_reschedule_appointment(
    p_appointment_id UUID,
    p_new_date DATE,
    p_new_start_time TIME,
    p_new_end_time TIME
)
RETURNS JSONB AS $$
DECLARE
    appt RECORD;
    avail RECORD;
    day_num INTEGER;
BEGIN
    -- Fetch appointment
    SELECT id, therapist_id, student_id, appointment_date, start_time, end_time, status
    INTO appt
    FROM appointments
    WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found.');
    END IF;

    IF appt.status NOT IN ('scheduled', 'rescheduled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment cannot be rescheduled.');
    END IF;

    -- 24-hour check for students
    IF NOT can_student_reschedule(p_appointment_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rescheduling is not allowed within 24 hours of the session.');
    END IF;

    day_num := EXTRACT(DOW FROM p_new_date)::INTEGER;

    -- Validate against therapist availability
    SELECT id, start_time, end_time INTO avail
    FROM therapist_availability
    WHERE therapist_id = appt.therapist_id
      AND day_of_week = day_num
      AND is_available = true
      AND p_new_start_time >= start_time
      AND p_new_end_time <= end_time
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected time is not within therapist availability.');
    END IF;

    -- Attempt update (unique constraint will catch collisions)
    BEGIN
        UPDATE appointments
        SET appointment_date = p_new_date,
            start_time = p_new_start_time,
            end_time = p_new_end_time,
            status = 'rescheduled',
            updated_at = NOW()
        WHERE id = p_appointment_id;
        RETURN jsonb_build_object('success', true);
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selected time slot is no longer available.');
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Therapist reschedule: no 24h check, same availability validation
CREATE OR REPLACE FUNCTION therapist_reschedule_appointment(
    p_appointment_id UUID,
    p_new_date DATE,
    p_new_start_time TIME,
    p_new_end_time TIME
)
RETURNS JSONB AS $$
DECLARE
    appt RECORD;
    avail RECORD;
    day_num INTEGER;
BEGIN
    SELECT id, therapist_id, student_id, appointment_date, start_time, end_time, status
    INTO appt
    FROM appointments
    WHERE id = p_appointment_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment not found.');
    END IF;

    IF appt.status NOT IN ('scheduled', 'rescheduled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Appointment cannot be rescheduled.');
    END IF;

    day_num := EXTRACT(DOW FROM p_new_date)::INTEGER;

    SELECT id, start_time, end_time INTO avail
    FROM therapist_availability
    WHERE therapist_id = appt.therapist_id
      AND day_of_week = day_num
      AND is_available = true
      AND p_new_start_time >= start_time
      AND p_new_end_time <= end_time
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected time is not within therapist availability.');
    END IF;

    BEGIN
        UPDATE appointments
        SET appointment_date = p_new_date,
            start_time = p_new_start_time,
            end_time = p_new_end_time,
            status = 'rescheduled',
            updated_at = NOW()
        WHERE id = p_appointment_id;
        RETURN jsonb_build_object('success', true);
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selected time slot is no longer available.');
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Therapist bulk cancel wrapper that returns affected count
CREATE OR REPLACE FUNCTION therapist_bulk_cancel_with_count(
    p_therapist_id UUID,
    p_target_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    affected INTEGER;
BEGIN
    WITH updated AS (
        UPDATE appointments
        SET status = 'cancelled_by_therapist',
            updated_at = NOW()
        WHERE therapist_id = p_therapist_id
          AND appointment_date = p_target_date
          AND status = 'scheduled'
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER INTO affected FROM updated;
    RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
