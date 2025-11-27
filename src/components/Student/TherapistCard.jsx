import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './FindTherapistPage.css';
import '../Therapist/StatusSelector.css'; // Import status styles

// The component now accepts a new prop: 'showStatus' and 'isMyTherapist'
const TherapistCard = ({ therapist, showStatus = false, isMyTherapist = false }) => {
  const navigate = useNavigate();

  const handleStartChat = () => {
    // Navigate to chat or show alert for now
    alert(`Starting secure chat with ${therapist.name}...\n(This feature will be implemented soon)`);
    // Future: navigate('/student-dashboard/chat');
  };

  const handleBookAppointment = () => {
    // Navigate to appointment booking page
    navigate(`/student-dashboard/book-appointment/${therapist.id}`);
  };

  return (
    <div className={`therapist-card ${isMyTherapist ? 'my-therapist-card' : ''}`}>
      {/* Profile Photo - Always show if available */}
      {therapist.imageUrl ? (
        <img 
          src={therapist.imageUrl} 
          alt={`${therapist.name}`} 
          className="therapist-photo"
          onError={(e) => {
            // Hide image if it fails to load
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div className="therapist-photo-placeholder">
          <span className="photo-placeholder-icon">👤</span>
        </div>
      )}
      
      {/* Status display - Only show if showStatus prop is true */}
      {showStatus && therapist.status && (
        <div className="therapist-status">
          <span className={`status-dot ${therapist.status}`}></span>
          <span className="status-text">{therapist.status}</span>
        </div>
      )}
      
      <h3 className="therapist-name">{therapist.name}</h3>
      <p className="therapist-title">{therapist.title}</p>
      
      {therapist.specialties && therapist.specialties.length > 0 && (
        <div className="specialty-tags">
          {therapist.specialties.map((specialty) => (
            <span key={specialty} className="tag">
              {specialty}
            </span>
          ))}
        </div>
      )}
      
      <p className="therapist-bio">{therapist.bio}</p>
      
      {/* Conditional button rendering */}
      {isMyTherapist ? (
        <div className="therapist-action-buttons">
          <button 
            className="action-btn chat-btn" 
            onClick={handleStartChat}
          >
            💬 Start a Chat
          </button>
          <button 
            className="action-btn appointment-btn" 
            onClick={handleBookAppointment}
          >
            📅 Book Appointment
          </button>
        </div>
      ) : (
        <Link to={`/student-dashboard/therapists/${therapist.id}`} className="view-profile-btn">
          View Profile & Book
        </Link>
      )}
    </div>
  );
};

export default TherapistCard;