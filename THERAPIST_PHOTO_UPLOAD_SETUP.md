# Therapist Profile Photo Upload Setup Guide

This guide will help you set up the therapist profile photo upload functionality.

## Prerequisites

- Supabase project with Storage enabled
- Admin access to Supabase Dashboard

## Step 1: Database Migration

Run the SQL migration to add the `profile_photo_url` column:

```sql
-- Run this in your Supabase SQL Editor
ALTER TABLE therapist_profiles 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT NULL;
```

Or use the provided file: `therapist_profile_photo_schema.sql`

## Step 2: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `therapist-avatars`
   - **Public bucket**: ✅ Yes (or No if you prefer signed URLs)
   - **File size limit**: 5MB (recommended)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/jpg`

5. Click **Create bucket**

## Step 3: Set Up Storage Policies (RLS)

Go to **Storage** → **Policies** → Select `therapist-avatars` bucket

### Policy 1: Therapists can upload their own photos

- **Policy name**: "Therapists can upload their own photos"
- **Allowed operation**: INSERT
- **Policy definition**:
```sql
(bucket_id = 'therapist-avatars'::text) 
AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))
```

### Policy 2: Therapists can update their own photos

- **Policy name**: "Therapists can update their own photos"
- **Allowed operation**: UPDATE
- **Policy definition**:
```sql
(bucket_id = 'therapist-avatars'::text) 
AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))
```

### Policy 3: Therapists can delete their own photos

- **Policy name**: "Therapists can delete their own photos"
- **Allowed operation**: DELETE
- **Policy definition**:
```sql
(bucket_id = 'therapist-avatars'::text) 
AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
```

### Policy 4: Authenticated users can view therapist photos

- **Policy name**: "Authenticated users can view therapist photos"
- **Allowed operation**: SELECT
- **Policy definition**:
```sql
(bucket_id = 'therapist-avatars'::text)
```

**Note**: If your bucket is public, Policy 4 may not be necessary. If it's private, you'll need this policy for students to view photos.

## Step 4: File Naming Convention

The system uses the following naming convention:
- Format: `therapist_<therapist_id>.jpg` or `therapist_<therapist_id>.png`
- Example: `therapist_123e4567-e89b-12d3-a456-426614174000.jpg`

This ensures:
- One photo per therapist
- Easy overwriting when updating
- Simple file management

## Step 5: Testing

1. Log in as a therapist
2. Navigate to your profile page
3. Click "Choose File" under Profile Photo
4. Select a JPG or PNG image (max 5MB)
5. Click "Upload Photo"
6. Save your profile
7. Verify the photo appears on:
   - Your therapist dashboard
   - Student-facing therapist cards
   - Student therapist profile pages

## Troubleshooting

### Upload fails with "Permission denied"
- Check that Storage policies are correctly configured
- Verify the therapist is authenticated
- Ensure the bucket name matches exactly: `therapist-avatars`

### Photo doesn't display
- Check browser console for errors
- Verify the `profile_photo_url` column was added to the database
- Check that the URL in the database is valid
- Ensure the bucket is public OR policies allow viewing

### File size errors
- Maximum file size is 5MB
- Compress images before uploading if needed
- Use JPG format for smaller file sizes

## Security Notes

- Only authenticated therapists can upload/update their own photos
- Students can only view photos (no upload/delete permissions)
- File validation ensures only JPG/PNG images are accepted
- File size limit prevents abuse

## Implementation Details

### Components Updated
- `TherapistProfilePage.jsx` - Upload interface for therapists
- `TherapistCard.jsx` - Display on student therapist cards
- `TherapistProfilePage.jsx` (Student) - Display on student profile view
- `FindTherapistPage.jsx` - Display in therapist directory
- `TherapistDashboardHome.jsx` - Display on therapist dashboard

### Utilities Created
- `src/utils/imageUpload.js` - Upload and validation functions
- `src/utils/defaultAvatar.jsx` - Default avatar component

### Database Changes
- Added `profile_photo_url` column to `therapist_profiles` table

## Migration from image_url

If you have existing therapists using `image_url`, you can migrate them:

```sql
-- Optional: Copy existing image_url to profile_photo_url for existing records
UPDATE therapist_profiles 
SET profile_photo_url = image_url 
WHERE image_url IS NOT NULL AND profile_photo_url IS NULL;
```

The system will prefer `profile_photo_url` over `image_url` when both exist.

