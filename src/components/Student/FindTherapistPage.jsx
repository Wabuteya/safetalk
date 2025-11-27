import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TherapistCard from './TherapistCard.jsx';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './FindTherapistPage.css';
import '../Therapist/StatusSelector.css'; // Import for status dot colors

const FindTherapistPage = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser(); // Use cached user from context
  const [activeFilter, setActiveFilter] = useState('All');
  const [allTherapists, setAllTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- NEW STATE ---
  const [linkedTherapist, setLinkedTherapist] = useState(null);
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [changeCustomReason, setChangeCustomReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchData = useCallback(async () => {
    // Don't wait for userLoading - if user exists, fetch immediately
    if (!user) {
      // If userLoading is false and no user, show error
      if (!userLoading) {
        setLoading(false);
        setError('Please log in to view therapists.');
      }
      return;
    }

    setLoading(true);
    setError('');
    
    try {

        // Step 1: Check if this student has a relationship
        const { data: relationship, error: relError } = await supabase
          .from('therapist_student_relations')
          .select('therapist_id')
          .eq('student_id', user.id)
          .maybeSingle();

        if (relError && relError.code !== 'PGRST116') {
          console.error("Error checking relationship:", relError);
        }

        if (relationship && relationship.therapist_id) {
          // Step 2: If a link exists, fetch THAT therapist's profile
          const { data: therapistProfile, error: profileError } = await supabase
            .from('therapist_profiles')
            .select('user_id, full_name, title, specialties, bio, image_url, status') // Only select needed fields
            .eq('user_id', relationship.therapist_id)
            .eq('is_live', true)
            .single();
          
          if (profileError) {
            console.error("Error fetching linked therapist:", profileError);
            // If linked therapist profile not found, fall through to show all therapists
          } else if (therapistProfile) {
            // Format the data for the TherapistCard
            const formattedTherapist = {
              id: therapistProfile.user_id,
              name: therapistProfile.full_name || 'Therapist',
              title: therapistProfile.title || 'Therapist',
              specialties: Array.isArray(therapistProfile.specialties) 
                ? therapistProfile.specialties 
                : (typeof therapistProfile.specialties === 'string' 
                    ? therapistProfile.specialties.split(',').map(s => s.trim()).filter(s => s)
                    : []),
              bio: therapistProfile.bio || 'No bio available.',
              imageUrl: therapistProfile.image_url || '',
              status: therapistProfile.status || 'offline'
            };
            setLinkedTherapist(formattedTherapist);
            setLoading(false);
            return; // Exit early - we found the linked therapist
          }
        }

        // Step 3: If no link exists, or linked therapist not found, fetch ALL therapists
        // Use parallel query if we also need to check relationships
        const { data: allProfiles, error: allError } = await supabase
          .from('therapist_profiles')
          .select('user_id, full_name, title, specialties, bio, image_url') // Only select needed fields
          .eq('is_live', true)
          .order('full_name', { ascending: true });

        if (allError) {
          console.error('Error fetching all therapists:', allError);
          setError('Failed to load therapists. Please try again later.');
        } else {
          const formattedData = (allProfiles || []).map(profile => ({
            id: profile.user_id,
            name: profile.full_name || 'Therapist',
            title: profile.title || 'Therapist',
            specialties: Array.isArray(profile.specialties) 
              ? profile.specialties 
              : (typeof profile.specialties === 'string' 
                  ? profile.specialties.split(',').map(s => s.trim()).filter(s => s)
                  : []),
            bio: profile.bio || 'No bio available.',
            imageUrl: profile.image_url || ''
          }));
          setAllTherapists(formattedData);
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load therapist information. Please try again later.');
      } finally {
        setLoading(false);
      }
  }, [user, userLoading]);

  useEffect(() => {
    // Only fetch when user context has finished loading
    if (!userLoading) {
      fetchData();
    }
  }, [fetchData, userLoading]);

  // Generate specialty filters from actual therapist data
  const allSpecialties = useMemo(() => {
    const specialtySet = new Set(['All']);
    allTherapists.forEach(therapist => {
      therapist.specialties.forEach(specialty => {
        if (specialty) specialtySet.add(specialty);
      });
    });
    return Array.from(specialtySet).sort();
  }, [allTherapists]);

  const filteredTherapists = useMemo(() => {
    if (activeFilter === 'All') return allTherapists;
    return allTherapists.filter(t => t.specialties.includes(activeFilter));
  }, [activeFilter, allTherapists]);
  
  // --- RENDER LOGIC ---

  // Show loading only if we're actually fetching, not waiting for userLoading
  if (loading && user) {
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
  
  // If no user and not loading, show error
  if (!user && !userLoading) {
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
          <p>Please log in to view therapists.</p>
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
            onClick={() => window.location.reload()}
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

  const handleRequestTherapistChange = () => {
    setShowChangeRequestModal(true);
  };

  const handleCloseModal = () => {
    setShowChangeRequestModal(false);
    setChangeReason('');
    setChangeCustomReason('');
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeReason) {
      alert('Please select a reason for requesting a therapist change.');
      return;
    }

    if (changeReason === 'Other' && !changeCustomReason.trim()) {
      alert('Please provide details for your reason.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please log in to submit a request.');
        setSubmittingRequest(false);
        return;
      }

      // Store the change request in the database
      // Only provide required fields - let database handle defaults for status and requested_at
      const reasonText = changeReason === 'Other' ? changeCustomReason.trim() : changeReason;
      
      // Validate UUIDs before inserting
      if (!user.id || !linkedTherapist.id) {
        alert('Error: Missing required information. Please refresh the page and try again.');
        setSubmittingRequest(false);
        return;
      }

      const { data, error } = await supabase
        .from('therapist_change_requests')
        .insert({
          student_id: user.id,
          current_therapist_id: linkedTherapist.id,
          reason: reasonText
          // status and requested_at have defaults in the schema, so we don't need to provide them
        })
        .select(); // Return the inserted data for verification

      if (error) {
        console.error('Error submitting request:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        alert(`Error submitting request: ${error.message || 'Unknown error'}\n\nPlease try again or contact support if the issue persists.`);
        setSubmittingRequest(false);
        return;
      }

      if (!data || data.length === 0) {
        console.error('No data returned from insert');
        alert('Request submitted but could not verify. Please contact support to confirm.');
        setSubmittingRequest(false);
        return;
      }

      // Success - show confirmation
      alert('✅ Your therapist change request has been submitted successfully!\n\nAn admin will review your request and contact you soon. You can check the status in your profile.');
      
      // Close modal and reset form
      handleCloseModal();
    } catch (err) {
      console.error('Error submitting change request:', err);
      alert('An error occurred while submitting your request. Please try again or contact support.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  // If the user has a linked therapist, show the "My Therapist" view (NO browsing allowed)
  if (linkedTherapist) {
    const handleStartChat = () => {
      alert(`Starting secure chat with ${linkedTherapist.name}...\n(This feature will be implemented soon)`);
    };

    const handleBookAppointment = () => {
      // Navigate to booking page
      navigate(`/student-dashboard/book-appointment/${linkedTherapist.id}`);
    };

    return (
      <div className="my-therapist-profile-layout">
        <div className="my-therapist-header">
          <h1>My Therapist</h1>
          <button 
            onClick={handleRequestTherapistChange} 
            className="request-change-btn"
          >
            Request Therapist Change
          </button>
        </div>

        <div className="profile-header">
          {linkedTherapist.imageUrl ? (
            <img 
              src={linkedTherapist.imageUrl} 
              alt={linkedTherapist.name} 
              className="profile-photo"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div className="profile-photo-placeholder">
              <span className="photo-placeholder-icon">👤</span>
            </div>
          )}
          
          <div className="profile-header-info">
            <h2>{linkedTherapist.name}</h2>
            <p className="profile-title">{linkedTherapist.title}</p>
            
            {/* Status Display */}
            {linkedTherapist.status && (
              <div className="therapist-status-display">
                <span className={`status-dot ${linkedTherapist.status}`}></span>
                <span className="status-text">
                  {linkedTherapist.status === 'online' 
                    ? 'Online - Available now' 
                    : linkedTherapist.status === 'away' 
                    ? 'Away - Will respond soon'
                    : 'Offline - Will respond when available'}
                </span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="profile-actions">
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
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-card">
            <h3>About Me</h3>
            <p>{linkedTherapist.bio}</p>
          </div>
          <div className="detail-card">
            <h3>Details</h3>
            <ul>
              <li><strong>Specialties:</strong> {linkedTherapist.specialties && linkedTherapist.specialties.length > 0 ? linkedTherapist.specialties.join(', ') : 'Not specified'}</li>
            </ul>
          </div>
        </div>

        {/* Therapist Change Request Modal */}
        {showChangeRequestModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Request Therapist Change</h2>
                <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="warning-message">
                  <strong>⚠️ Important:</strong> Changing therapists will reset your progress and archive your current chat history. 
                  This action requires admin approval.
                </div>

                <div className="form-group">
                  <label htmlFor="change-reason">Reason for Change *</label>
                  <select
                    id="change-reason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a reason...</option>
                    <option value="Not a good fit">Not a good fit</option>
                    <option value="Therapist inactive">Therapist inactive</option>
                    <option value="Scheduling conflicts">Scheduling conflicts</option>
                    <option value="Need different specialization">Need different specialization</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {changeReason === 'Other' && (
                  <div className="form-group">
                    <label htmlFor="custom-reason">Please specify *</label>
                    <textarea
                      id="custom-reason"
                      value={changeCustomReason}
                      onChange={(e) => setChangeCustomReason(e.target.value)}
                      className="form-textarea"
                      placeholder="Please provide details about why you'd like to change therapists..."
                      rows="4"
                    />
                  </div>
                )}

                <div className="modal-info">
                  <p>Your request will be reviewed by an administrator. You'll be notified once a decision is made.</p>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  className="modal-btn cancel-btn" 
                  onClick={handleCloseModal}
                  disabled={submittingRequest}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn submit-btn" 
                  onClick={handleSubmitChangeRequest}
                  disabled={submittingRequest || !changeReason || (changeReason === 'Other' && !changeCustomReason)}
                >
                  {submittingRequest ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, show the full directory (only for students without a linked therapist)
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
