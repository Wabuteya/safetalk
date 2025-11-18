import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import TherapistCard from './TherapistCard.jsx';
import './FindTherapistPage.css';

const FindTherapistPage = () => {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  // Fetch therapists from database
  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch only therapists that are live (is_live = true)
      const { data, error: fetchError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('is_live', true)
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

      // Map database data to component format
      const mappedTherapists = (data || []).map(profile => ({
        id: profile.user_id, // Use user_id as the id
        name: profile.full_name || 'Therapist',
        title: profile.title || 'Therapist',
        specialties: Array.isArray(profile.specialties) 
          ? profile.specialties 
          : (typeof profile.specialties === 'string' 
              ? profile.specialties.split(',').map(s => s.trim()).filter(s => s)
              : []),
        bio: profile.bio || 'No bio available.',
        imageUrl: profile.image_url || '' // Empty string - will be handled by onError
      }));

      setTherapists(mappedTherapists);
    } catch (err) {
      console.error('Error fetching therapists:', err);
      setError('Failed to load therapists. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Generate specialty filters from actual therapist data
  const allSpecialties = useMemo(() => {
    const specialtySet = new Set(['All']);
    therapists.forEach(therapist => {
      therapist.specialties.forEach(specialty => {
        if (specialty) specialtySet.add(specialty);
      });
    });
    return Array.from(specialtySet).sort();
  }, [therapists]);

  const filteredTherapists = useMemo(() => {
    if (activeFilter === 'All') {
      return therapists;
    }
    return therapists.filter(therapist =>
      therapist.specialties.includes(activeFilter)
    );
  }, [therapists, activeFilter]);

  if (loading) {
    return (
      <div className="find-therapist-layout">
        <div className="page-header">
          <h1>Find a Therapist</h1>
          <p>Browse our university's certified therapists and find the right one for you.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading therapists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="find-therapist-layout">
        <div className="page-header">
          <h1>Find a Therapist</h1>
          <p>Browse our university's certified therapists and find the right one for you.</p>
        </div>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '0.5rem',
          margin: '2rem 0'
        }}>
          <p>{error}</p>
          <button 
            onClick={fetchTherapists}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="find-therapist-layout">
      <div className="page-header">
        <h1>Find a Therapist</h1>
        <p>Browse our university's certified therapists and find the right one for you.</p>
      </div>

      {allSpecialties.length > 1 && (
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
      )}

      {filteredTherapists.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          color: '#666'
        }}>
          <p>
            {activeFilter === 'All' 
              ? 'No therapists available at the moment. Please check back later.'
              : `No therapists found with the specialty "${activeFilter}". Try selecting a different filter.`
            }
          </p>
        </div>
      ) : (
        <div className="therapist-grid">
          {filteredTherapists.map(therapist => (
            <TherapistCard key={therapist.id} therapist={therapist} />
          ))}
        </div>
      )}
    </div>
  );
};

export default FindTherapistPage;