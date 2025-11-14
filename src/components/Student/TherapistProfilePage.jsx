import React from 'react';
import { useParams, Link } from 'react-router-dom';
import './TherapistProfilePage.css';

// We need the same mock data here to find the therapist by ID.
// In a real app, you'd fetch this single therapist's data from an API.
const therapistsData = [
  { id: 1, name: 'Dr. Evelyn Reed', title: 'Clinical Psychologist', specialties: ['Anxiety', 'Depression'], bio: 'Specializing in cognitive-behavioral therapy for students facing academic and social pressures. My approach is collaborative and evidence-based, aiming to empower you with the skills to navigate life\'s challenges.', imageUrl: 'https://via.placeholder.com/150', experience: '8 Years', credentials: 'PhD in Clinical Psychology' },
  { id: 2, name: 'Dr. Samuel Chen', title: 'Licensed Counselor', specialties: ['Relationships', 'Stress Management'], bio: 'Focused on helping students navigate relationship challenges and develop healthy coping mechanisms. I provide a non-judgmental space to explore your thoughts and feelings.', imageUrl: 'https://via.placeholder.com/150', experience: '6 Years', credentials: 'M.A. in Counseling' },
  { id: 3, name: 'Dr. Maria Garcia', title: 'Therapist, PhD', specialties: ['Academic Stress', 'Anxiety'], bio: 'Experienced in mindfulness and stress-reduction techniques to help with exam and performance anxiety. Together, we can build a toolbox of strategies for success.', imageUrl: 'https://via.placeholder.com/150', experience: '10 Years', credentials: 'PhD in Counseling Psychology' },
  { id: 4, name: 'Dr. Ben Carter', title: 'Licensed Social Worker', specialties: ['Family Issues', 'Depression'], bio: 'Providing a supportive space to explore family dynamics and work through feelings of depression. My goal is to help you find strength and resilience.', imageUrl: 'https://via.placeholder.com/150', experience: '7 Years', credentials: 'LCSW, MSW' },
];

const TherapistProfilePage = () => {
  // 1. Get the therapistId from the URL
  const { therapistId } = useParams();

  // 2. Find the correct therapist from our data
  // Note: useParams returns a string, so we convert it to a number
  const therapist = therapistsData.find(t => t.id === Number(therapistId));

  // Handle case where therapist is not found
  if (!therapist) {
    return (
      <div className="profile-not-found">
        <h2>Therapist not found.</h2>
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
        <img src={therapist.imageUrl} alt={therapist.name} className="profile-photo" />
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