-- Setup script for therapist-avatars Supabase Storage bucket
-- Run this in your Supabase SQL Editor

-- Note: Storage buckets are created via the Supabase Dashboard or Storage API
-- This file documents the bucket configuration that should be created

-- Bucket Configuration:
-- Name: therapist-avatars
-- Public: true (or false with signed URLs - adjust based on your security needs)
-- File size limit: 5MB (recommended)
-- Allowed MIME types: image/jpeg, image/png, image/jpg

-- Storage Policies (RLS for Storage):
-- These policies should be created in the Supabase Dashboard under Storage > Policies

-- Policy 1: Therapists can upload their own photos
-- Policy Name: "Therapists can upload their own photos"
-- Policy Definition:
--   (bucket_id = 'therapist-avatars'::text) 
--   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
--   AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))

-- Policy 2: Therapists can update their own photos
-- Policy Name: "Therapists can update their own photos"
-- Policy Definition:
--   (bucket_id = 'therapist-avatars'::text) 
--   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
--   AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))

-- Policy 3: Therapists can delete their own photos
-- Policy Name: "Therapists can delete their own photos"
-- Policy Definition:
--   (bucket_id = 'therapist-avatars'::text) 
--   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))

-- Policy 4: Authenticated users can view therapist photos (for students)
-- Policy Name: "Authenticated users can view therapist photos"
-- Policy Definition:
--   (bucket_id = 'therapist-avatars'::text)

-- Note: The file naming convention is: therapist_<therapist_id>.jpg
-- This ensures one photo per therapist and easy overwriting

