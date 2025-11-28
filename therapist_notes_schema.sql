-- Create therapist_notes table
CREATE TABLE IF NOT EXISTS therapist_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_therapist_notes_therapist_id ON therapist_notes(therapist_id);
CREATE INDEX IF NOT EXISTS idx_therapist_notes_student_id ON therapist_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_therapist_notes_created_at ON therapist_notes(created_at DESC);

-- Disable Row Level Security for now (can be enabled later when adding restrictions)
ALTER TABLE therapist_notes DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Therapists can view their own notes" ON therapist_notes;
DROP POLICY IF EXISTS "Therapists can create notes for their students" ON therapist_notes;
DROP POLICY IF EXISTS "Therapists can update their own notes" ON therapist_notes;
DROP POLICY IF EXISTS "Therapists can delete their own notes" ON therapist_notes;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_therapist_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_therapist_notes_updated_at ON therapist_notes;
CREATE TRIGGER update_therapist_notes_updated_at
  BEFORE UPDATE ON therapist_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_therapist_notes_updated_at();

-- Note: RLS is disabled for now to ensure a stable working base.
-- To enable RLS later, run:
-- ALTER TABLE therapist_notes ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies for therapists.

