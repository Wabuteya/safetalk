# Appointment Reschedule & Emergency Cancel Setup

## Prerequisites

Run these in order in your Supabase SQL editor:

### 1. Status constraint (if not already applied)

```sql
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
CHECK (status IN (
  'scheduled', 'completed', 'cancelled_by_student', 'cancelled_by_therapist',
  'rescheduled', 'no_show'
));
```

### 2. 24-hour reschedule check function

```sql
CREATE OR REPLACE FUNCTION can_student_reschedule(appointment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    appt_record RECORD;
BEGIN
    SELECT appointment_date, start_time INTO appt_record
    FROM appointments WHERE id = appointment_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF (appt_record.appointment_date + appt_record.start_time)
       <= (NOW() + INTERVAL '24 hours') THEN
        RETURN FALSE;
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 3. Full migration

Run the entire `appointment_reschedule_functions.sql` file. It includes:

- Unique constraint update (includes `rescheduled`)
- `student_reschedule_appointment` RPC
- `therapist_reschedule_appointment` RPC
- `therapist_bulk_cancel_with_count` RPC

## Features Implemented

### Part 1 — Student Reschedule

- Students can reschedule from **Upcoming Appointments** widget on the dashboard
- 24-hour rule enforced server-side via `can_student_reschedule`
- New date/time validated against therapist availability
- UNIQUE constraint prevents double-booking

### Part 2 — Therapist Single Appointment Reschedule

- Therapists can reschedule from the calendar modal (click event → Reschedule)
- No 24-hour restriction
- Same availability validation

### Part 3 — Therapist Emergency Cancellation

- **Emergency cancel** section on the Calendar tab
- Select a date and click "Cancel All for Date"
- Calls `therapist_bulk_cancel_with_count` — returns affected count
- Note: Student notification logic can be added later (e.g. via email or in-app)

### Part 4 — Student Booking View

- When selecting a date, already-booked slots (`scheduled` + `rescheduled`) are excluded
- UNIQUE constraint on backend prevents double-booking
