import React, { useState, useEffect } from 'react';
import { FaLock } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { uploadTherapistPhoto } from '../../utils/imageUpload';
import { getTherapistPhotoUrl } from '../../utils/defaultAvatar';
import './TherapistProfilePage.css';

const TherapistProfilePage = () => {
  const [profileData, setProfileData] = useState({
    full_name: '',
    title: '',
    bio: '',
    image_url: '',
    profile_photo_url: '',
    specialties: '', // This will be a string for the input, but saved as array
  });

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Fetch the current user and their existing profile data on page load
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile, error } = await supabase
          .from('therapist_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (profile) {
          // If a profile exists, populate the form
          // Ensure all values are strings, not null, to avoid React warnings
          setProfileData({
            full_name: profile.full_name || '',
            title: profile.title || '',
            bio: profile.bio || '',
            image_url: profile.image_url || '',
            profile_photo_url: profile.profile_photo_url || '',
            specialties: Array.isArray(profile.specialties) 
              ? profile.specialties.join(', ') 
              : (profile.specialties || '')
          });
          
          // Set photo preview if profile_photo_url exists
          if (profile.profile_photo_url) {
            setPhotoPreview(profile.profile_photo_url);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !user) {
      alert('Please select a photo to upload');
      return;
    }

    setUploadingPhoto(true);
    try {
      const result = await uploadTherapistPhoto(selectedFile, user.id);
      
      if (result.success) {
        setProfileData({ ...profileData, profile_photo_url: result.url });
        alert('Photo uploaded successfully! Don\'t forget to save your profile.');
        setSelectedFile(null);
      } else {
        alert(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('An error occurred while uploading the photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      // .upsert() will CREATE a new row if one doesn't exist,
      // or UPDATE the existing one. It's perfect for this.
      // We also set is_live to true upon saving.
      const { error } = await supabase
        .from('therapist_profiles')
        .upsert({
          user_id: user.id,
          full_name: profileData.full_name,
          title: profileData.title,
          bio: profileData.bio,
          image_url: profileData.image_url,
          profile_photo_url: profileData.profile_photo_url,
          specialties: profileData.specialties
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0), // Convert string back to array and remove empty strings
          is_live: true, // Make the profile live!
        }, {
          onConflict: 'user_id' // Specify the conflict resolution column
        });

      if (error) throw error;

      alert('Profile saved successfully! You are now visible to students.');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="therapist-profile-layout">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
          fontSize: '1.1rem',
          color: '#6B7280'
        }}>
          Loading profile...
        </div>
      </div>
    );
  }

  const photoDisplayUrl = photoPreview || getTherapistPhotoUrl(profileData.profile_photo_url, profileData.image_url);

  return (
    <div className="therapist-profile-layout">
      <h1 className="page-title">My Therapist Profile</h1>

      {/* --- Public Profile Information Section --- */}
      <div className="profile-card">
        <h2 className="card-title">Public Profile Information</h2>
        <p className="card-subtitle">This is the information students will see. Once you save, you will be visible in the student directory.</p>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label htmlFor="full_name" className="form-label">Full Name</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              className="form-input"
              value={profileData.full_name}
              onChange={handleProfileChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="title" className="form-label">Title / Credentials</label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              value={profileData.title}
              onChange={handleProfileChange}
              placeholder="e.g., Clinical Psychologist, Licensed Therapist"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div className="photo-section">
              {photoDisplayUrl ? (
                <img src={photoDisplayUrl} alt="Profile" className="profile-photo" />
              ) : (
                <div className="profile-photo" style={{ background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '1.5rem' }}>
                  —
                </div>
              )}
              <div className="photo-info">
                <span className="photo-label">{selectedFile ? 'New photo selected' : 'Current photo'}</span>
                <label htmlFor="profile_photo" className="upload-btn" style={{ cursor: uploadingPhoto ? 'not-allowed' : 'pointer' }}>
                  {uploadingPhoto ? 'Uploading...' : 'Choose file'}
                </label>
                <input
                  type="file"
                  id="profile_photo"
                  name="profile_photo"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                />
                {selectedFile && (
                  <button type="button" className="upload-btn" onClick={handlePhotoUpload} disabled={uploadingPhoto}>
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                )}
              </div>
            </div>
            <p className="form-hint">Upload a JPG or PNG image (max 5MB).</p>
            <label htmlFor="image_url" className="form-label" style={{ marginTop: '16px' }}>Photo URL (Alternative)</label>
            <input
              type="url"
              id="image_url"
              name="image_url"
              className="form-input"
              value={profileData.image_url}
              onChange={handleProfileChange}
              placeholder="https://example.com/your-photo.jpg"
            />
            <p className="form-hint">Optional: Enter a URL to an external image.</p>
          </div>
          <div className="form-group">
            <label htmlFor="bio" className="form-label">Biography</label>
            <textarea
              id="bio"
              name="bio"
              className="form-textarea"
              rows={5}
              value={profileData.bio}
              onChange={handleProfileChange}
              placeholder="Tell students about your approach, experience, and how you can help them..."
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="specialties" className="form-label">Specialties (comma-separated)</label>
            <input
              type="text"
              id="specialties"
              name="specialties"
              className="form-input"
              value={profileData.specialties}
              onChange={handleProfileChange}
              placeholder="e.g., Anxiety, Depression, Stress Management"
            />
            <p className="form-hint">Separate multiple specialties with commas.</p>
          </div>
          <button type="submit" className="save-profile-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile & Go Live'}
          </button>
        </form>
      </div>

      {/* --- Account & Security Section --- */}
      <div className="profile-card security-card">
        <h2 className="card-title">Account & Security</h2>
        <p className="card-subtitle">Your account details and security options.</p>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="email-wrapper">
            <input
              type="email"
              className="form-input"
              value={user?.email || ''}
              readOnly
            />
            <span className="lock-icon" aria-hidden="true"><FaLock /></span>
          </div>
        </div>
        <button type="button" className="change-password-btn">Change Password</button>
      </div>
    </div>
  );
};

export default TherapistProfilePage;