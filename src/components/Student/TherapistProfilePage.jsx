import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './TherapistProfilePage.css';

const TherapistProfilePage = () => {
  const { therapistId } = useParams();
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTherapist();
  }, [therapistId]);

  const fetchTherapist = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch therapist by user_id (UUID)
      const { data, error: fetchError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', therapistId)
        .eq('is_live', true)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        // Map database data to component format
        setTherapist({
          id: data.user_id,
          name: data.full_name || 'Therapist',
          title: data.title || 'Therapist',
          specialties: Array.isArray(data.specialties) 
            ? data.specialties 
            : (typeof data.specialties === 'string' 
                ? data.specialties.split(',').map(s => s.trim()).filter(s => s)
                : []),
          bio: data.bio || 'No bio available.',
          imageUrl: data.image_url || null, // null if no image
          experience: 'Not specified', // Not in database schema yet
          credentials: data.title || 'Licensed Therapist'
        });
      } else {
        setError('Therapist not found or not available.');
      }
    } catch (err) {
      console.error('Error fetching therapist:', err);
      setError('Failed to load therapist profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="therapist-profile-layout">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading therapist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !therapist) {
    return (
      <div className="profile-not-found">
        <h2>{error || 'Therapist not found.'}</h2>
        <Link to="/student-dashboard/therapists">Go back to the list</Link>
      </div>
    );
  }

  const handleStartChat = () => {
      alert(`Initiating a secure chat with ${therapist.name}... \n(This will be connected to the real-time chat backend)`);
  };

  const handleBookAppointment = () => {
      alert(`Navigating to the appointment booking system for ${therapist.name}... \n(This will be a future feature)`);
  };

  return (
    <div className="therapist-profile-layout">
      <Link to="/student-dashboard/therapists" className="back-link">
        &larr; Back to All Therapists
      </Link>
      <div className="profile-header">
        {therapist.imageUrl && (
          <img 
            src={therapist.imageUrl} 
            alt={therapist.name} 
            className="profile-photo"
            onError={(e) => {
              // Hide image if it fails to load
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="profile-header-info">
          <h1>{therapist.name}</h1>
          <p className="profile-title">{therapist.title}</p>
          <div className="profile-actions">
            <button className="chat-btn" onClick={handleStartChat}>Initiate Secure Chat</button>
            <button className="book-btn" onClick={handleBookAppointment}>Book an Appointment</button>
          </div>
        </div>
      </div>
      <div className="profile-details">
        <div className="detail-card">
          <h3>About Me</h3>
          <p>{therapist.bio}</p>
        </div>
        <div className="detail-card">
          <h3>Details</h3>
          <ul>
            <li><strong>Specialties:</strong> {therapist.specialties.join(', ')}</li>
            <li><strong>Experience:</strong> {therapist.experience}</li>
            <li><strong>Credentials:</strong> {therapist.credentials}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TherapistProfilePage;