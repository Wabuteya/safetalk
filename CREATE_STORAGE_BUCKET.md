# Quick Fix: Create Storage Bucket

## The Error
```
StorageApiError: Bucket not found
```

This means the `therapist-avatars` storage bucket doesn't exist yet in Supabase.

## Solution: Create the Bucket

### Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Storage**
   - Click **Storage** in the left sidebar
   - You should see a list of buckets (or an empty list if none exist)

3. **Create New Bucket**
   - Click the **"New bucket"** button (usually top right)
   - Fill in the details:
     - **Name**: `therapist-avatars` (must be exact, no spaces)
     - **Public bucket**: ✅ **Check this box** (makes it easier for students to view photos)
     - **File size limit**: `5242880` (5MB in bytes) - optional but recommended
     - **Allowed MIME types**: Leave empty OR add: `image/jpeg,image/png,image/jpg`

4. **Click "Create bucket"**

5. **Set Up Policies** (Important for security)
   - After creating the bucket, click on it
   - Go to the **"Policies"** tab
   - Click **"New Policy"**

   **Policy 1: Therapists can upload**
   - Name: "Therapists can upload their own photos"
   - Allowed operation: `INSERT`
   - Policy definition:
   ```sql
   (bucket_id = 'therapist-avatars'::text) 
   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
   AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))
   ```

   **Policy 2: Therapists can update**
   - Name: "Therapists can update their own photos"
   - Allowed operation: `UPDATE`
   - Policy definition:
   ```sql
   (bucket_id = 'therapist-avatars'::text) 
   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
   AND (storage.extension(name) = ANY (ARRAY['jpg'::text, 'jpeg'::text, 'png'::text]))
   ```

   **Policy 3: Therapists can delete**
   - Name: "Therapists can delete their own photos"
   - Allowed operation: `DELETE`
   - Policy definition:
   ```sql
   (bucket_id = 'therapist-avatars'::text) 
   AND (name LIKE ('therapist_' || auth.uid()::text || '.%'))
   ```

   **Policy 4: Everyone can view** (if bucket is public, this may not be needed)
   - Name: "Authenticated users can view therapist photos"
   - Allowed operation: `SELECT`
   - Policy definition:
   ```sql
   (bucket_id = 'therapist-avatars'::text)
   ```

### Option 2: Using SQL (Alternative)

If you prefer SQL, you can create the bucket using the Storage API, but the Dashboard method above is easier.

## After Creating the Bucket

1. **Refresh your app** - The upload should now work
2. **Try uploading a photo** - Go to your therapist profile page and upload a test image
3. **Verify it works** - Check that the photo appears after upload

## Troubleshooting

- **Still getting "Bucket not found"?**
  - Double-check the bucket name is exactly `therapist-avatars` (lowercase, with hyphen)
  - Make sure you're in the correct Supabase project
  - Try refreshing the page

- **Permission errors?**
  - Make sure you've set up the RLS policies as shown above
  - Verify the bucket is public OR the SELECT policy is set correctly

- **Upload works but photo doesn't display?**
  - Check that `profile_photo_url` is being saved to the database
  - Verify the URL in the database is correct
  - Check browser console for any image loading errors

