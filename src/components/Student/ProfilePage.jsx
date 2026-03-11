import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './ProfilePage.css';
import PasswordInput from '../PasswordInput';

const ProfilePage = () => {
  const { user, userProfile } = useUser();
  const [alias, setAlias] = useState('');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    contact: '',
    gender: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const fetchProfile = useCallback(async () => {
    if (!user?.id || user?.user_metadata?.role !== 'student') return;
    setProfileLoading(true);
    setProfileError('');
    const { data, error } = await supabase
      .from('student_profiles')
      .select('alias, first_name, last_name, contact, gender')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      setProfileError('Failed to load profile.');
      setProfileLoading(false);
      return;
    }
    if (data?.alias) {
      setAlias(data.alias);
      localStorage.setItem('userAlias', data.alias);
    }
    setProfileData({
      firstName: data?.first_name || '',
      lastName: data?.last_name || '',
      contact: data?.contact || '',
      gender: data?.gender || '',
    });
    setProfileLoading(false);
  }, [user?.id, user?.user_metadata?.role]);

  useEffect(() => {
    if (userProfile?.alias) setAlias(userProfile.alias);
    fetchProfile();
  }, [user?.id, userProfile?.alias, fetchProfile]);

  useEffect(() => {
    if (!deleteModalOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeDeleteModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteModalOpen]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
    setProfileError('');
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError('');
    setPasswordSuccess(false);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileError('');
    const { error } = await supabase
      .from('student_profiles')
      .update({
        first_name: profileData.firstName || null,
        last_name: profileData.lastName || null,
        contact: profileData.contact || null,
        gender: profileData.gender || null,
      })
      .eq('user_id', user.id);
    setProfileSaving(false);
    if (error) {
      setProfileError('Failed to save. Please try again.');
      return;
    }
    alert('Emergency contact information updated successfully.');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message || 'Failed to update password.');
      return;
    }
    setPasswordSuccess(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const openDeleteModal = () => setDeleteModalOpen(true);
  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setConfirmText('');
  };

  const handleDeleteConfirm = () => {
    if (confirmText !== 'DELETE') return;
    closeDeleteModal();
    alert('To delete your account, please contact support. Account deletion requires verification.');
  };


  return (
    <div className="profile-layout">
      <h1 className="page-title">My Profile</h1>

      {/* --- Anonymous Profile Section --- */}
      <div className="profile-card profile-section">
        <h2 className="section-title">Your Anonymous Alias</h2>
        <p className="section-subtitle">This is the randomly assigned name that is visible to therapists to protect your privacy.</p>
        <div className="alias-box">
          <div className="alias-name">{alias || 'Loading…'}</div>
          <p className="alias-note">🔒 This name is permanent and cannot be changed</p>
        </div>
      </div>

      {/* --- Emergency Contact Information Section --- */}
      <div className="profile-card profile-section">
        <h2 className="section-title">Emergency Contact Information</h2>
        <div className="confidential-notice">
          <strong>This information is strictly confidential.</strong> It is only used for emergency purposes and is never visible to therapists.
        </div>
        {profileError && <div className="profile-error">{profileError}</div>}
        <form onSubmit={handleProfileSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" className="profile-input" value={profileData.firstName} onChange={handleProfileChange} placeholder="First name" disabled={profileLoading} />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" className="profile-input" value={profileData.lastName} onChange={handleProfileChange} placeholder="Last name" disabled={profileLoading} />
            </div>
            <div className="form-group">
              <label htmlFor="contact">Contact Number</label>
              <input type="tel" id="contact" name="contact" className="profile-input" value={profileData.contact} onChange={handleProfileChange} placeholder="Phone number" disabled={profileLoading} />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" className="profile-input" value={profileData.gender} onChange={handleProfileChange} disabled={profileLoading}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          <button type="submit" className="save-btn" disabled={profileLoading || profileSaving}>
            {profileSaving ? 'Saving…' : 'Save Contact Info'}
          </button>
        </form>
      </div>

      {/* --- Account & Security Section --- */}
      <div className="profile-card profile-section">
        <h2 className="section-title">Account & Security</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" className="profile-input" value={user?.email || ''} readOnly />
          </div>
          <p className="section-subtitle">Change your password below.</p>
          {passwordError && <div className="profile-error">{passwordError}</div>}
          {passwordSuccess && <div className="profile-success">Password changed successfully.</div>}
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <PasswordInput id="newPassword" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="At least 8 characters" required />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <PasswordInput id="confirmPassword" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm new password" required />
          </div>
          <button type="submit" className="change-password-btn" disabled={passwordSaving}>
            {passwordSaving ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* --- Danger Zone Section --- */}
      <div className="danger-zone-card profile-section danger-zone">
        <h2 className="danger-title">⚠️ Danger Zone</h2>
        <p className="danger-description">Permanently delete your account and all associated data, including journals and mood history. This action cannot be undone.</p>
        <button type="button" className="delete-btn" onClick={openDeleteModal}>Delete My Account</button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="delete-modal-overlay" onClick={closeDeleteModal} role="presentation">
          <div className="delete-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <h3 id="delete-modal-title">Delete Account</h3>
            <p>Type <strong>DELETE</strong> to confirm permanently deleting your account.</p>
            <input
              type="text"
              className="delete-modal-input profile-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE here"
              autoFocus
            />
            <div className="delete-modal-actions">
              <button type="button" className="delete-modal-cancel" onClick={closeDeleteModal}>Cancel</button>
              <button type="button" className="delete-confirm-btn" disabled={confirmText !== 'DELETE'} onClick={handleDeleteConfirm}>
                Permanently Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;