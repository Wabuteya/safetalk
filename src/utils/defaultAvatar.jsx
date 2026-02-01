import React from 'react';

/**
 * Default professional avatar component
 * Shows a simple, professional-looking avatar when no photo is available
 */
export const DefaultAvatar = ({ size = 120, className = '' }) => {
  const sizeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.4}px`,
    color: '#666',
    border: '2px solid #ddd'
  };

  return (
    <div className={className} style={sizeStyle}>
      <span>👤</span>
    </div>
  );
};

/**
 * Helper function to get the profile photo URL with fallback
 * @param {string} profilePhotoUrl - The profile_photo_url from database
 * @param {string} imageUrl - The image_url from database (legacy)
 * @returns {string|null} The photo URL or null if none available
 */
export const getTherapistPhotoUrl = (profilePhotoUrl, imageUrl = null) => {
  // Prefer profile_photo_url (uploaded photo) over image_url (external URL)
  return profilePhotoUrl || imageUrl || null;
};

