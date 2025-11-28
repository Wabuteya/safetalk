import React, { useState } from 'react';
import './ProfilePage.css';
import PasswordInput from '../PasswordInput';

const ProfilePage = () => {
  // Mock data - in a real app, this would be fetched from the backend
  const [profileData, setProfileData] = useState({
    firstName: 'Alex',
    lastName: 'Doe',
    contact: '123-456-7890',
    gender: 'Male',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };
  
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    // API call to update profile data would go here
    console.log('Updating profile:', profileData);
    alert('Emergency contact information updated successfully.');
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match.');
      return;
    }
    // API call to change password would go here
    console.log('Changing password...');
    alert('Password changed successfully.');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleDeleteAccount = () => {
    const confirmation = window.prompt('To confirm deletion, please type your password:');
    if (confirmation) { // In a real app, you'd verify the password
        console.log('Account deletion initiated...');
        alert('Your account is scheduled for deletion.');
    }
  };


  return (
    <div className="profile-layout">
      <h1>My Profile</h1>

      {/* --- Anonymous Profile Section --- */}
      <div className="profile-section">
        <h2>Your Anonymous Alias</h2>
        <p className="section-description">This is the randomly assigned name that is visible to therapists to protect your privacy. This alias is permanent.</p>
        <div className="alias-display">Anonymous Panda</div>
      </div>

      {/* --- Emergency Contact Information Section --- */}
      <div className="profile-section">
        <h2>Emergency Contact Information</h2>
        <div className="confidential-disclaimer">
          <strong>This information is strictly confidential.</strong> It is only used for emergency purposes and is never visible to therapists.
        </div>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={profileData.firstName} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={profileData.lastName} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label htmlFor="contact">Contact Number</label>
              <input type="tel" id="contact" name="contact" value={profileData.contact} onChange={handleProfileChange} />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={profileData.gender} onChange={handleProfileChange}>
                <option>Male</option>
                <option>Female</option>
              </select>
            </div>
          </div>
          <button type="submit" className="save-btn">Save Contact Info</button>
        </form>
      </div>

      {/* --- Account & Security Section --- */}
      <div className="profile-section">
        <h2>Account & Security</h2>
        <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
                <label>Email Address</label>
                <input type="email" value="alex.doe@university.edu" disabled />
            </div>
            <p className="section-description">Change your password below.</p>
            <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <PasswordInput id="currentPassword" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required/>
            </div>
            <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <PasswordInput id="newPassword" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required/>
            </div>
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <PasswordInput id="confirmPassword" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required/>
            </div>
            <button type="submit" className="save-btn">Change Password</button>
        </form>
      </div>

      {/* --- Danger Zone Section --- */}
      <div className="profile-section danger-zone">
        <h2>Danger Zone</h2>
        <p className="section-description">Permanently delete your account and all associated data, including journals and mood history. This action cannot be undone.</p>
        <button className="delete-btn" onClick={handleDeleteAccount}>Delete My Account</button>
      </div>
    </div>
  );
};

export default ProfilePage;