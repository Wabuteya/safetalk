import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './TherapistProfilePage.css';

const TherapistProfilePage = () => {
  const { therapistId } = useParams();
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- NEW STATE TO TRACK THE LINK ---
  const [isLinked, setIsLinked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        // 1. Fetch the therapist's public profile
        const { data: profileData, error: profileError } = await supabase
          .from('therapist_profiles')
          .select('*')
          .eq('user_id', therapistId)
          .eq('is_live', true)
          .single();

        if (profileError) {
          console.error("Error fetching therapist:", profileError);
          setError('Therapist not found or not available.');
          setLoading(false);
          return;
        }

        if (!profileData) {
          setError('Therapist not found or not available.');
          setLoading(false);
          return;
        }

        // Map database data to component format
        setTherapist({
          user_id: profileData.user_id,
          full_name: profileData.full_name || 'Therapist',
          title: profileData.title || 'Therapist',
          specialties: Array.isArray(profileData.specialties) 
            ? profileData.specialties 
            : (typeof profileData.specialties === 'string' 
                ? profileData.specialties.split(',').map(s => s.trim()).filter(s => s)
                : []),
          bio: profileData.bio || 'No bio available.',
          image_url: profileData.image_url || null
        });

        // 2. Fetch the current student's user object
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error fetching user:", userError);
          setLoading(false);
          return;
        }

        if (!user) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // 3. Check if a relationship already exists between them
        const { data: relationship, error: relError } = await supabase
          .from('therapist_student_relations')
          .select('*')
          .eq('student_id', user.id)
          .eq('therapist_id', therapistId)
          .maybeSingle();
        
        if (relError && relError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is fine
          console.error("Error checking relationship:", relError);
        }
        
        if (relationship) {
          setIsLinked(true); // If we found a relationship, set state to true
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load therapist profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [therapistId]);

  const handleSelectTherapist = async () => {
    if (currentUser && therapist && !isLinked) {
      try {
        const { error } = await supabase
          .from('therapist_student_relations')
          .insert({ 
            student_id: currentUser.id, 
            therapist_id: therapist.user_id 
          });

        if (error) {
          alert("Error linking with therapist: " + error.message);
        } else {
          // Success! Navigate immediately to the "My Therapist" page
          // The FindTherapistPage will automatically detect the new relationship
          navigate('/student-dashboard/therapists');
        }
      } catch (err) {
        console.error('Error selecting therapist:', err);
        alert("An error occurred while linking with the therapist. Please try again.");
      }
    }
  };
  
  const handleStartChat = () => {
    alert("Navigating to the chat interface... (To be built)");
  };

  const handleBookAppointment = () => {
    if (!isLinked) {
      alert('You must be linked to this therapist to book appointments. Please select this therapist first.');
      return;
    }
    navigate(`/student-dashboard/book-appointment/${therapistId}`);
  };

  if (loading) {
    return (
      <div className="therapist-profile-layout">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !therapist) {
    return (
      <div className="therapist-profile-layout">
        <div className="profile-not-found" style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '0.5rem'
        }}>
          <h2>{error || 'Therapist not found.'}</h2>
          <Link to="/student-dashboard/therapists" style={{ color: '#007BFF' }}>
            Go back to the list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="therapist-profile-layout">
      <Link to="/student-dashboard/therapists" className="back-link">
        &larr; Back
      </Link>
      <div className="profile-header">
        {therapist.image_url && (
          <img 
            src={therapist.image_url} 
            alt={therapist.full_name} 
            className="profile-photo"
            onError={(e) => {
              // Hide image if it fails to load
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="profile-header-info">
          <h1>{therapist.full_name}</h1>
          <p className="profile-title">{therapist.title}</p>
          
          {/* --- NEW DYNAMIC BUTTON LOGIC --- */}
          <div className="profile-actions">
            {isLinked ? (
              <>
                <button className="chat-btn primary" onClick={handleStartChat}>
                  Start Secure Chat
                </button>
                <button className="book-btn" onClick={handleBookAppointment}>
                  Book an Appointment
                </button>
              </>
            ) : (
              <>
                <button className="chat-btn primary" onClick={handleSelectTherapist}>
                  Select this Therapist
                </button>
                <button className="book-btn disabled" disabled>
                  Start Secure Chat
                </button>
              </>
            )}
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
            <li><strong>Specialties:</strong> {therapist.specialties.length > 0 ? therapist.specialties.join(', ') : 'Not specified'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TherapistProfilePage;
