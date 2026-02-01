import { supabase } from '../supabaseClient';

const BUCKET_NAME = 'therapist-avatars';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

/**
 * Validates an image file
 * @param {File} file - The file to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageFile = (file) => {
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be a JPG or PNG image' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  return { valid: true };
};

/**
 * Uploads a therapist profile photo to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} therapistId - The therapist's user ID
 * @returns {{ success: boolean, url?: string, error?: string }}
 */
export const uploadTherapistPhoto = async (file, therapistId) => {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Ensure user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to upload photos' };
    }

    // Verify the therapist is uploading their own photo
    if (user.id !== therapistId) {
      return { success: false, error: 'You can only upload your own profile photo' };
    }

    // Determine file extension
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `therapist_${therapistId}.${fileExt === 'jpg' || fileExt === 'jpeg' ? 'jpg' : 'png'}`;
    const filePath = fileName;

    // Check if file already exists and delete it (for overwrite)
    const { data: existingFiles } = await supabase
      .storage
      .from(BUCKET_NAME)
      .list('', {
        search: fileName
      });

    if (existingFiles && existingFiles.length > 0) {
      // Delete existing file
      const { error: deleteError } = await supabase
        .storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (deleteError) {
        console.warn('Error deleting existing file:', deleteError);
        // Continue anyway - upload will overwrite
      }
    }

    // Upload the file
    const { data, error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // This ensures overwrite if file exists
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: uploadError.message || 'Failed to upload image' };
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get image URL' };
    }

    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};


