-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  is_shared_with_therapist BOOLEAN NOT NULL DEFAULT false,
  shared_at TIMESTAMPTZ,
  therapist_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_student_id ON journal_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_is_shared ON journal_entries(is_shared_with_therapist);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON journal_entries(created_at DESC);

-- Disable Row Level Security for now (can be enabled later when adding restrictions)
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Students can view their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Students can create their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Students can update their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Students can delete their own journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Therapists can view shared journal entries" ON journal_entries;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entries_updated_at();

-- Function to automatically set shared_at when is_shared_with_therapist is set to true
CREATE OR REPLACE FUNCTION set_journal_entry_shared_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If sharing is being enabled and shared_at is not already set
  IF NEW.is_shared_with_therapist = true AND OLD.is_shared_with_therapist = false AND NEW.shared_at IS NULL THEN
    NEW.shared_at = NOW();
  END IF;
  -- If sharing is being disabled, clear shared_at
  IF NEW.is_shared_with_therapist = false THEN
    NEW.shared_at = NULL;
    NEW.therapist_viewed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set shared_at
DROP TRIGGER IF EXISTS set_journal_entry_shared_at ON journal_entries;
CREATE TRIGGER set_journal_entry_shared_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION set_journal_entry_shared_at();

-- Note: RLS is disabled for now to ensure a stable working base.
-- To enable RLS later, run:
-- ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies for students and therapists.

