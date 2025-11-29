import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import TherapistNotes from './TherapistNotes';
import './StudentDetailView.css';

// Appointments List Component for Student Detail View
const AppointmentsList = ({ studentId, studentAlias, onAppointmentCountChange }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, [studentId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view appointments.');
        setLoading(false);
        return;
      }

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('therapist_id', user.id)
        .eq('student_id', studentId)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);
      
      // Notify parent component of appointment count
      if (onAppointmentCountChange) {
        onAppointmentCountChange(appointmentsData?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(`Failed to load appointments: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(appointmentId);
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
      
      // Update count
      if (onAppointmentCountChange) {
        const newCount = appointments.length - 1;
        onAppointmentCountChange(newCount);
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to delete appointment. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      scheduled: '#28a745',
      completed: '#17a2b8',
      cancelled: '#dc3545',
      no_show: '#ffc107'
    };
    return (
      <span className="status-badge" style={{ backgroundColor: statusColors[status] || '#6c757d' }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return <div className="loading-container">Loading appointments...</div>;
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  const upcoming = appointments.filter(apt => 
    apt.status === 'scheduled' && 
    new Date(apt.appointment_date) >= new Date(new Date().toISOString().split('T')[0])
  );
  const past = appointments.filter(apt => 
    apt.status !== 'scheduled' || 
    new Date(apt.appointment_date) < new Date(new Date().toISOString().split('T')[0])
  );

  return (
    <div className="appointments-list-view">
      <h2>Appointments with {studentAlias || 'Student'}</h2>
      
      {upcoming.length > 0 && (
        <div className="appointments-section">
          <h3>Upcoming Appointments</h3>
          <div className="appointments-grid">
            {upcoming.map(apt => (
              <div key={apt.id} className="appointment-card">
                <div className="appointment-header">
                  <h4>{formatDate(apt.appointment_date)}</h4>
                  {getStatusBadge(apt.status)}
                </div>
                <div className="appointment-details">
                  <p><strong>Time:</strong> {formatTime(apt.start_time)} - {formatTime(apt.end_time)}</p>
                  {apt.student_notes && (
                    <p><strong>Student Notes:</strong> {apt.student_notes}</p>
                  )}
                  {apt.notes && (
                    <p><strong>Therapist Notes:</strong> {apt.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="appointments-section">
          <h3>Past Appointments</h3>
          <div className="appointments-grid">
            {past.map(apt => {
              const isPast = new Date(apt.appointment_date) < new Date(new Date().toISOString().split('T')[0]);
              return (
                <div key={apt.id} className="appointment-card past">
                  <div className="appointment-header">
                    <h4>{formatDate(apt.appointment_date)}</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {getStatusBadge(apt.status)}
                      {isPast && (
                        <button
                          onClick={() => handleDeleteAppointment(apt.id)}
                          disabled={deleting === apt.id}
                          className="delete-appointment-btn"
                          title="Delete appointment"
                        >
                          {deleting === apt.id ? 'Deleting...' : '🗑️'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="appointment-details">
                    <p><strong>Time:</strong> {formatTime(apt.start_time)} - {formatTime(apt.end_time)}</p>
                    {apt.student_notes && (
                      <p><strong>Student Notes:</strong> {apt.student_notes}</p>
                    )}
                    {apt.notes && (
                      <p><strong>Therapist Notes:</strong> {apt.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="empty-state">
          <p>No appointments scheduled yet.</p>
        </div>
      )}
    </div>
  );
};

const StudentDetailView = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [sharedJournals, setSharedJournals] = useState([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudentData = useCallback(async () => {
    if (!user) {
      setError('Please log in to view student details.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

        // Verify relationship and fetch student profile + journals + appointment count + notes count in parallel
        const [relationshipResult, profileResult, journalsResult, appointmentsResult, notesResult] = await Promise.all([
          supabase
            .from('therapist_student_relations')
            .select('therapist_id') // Only need therapist_id for verification
            .eq('therapist_id', user.id)
            .eq('student_id', studentId)
            .single(),
          supabase
            .from('student_profiles')
            .select('user_id, alias') // Only select needed fields
            .eq('user_id', studentId)
            .single(),
          supabase
            .from('journal_entries')
            .select('id, entry_date, content, shared_at, therapist_viewed_at') // Only select needed fields
            .eq('student_id', studentId)
            .eq('is_shared_with_therapist', true)
            .order('entry_date', { ascending: false })
            .order('shared_at', { ascending: false }),
          supabase
            .from('appointments')
            .select('id') // Only need count
            .eq('therapist_id', user.id)
            .eq('student_id', studentId),
          supabase
            .from('therapist_notes')
            .select('id') // Only need count
            .eq('therapist_id', user.id)
            .eq('student_id', studentId)
        ]);

        const { data: relationship, error: relError } = relationshipResult;
        const { data: studentProfile, error: profileError } = profileResult;
        const { data: journals, error: journalsError } = journalsResult;
        const { data: appointments, error: appointmentsError } = appointmentsResult;
        const { data: notes, error: notesError } = notesResult;

        if (relError || !relationship) {
          setError('Student not found in your caseload.');
          setLoading(false);
          return;
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching student profile:', profileError);
        }

        setStudent({
          id: studentId,
          alias: studentProfile?.alias || `Student ${studentId.substring(0, 8)}...`,
          firstName: '',
          lastName: '',
          contact: '',
          gender: '',
          status: 'offline',
          bio: 'No bio available.',
          risks: []
        });

        if (journalsError) {
          console.error('Error fetching journals:', journalsError);
        } else {
          setSharedJournals(journals || []);
        }

        if (appointmentsError) {
          console.error('Error fetching appointment count:', appointmentsError);
        } else {
          setAppointmentCount(appointments?.length || 0);
        }

        if (notesError) {
          console.error('Error fetching note count:', notesError);
        } else {
          setNoteCount(notes?.length || 0);
        }

      } catch (err) {
        console.error('Error fetching student data:', err);
        setError(`Failed to load student data: ${err.message || 'Unknown error'}.`);
      } finally {
        setLoading(false);
      }
  }, [studentId, user]);

  useEffect(() => {
    if (studentId && user) {
      fetchStudentData();
    }
  }, [studentId, user, fetchStudentData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Simple sentiment analysis (basic keyword detection)
  const detectHighRiskSentiment = (content) => {
    const highRiskKeywords = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'hurt myself', 'self harm', 'cutting', 'overdose',
      'hopeless', 'no point', 'give up', 'desperate'
    ];
    const lowerContent = content.toLowerCase();
    return highRiskKeywords.some(keyword => lowerContent.includes(keyword));
  };

  if (loading) {
    return (
      <div className="student-detail-view">
        <div className="loading-container">
          <p>Loading student details...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-detail-view">
        <div className="error-banner">
          {error || 'Student not found'}
        </div>
        <button onClick={() => navigate('/therapist-dashboard/caseload')} className="back-btn">
          ← Back to Caseload
        </button>
      </div>
    );
  }

  return (
    <div className="student-detail-view">
      <div className="detail-header">
        <button onClick={() => navigate('/therapist-dashboard/caseload')} className="back-btn">
          ← Back to Caseload
        </button>
        <h1>{student.alias}</h1>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`tab-btn ${activeTab === 'journals' ? 'active' : ''}`}
          onClick={() => setActiveTab('journals')}
        >
          Journals ({sharedJournals.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments {appointmentCount > 0 && <span className="tab-badge">({appointmentCount})</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Therapist Notes {noteCount > 0 && <span className="tab-badge">({noteCount})</span>}
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="info-card">
              <h3>Student Information</h3>
              <div className="info-row">
                <strong>Alias:</strong> {student.alias}
              </div>
              <div className="info-row">
                <strong>Status:</strong> 
                <span className={`status-badge ${student.status}`}>{student.status}</span>
              </div>
              <div className="privacy-notice">
                <p>🔒 Full student details (name, contact, gender) are hidden for privacy protection.</p>
                <p>Details are only accessible during emergency/crisis situations when immediate intervention is required.</p>
              </div>
            </div>
            <div className="info-card">
              <h3>Bio</h3>
              <p>Bio information is not available to protect student privacy.</p>
            </div>
            <div className="info-card">
              <h3>Risk Indicators</h3>
              {student.risks && student.risks.length > 0 ? (
                <ul>
                  {student.risks.map((risk, index) => (
                    <li key={index}>{risk}</li>
                  ))}
                </ul>
              ) : (
                <p>No risk indicators identified.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-tab">
            <div className="placeholder-content">
              <div className="placeholder-icon">💬</div>
              <h2>Private Messaging</h2>
              <p>Chat functionality will be implemented here.</p>
            </div>
          </div>
        )}

        {activeTab === 'journals' && (
          <div className="journals-tab">
            {sharedJournals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h2>No Shared Journals</h2>
                <p>This student hasn't shared any journal entries yet.</p>
              </div>
            ) : (
              <div className="journals-list">
                {sharedJournals.map((journal) => {
                  const isHighRisk = detectHighRiskSentiment(journal.content);
                  return (
                    <div key={journal.id} className={`journal-entry-card ${isHighRisk ? 'high-risk' : ''}`}>
                      {isHighRisk && (
                        <div className="risk-alert">
                          ⚠️ High-Risk Sentiment Detected
                        </div>
                      )}
                      <div className="journal-header">
                        <div>
                          <h3>Entry from {formatDate(journal.entry_date)}</h3>
                          <p className="journal-meta">
                            Shared: {formatDateTime(journal.shared_at)}
                            {journal.therapist_viewed_at && (
                              <> • Viewed: {formatDateTime(journal.therapist_viewed_at)}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="journal-content">
                        <p>{journal.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="appointments-tab">
            <AppointmentsList 
              studentId={studentId} 
              studentAlias={student?.alias}
              onAppointmentCountChange={setAppointmentCount}
            />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-tab">
            <TherapistNotes 
              studentId={studentId} 
              studentAlias={student?.alias}
              onNoteCountChange={setNoteCount}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailView;

