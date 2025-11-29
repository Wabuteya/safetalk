-- Create therapist_availability table for managing available time slots
CREATE TABLE IF NOT EXISTS therapist_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(therapist_id, day_of_week, start_time, end_time)
);

-- Create appointments table for booked sessions
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  student_notes TEXT, -- Notes from student when booking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_therapist_availability_therapist_id ON therapist_availability(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_availability_day ON therapist_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Create a unique constraint to prevent double-booking
-- This ensures no two appointments can have the same therapist, date, and start_time
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot 
ON appointments(therapist_id, appointment_date, start_time) 
WHERE status = 'scheduled';

-- Disable Row Level Security for now (can be enabled later when adding restrictions)
ALTER TABLE therapist_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Therapists can manage their own availability" ON therapist_availability;
DROP POLICY IF EXISTS "Therapists can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Students can view their appointments" ON appointments;
DROP POLICY IF EXISTS "Students can create appointments" ON appointments;

-- Function to update updated_at timestamp for therapist_availability
CREATE OR REPLACE FUNCTION update_therapist_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for therapist_availability
DROP TRIGGER IF EXISTS update_therapist_availability_updated_at ON therapist_availability;
CREATE TRIGGER update_therapist_availability_updated_at
  BEFORE UPDATE ON therapist_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_therapist_availability_updated_at();

-- Function to update updated_at timestamp for appointments
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for appointments
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Note: RLS is disabled for now to ensure a stable working base.
-- To enable RLS later, run:
-- ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies for therapists and students.
