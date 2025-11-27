-- Migration script: Create student_profiles for existing students who have aliases in user_metadata
-- Run this after creating the student_profiles table to migrate existing data

INSERT INTO student_profiles (user_id, alias, first_name, last_name, contact, gender)
SELECT 
  u.id AS user_id,
  COALESCE(
    (u.raw_user_meta_data->>'alias')::TEXT,
    'Anonymous Student'
  ) AS alias,
  COALESCE(
    (u.raw_user_meta_data->>'first_name')::TEXT,
    NULL
  ) AS first_name,
  COALESCE(
    (u.raw_user_meta_data->>'last_name')::TEXT,
    NULL
  ) AS last_name,
  COALESCE(
    (u.raw_user_meta_data->>'contact')::TEXT,
    NULL
  ) AS contact,
  COALESCE(
    (u.raw_user_meta_data->>'gender')::TEXT,
    NULL
  ) AS gender
FROM auth.users u
WHERE 
  -- Only students (check role in metadata)
  (u.raw_user_meta_data->>'role' = 'student')
  -- Only if they don't already have a profile
  AND NOT EXISTS (
    SELECT 1 FROM student_profiles sp WHERE sp.user_id = u.id
  )
  -- Only if they have an alias
  AND (u.raw_user_meta_data->>'alias') IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify migration
SELECT 
  COUNT(*) as total_students_migrated,
  COUNT(DISTINCT user_id) as unique_profiles
FROM student_profiles;

