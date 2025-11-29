-- Create student_profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  contact TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_alias ON student_profiles(alias);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);

-- Disable Row Level Security for now (can be enabled later when adding restrictions)
ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Students can view their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Students can update their own profile" ON student_profiles;
DROP POLICY IF EXISTS "Therapists can view their students' profiles" ON student_profiles;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_student_profiles_updated_at();

-- Note: RLS is disabled for now to ensure a stable working base.
-- To enable RLS later, run:
-- ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies for students and therapists.

