import React, { useState, useMemo } from 'react';
import TherapistCard from './TherapistCard.jsx';
import './FindTherapistPage.css';

// MOCK DATA: In a real app, this comes from an API
const therapistsData = [
  { id: 1, name: 'Dr. Evelyn Reed', title: 'Clinical Psychologist', specialties: ['Anxiety', 'Depression'], bio: 'Specializing in cognitive-behavioral therapy for students facing academic and social pressures.', imageUrl: 'https://via.placeholder.com/150' },
  { id: 2, name: 'Dr. Samuel Chen', title: 'Licensed Counselor', specialties: ['Relationships', 'Stress Management'], bio: 'Focused on helping students navigate relationship challenges and develop healthy coping mechanisms.', imageUrl: 'https://via.placeholder.com/150' },
  { id: 3, name: 'Dr. Maria Garcia', title: 'Therapist, PhD', specialties: ['Academic Stress', 'Anxiety'], bio: 'Experienced in mindfulness and stress-reduction techniques to help with exam and performance anxiety.', imageUrl: 'https://via.placeholder.com/150' },
  { id: 4, name: 'Dr. Ben Carter', title: 'Licensed Social Worker', specialties: ['Family Issues', 'Depression'], bio: 'Providing a supportive space to explore family dynamics and work through feelings of depression.', imageUrl: 'https://via.placeholder.com/150' },
];

const allSpecialties = ['All', 'Anxiety', 'Depression', 'Relationships', 'Stress Management', 'Academic Stress', 'Family Issues'];

const FindTherapistPage = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredTherapists = useMemo(() => {
    if (activeFilter === 'All') {
      return therapistsData;
    }
    return therapistsData.filter(therapist =>
      therapist.specialties.includes(activeFilter)
    );
  }, [activeFilter]);

  return (
    <div className="find-therapist-layout">
      <div className="page-header">
        <h1>Find a Therapist</h1>
        <p>Browse our university's certified therapists and find the right one for you.</p>
      </div>

      <div className="filter-bar">
        {allSpecialties.map(specialty => (
          <button
            key={specialty}
            className={`filter-btn ${activeFilter === specialty ? 'active' : ''}`}
            onClick={() => setActiveFilter(specialty)}
          >
            {specialty}
          </button>
        ))}
      </div>

      <div className="therapist-grid">
        {filteredTherapists.map(therapist => (
          <TherapistCard key={therapist.id} therapist={therapist} />
        ))}
      </div>
    </div>
  );
};

export default FindTherapistPage;