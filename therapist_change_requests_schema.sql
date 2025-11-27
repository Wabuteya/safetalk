-- Create therapist_change_requests table
CREATE TABLE IF NOT EXISTS therapist_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_therapist_id UUID NOT NULL REFERENCES therapist_profiles(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_therapist_change_requests_student_id ON therapist_change_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_therapist_change_requests_status ON therapist_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_therapist_change_requests_requested_at ON therapist_change_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_therapist_change_requests_current_therapist_id ON therapist_change_requests(current_therapist_id);

-- Disable Row Level Security for now (can be enabled later when adding restrictions)
ALTER TABLE therapist_change_requests DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (in case they exist)
DROP POLICY IF EXISTS "Students can view their own change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Students can create their own change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Admins can view all change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Admins can update all change requests" ON therapist_change_requests;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_therapist_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_therapist_change_requests_updated_at ON therapist_change_requests;
CREATE TRIGGER update_therapist_change_requests_updated_at
  BEFORE UPDATE ON therapist_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_therapist_change_requests_updated_at();

-- Note: RLS is disabled for now to ensure a stable working base.
-- To enable RLS later, run:
-- ALTER TABLE therapist_change_requests ENABLE ROW LEVEL SECURITY;
-- Then add appropriate policies for students and admins.

