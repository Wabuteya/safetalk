import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
// We can reuse the profile page CSS since the structure is similar
import '../Student/ProfilePage.css';

const TherapistProfilePage = () => {
  const [profileData, setProfileData] = useState({
    full_name: '',
    title: '',
    bio: '',
    image_url: '',
    specialties: '', // This will be a string for the input, but saved as array
  });

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);

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
          setProfileData({
            ...profile,
            specialties: Array.isArray(profile.specialties) 
              ? profile.specialties.join(', ') 
              : profile.specialties || ''
          });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
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
      <div className="profile-layout">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          fontSize: '1.1rem',
          color: '#5b6888'
        }}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      <h1>My Therapist Profile</h1>

      {/* --- Public Profile Information Section --- */}
      <div className="profile-section">
        <h2>Public Profile Information</h2>
        <p className="section-description">This is the information students will see. Once you save, you will be visible in the student directory.</p>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>
            <input 
              type="text" 
              id="full_name" 
              name="full_name" 
              value={profileData.full_name} 
              onChange={handleProfileChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="title">Title / Credentials</label>
            <input 
              type="text" 
              id="title" 
              name="title" 
              value={profileData.title} 
              onChange={handleProfileChange}
              placeholder="e.g., Clinical Psychologist, Licensed Therapist"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="image_url">Photo URL</label>
            <input 
              type="url" 
              id="image_url" 
              name="image_url" 
              value={profileData.image_url} 
              onChange={handleProfileChange}
              placeholder="https://example.com/your-photo.jpg"
            />
            <small>Enter a URL to your professional photo</small>
          </div>
          <div className="form-group">
            <label htmlFor="bio">Biography</label>
            <textarea 
              id="bio" 
              name="bio" 
              rows="5" 
              value={profileData.bio} 
              onChange={handleProfileChange}
              placeholder="Tell students about your approach, experience, and how you can help them..."
              required
            ></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="specialties">Specialties (comma-separated)</label>
            <input 
              type="text" 
              id="specialties" 
              name="specialties" 
              value={profileData.specialties} 
              onChange={handleProfileChange}
              placeholder="e.g., Anxiety, Depression, Stress Management"
            />
            <small>Separate multiple specialties with commas</small>
          </div>
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile & Go Live'}
          </button>
        </form>
      </div>

      {/* --- Account & Security Section --- */}
      <div className="profile-section">
        <h2>Account & Security</h2>
         <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={user?.email || ''} disabled />
        </div>
        {/* The change password form would go here, identical to the student's profile */}
        <button className="save-btn">Change Password</button>
      </div>
    </div>
  );
};

export default TherapistProfilePage;