-- Add profile_photo_url column to therapist_profiles table
-- This column stores the Supabase Storage URL for the therapist's profile photo

ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN therapist_profiles.profile_photo_url IS 'URL to therapist profile photo stored in Supabase Storage bucket therapist-avatars';

