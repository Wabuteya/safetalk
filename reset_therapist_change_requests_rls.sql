-- Reset script: Remove all RLS policies and disable RLS on therapist_change_requests
-- Run this if the table already exists and you want to remove RLS restrictions

-- Drop all existing policies
DROP POLICY IF EXISTS "Students can view their own change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Students can create their own change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Admins can view all change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Admins can update all change requests" ON therapist_change_requests;
DROP POLICY IF EXISTS "Students can insert their own change requests" ON therapist_change_requests;

-- Disable Row Level Security
ALTER TABLE therapist_change_requests DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled (should return 'f' for false)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'therapist_change_requests';

