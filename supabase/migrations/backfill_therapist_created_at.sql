-- Backfill therapist_profiles.created_at from auth.users.created_at for rows where it's null
-- Run this once to fix existing therapists showing "—" for Date Added

UPDATE therapist_profiles tp
SET created_at = (
  SELECT created_at::date
  FROM auth.users u
  WHERE u.id = tp.user_id
)
WHERE tp.created_at IS NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = tp.user_id);
