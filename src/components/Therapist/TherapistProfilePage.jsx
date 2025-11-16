import React, { useState } from 'react';
// We can reuse the profile page CSS since the structure is similar
import '../Student/ProfilePage.css';

const TherapistProfilePage = () => {
  // Mock data for the logged-in therapist
  const [profileData, setProfileData] = useState({
    name: 'Dr. Evelyn Reed',
    title: 'Clinical Psychologist',
    bio: 'Specializing in cognitive-behavioral therapy for students facing academic and social pressures. My approach is collaborative and evidence-based...',
    imageUrl: 'https://via.placeholder.com/150',
    specialties: ['Anxiety', 'Depression'],
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };
  
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    console.log('Updating therapist profile:', profileData);
    alert('Public profile updated successfully.');
  };
  
  // (Password change logic can be reused or copied from ProfilePage.jsx)

  return (
    <div className="profile-layout">
      <h1>My Therapist Profile</h1>

      {/* --- Public Profile Information Section --- */}
      <div className="profile-section">
        <h2>Public Profile Information</h2>
        <p className="section-description">This is the information students will see when browsing for a therapist. Keep it up to date to best represent your practice.</p>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" name="name" value={profileData.name} onChange={handleProfileChange} />
          </div>
          <div className="form-group">
            <label htmlFor="title">Title / Credentials</label>
            <input type="text" id="title" name="title" value={profileData.title} onChange={handleProfileChange} />
          </div>
           <div className="form-group">
            <label htmlFor="imageUrl">Photo URL</label>
            <input type="url" id="imageUrl" name="imageUrl" value={profileData.imageUrl} onChange={handleProfileChange} />
          </div>
          <div className="form-group">
            <label htmlFor="bio">Biography</label>
            <textarea id="bio" name="bio" rows="5" value={profileData.bio} onChange={handleProfileChange}></textarea>
          </div>
          {/* In a real app, a multi-select component would be better for specialties */}
           <div className="form-group">
            <label>Specialties</label>
            <input type="text" value={profileData.specialties.join(', ')} disabled />
            <small>Specialties are managed by the System Administrator.</small>
          </div>
          <button type="submit" className="save-btn">Save Public Profile</button>
        </form>
      </div>

      {/* --- Account & Security Section --- */}
      <div className="profile-section">
        <h2>Account & Security</h2>
         <div className="form-group">
            <label>Email Address</label>
            <input type="email" value="e.reed@university.edu" disabled />
        </div>
        {/* The change password form would go here, identical to the student's profile */}
        <button className="save-btn">Change Password</button>
      </div>
    </div>
  );
};

export default TherapistProfilePage;