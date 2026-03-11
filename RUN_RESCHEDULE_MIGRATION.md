# Fix: Reschedule Appointment Error

The error **"Could not find the function public.therapist_reschedule_appointment"** means the database functions for rescheduling haven't been created yet.

## Quick fix

Run these SQL scripts in your **Supabase Dashboard → SQL Editor** in order:

### Step 1: `can_student_reschedule` (required for student reschedule)

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

### Step 2: Full reschedule functions

Copy and run the **entire contents** of `appointment_reschedule_functions.sql` from this project.

Or run it via Supabase CLI:
```bash
supabase db execute -f appointment_reschedule_functions.sql
```

### Step 3: Verify

After running, the following functions should exist:
- `therapist_reschedule_appointment`
- `student_reschedule_appointment`
- `therapist_bulk_cancel_with_count`

You can verify in **Supabase Dashboard → Database → Functions**.

---

**Prerequisites:** Ensure the `appointments` and `therapist_availability` tables exist (from `appointments_schema.sql`).
