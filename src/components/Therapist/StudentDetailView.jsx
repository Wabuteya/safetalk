import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { getMoodHistory, MOOD_OPTIONS, MOOD_VALUES, groupMoodEntriesByDate } from '../../utils/moodTracking';
import { isHandlingActiveCrisisForStudent } from '../../utils/crisisEvents';
import TherapistNotes from './TherapistNotes';
import EmotionalTrends from './EmotionalTrends';
import ChatScreen from '../Chat/ChatScreen';
import './StudentDetailView.css';

const moodLabel = (value) => MOOD_OPTIONS.find((o) => o.value === value)?.label || value;

const MOOD_COLORS = {
  difficult: '#7B1D1D',
  low: '#F59E0B',
  okay: '#3B82F6',
  good: '#10B981',
  great: '#003DA5',
};

const ENTRY_BORDER_COLORS = {
  Good: '#10B981',
  Okay: '#3B82F6',
  Low: '#F59E0B',
  Difficult: '#7B1D1D',
  Great: '#003DA5',
};

// Appointments List Component for Student Detail View
const AppointmentsList = ({ studentId, studentAlias, onAppointmentCountChange }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClick = (apt) => {
    setAppointmentToDelete(apt);
    setShowDeleteModal(true);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setAppointmentToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;
    try {
      setDeleting(true);
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToDelete.id);

      if (deleteError) throw deleteError;

      setAppointments(prev => prev.filter(apt => apt.id !== appointmentToDelete.id));
      if (onAppointmentCountChange) {
        onAppointmentCountChange(appointments.length - 1);
      }
      setShowDeleteModal(false);
      setAppointmentToDelete(null);
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert('Failed to delete appointment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    const confirmedStatuses = ['scheduled', 'rescheduled'];
    const completedStatuses = ['completed'];
    const cancelledStatuses = ['cancelled', 'cancelled_by_student', 'cancelled_by_therapist', 'no_show'];
    let badgeClass = 'cancelled';
    if (confirmedStatuses.includes(status)) badgeClass = 'confirmed';
    else if (completedStatuses.includes(status)) badgeClass = 'completed';
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return <span className={`status-badge ${badgeClass}`}>{label}</span>;
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
      <h2 className="appointments-page-title">Appointments with {studentAlias || 'Student'}</h2>
      
      {upcoming.length > 0 && (
        <div className="appointments-section">
          <h3 className="section-heading upcoming">Upcoming Appointments</h3>
          <div className="appointments-grid">
            {upcoming.map(apt => (
              <div key={apt.id} className="upcoming-card">
                <div className="appointment-date">
                  {formatDate(apt.appointment_date)}
                  {getStatusBadge(apt.status)}
                </div>
                <div className="appointment-time">
                  <strong>{formatTime(apt.start_time)}</strong> – {formatTime(apt.end_time)}
                </div>
                {apt.student_notes && (
                  <div className="student-notes-row">
                    <div className="notes-label">Student Notes (Sensitive)</div>
                    <div className="notes-content">{apt.student_notes}</div>
                  </div>
                )}
                {apt.notes && (
                  <p className="therapist-notes"><strong>Therapist Notes:</strong> {apt.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="appointments-section">
          <h3 className="section-heading past">Past Appointments</h3>
          <div className="appointments-grid">
            {past.map(apt => (
              <div key={apt.id} className="past-card">
                <div className="appointment-date">
                  {formatDate(apt.appointment_date)}
                  {getStatusBadge(apt.status)}
                </div>
                <div className="appointment-time">
                  <strong>{formatTime(apt.start_time)}</strong> – {formatTime(apt.end_time)}
                </div>
                {apt.student_notes && (
                  <div className="student-notes-row">
                    <div className="notes-label">Student Notes (Sensitive)</div>
                    <div className="notes-content">{apt.student_notes}</div>
                  </div>
                )}
                {apt.notes && (
                  <p className="therapist-notes"><strong>Therapist Notes:</strong> {apt.notes}</p>
                )}
                <div className="past-card-actions">
                  <button type="button" className="view-details-btn">View Details →</button>
                  <button
                    type="button"
                    className="delete-appointment-btn"
                    onClick={() => handleDeleteClick(apt)}
                    disabled={deleting}
                    title="Delete appointment record"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="delete-appointment-modal-overlay" role="dialog" aria-modal="true">
          <div className="delete-appointment-modal">
            <h3>Delete appointment record?</h3>
            <p>
              Are you sure you want to delete this appointment record? This action cannot be undone and will remove it from both your records and the student&apos;s history.
            </p>
            <div className="delete-appointment-modal-actions">
              <button type="button" className="delete-modal-cancel" onClick={handleDeleteCancel} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="delete-modal-confirm" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
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
  const location = useLocation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [sharedJournals, setSharedJournals] = useState([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const unviewedJournalCount = useMemo(
    () => sharedJournals.filter((j) => !j.therapist_viewed_at).length,
    [sharedJournals]
  );
  const [conversationId, setConversationId] = useState(null);
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRevealContactConfirm, setShowRevealContactConfirm] = useState(false);
  const [contactRevealed, setContactRevealed] = useState(false);
  const [contactDetails, setContactDetails] = useState(null);
  const [revealContactLoading, setRevealContactLoading] = useState(false);
  const [isOnPoolCrisisAccess, setIsOnPoolCrisisAccess] = useState(false);
  const [moodChartType, setMoodChartType] = useState('line');

  const groupedMoodEntries = useMemo(() => {
    const sorted = [...moodHistory].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
    return groupMoodEntriesByDate(sorted);
  }, [moodHistory]);

  const moodChartData = useMemo(() => {
    return [...moodHistory]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((entry) => ({
        date: new Date(entry.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: new Date(entry.logged_at).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: MOOD_VALUES[entry.mood] ?? 3,
        mood: moodLabel(entry.mood),
        note: entry.note,
      }));
  }, [moodHistory]);

  const fetchStudentData = useCallback(async () => {
    if (!user) {
      setError('Please log in to view student details.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

        // Verify relationship and fetch student profile + journals + appointment count + notes count + conversation in parallel
        const [relationshipResult, profileResult, journalsResult, appointmentsResult, notesResult, conversationResult] = await Promise.all([
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
            .eq('student_id', studentId),
          supabase
            .from('conversations')
            .select('id')
            .eq('therapist_id', user.id)
            .eq('student_id', studentId)
            .maybeSingle()
        ]);

        const { data: relationship, error: relError } = relationshipResult;
        const { data: studentProfile, error: profileError } = profileResult;
        const { data: journals, error: journalsError } = journalsResult;
        const { data: appointments, error: appointmentsError } = appointmentsResult;
        const { data: notes, error: notesError } = notesResult;
        const { data: conversation, error: conversationError } = conversationResult;

        if (relError || !relationship) {
          const handlingCrisis = await isHandlingActiveCrisisForStudent(user.id, studentId);
          if (handlingCrisis) {
            setIsOnPoolCrisisAccess(true);
          } else {
            setError('Student not found in your caseload.');
            setLoading(false);
            return;
          }
        } else {
          setIsOnPoolCrisisAccess(false);
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

        if (conversationError && conversationError.code !== 'PGRST116') {
          console.error('Error fetching conversation:', conversationError);
        } else {
          setConversationId(conversation?.id || null);
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

  useEffect(() => {
    if (!studentId || !student) {
      setMoodHistory([]);
      return;
    }
    setMoodHistory([]);
    getMoodHistory(studentId, 90).then(setMoodHistory).catch(() => setMoodHistory([]));
  }, [studentId, student]);

  const handleRevealContactConfirm = async () => {
    setShowRevealContactConfirm(false);
    setRevealContactLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('student_profiles')
        .select('first_name, last_name, contact, gender')
        .eq('user_id', studentId)
        .single();
      if (fetchError) throw fetchError;
      setContactDetails(data || {});
      setContactRevealed(true);
    } catch (err) {
      console.error('Error fetching emergency contact:', err);
    } finally {
      setRevealContactLoading(false);
    }
  };

  // Open chat tab if requested from navigation state
  useEffect(() => {
    if (location.state?.openChatTab) {
      setActiveTab('chat');
      // Clear the state to prevent reopening on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Mark journals as viewed when therapist opens the Journals tab.
  // Use only activeTab in deps to keep array size stable (avoids React "changed size between renders" error).
  const lastMarkedTabRef = useRef(null);
  const markViewedRef = useRef({ studentId, user, sharedJournals });
  markViewedRef.current = { studentId, user, sharedJournals };
  useEffect(() => {
    if (activeTab !== 'journals') return;
    const { studentId: sid, user: u, sharedJournals: journals } = markViewedRef.current;
    if (!sid || !u) return;
    const unviewed = journals.filter((j) => !j.therapist_viewed_at);
    if (unviewed.length === 0) return;
    if (lastMarkedTabRef.current === 'journals') return;
    lastMarkedTabRef.current = 'journals';

    const ids = unviewed.map((j) => j.id);
    supabase
      .from('journal_entries')
      .update({ therapist_viewed_at: new Date().toISOString() })
      .in('id', ids)
      .then(({ error }) => {
        if (!error) {
          setSharedJournals((prev) =>
            prev.map((j) => (ids.includes(j.id) ? { ...j, therapist_viewed_at: new Date().toISOString() } : j))
          );
        }
      });
  }, [activeTab]);

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

  const backTarget = isOnPoolCrisisAccess ? '/therapist-dashboard/alerts' : '/therapist-dashboard/caseload';
  const backLabel = isOnPoolCrisisAccess ? '← Back to Crisis Management' : '← Back to Caseload';

  return (
    <div className="student-detail-view">
      {isOnPoolCrisisAccess && (
        <div className="on-pool-crisis-banner" role="status">
          <span>⚠️ Temporary access — You are viewing this student&apos;s case because you are handling their active crisis. Access will end when the crisis is marked Resolved.</span>
        </div>
      )}
      <div className="detail-header">
        <button onClick={() => navigate(backTarget)} className="back-btn">
          {backLabel}
        </button>
        <h1 className="page-title">{student.alias}</h1>
      </div>

      <div className="tabs-row tabs-container">
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
          Journals {unviewedJournalCount > 0 && <span className="tab-badge">{unviewedJournalCount}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments {(appointmentCount > 0 && activeTab !== 'appointments') && <span className="tab-badge">{appointmentCount}</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Therapist Notes {(noteCount > 0 && activeTab !== 'notes') && <span className="tab-badge">{noteCount}</span>}
        </button>
        {user?.user_metadata?.role === 'therapist' && (
          <button
            className={`tab-btn ${activeTab === 'emotional-trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('emotional-trends')}
          >
            Emotional Trends
          </button>
        )}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="profile-section-card info-card">
              <h3 className="section-title">Student Information</h3>
              <div className="info-row">
                <span className="info-label">Alias</span>
                <span className="info-value">{student.alias}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Status</span>
                <span className={`status-badge ${student.status}`}>{student.status}</span>
              </div>
              {!contactRevealed ? (
                <>
                  <div className="privacy-notice">
                    <strong>🔒 Full student details are hidden for privacy protection.</strong>
                    <p>Details are only accessible during emergency/crisis situations when immediate intervention is required.</p>
                  </div>
                  <div className="emergency-reveal">
                    <button
                      type="button"
                      className="reveal-btn reveal-contact-btn"
                      onClick={() => setShowRevealContactConfirm(true)}
                      disabled={revealContactLoading}
                    >
                      {revealContactLoading ? 'Loading…' : 'Reveal contact (emergency use only)'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="emergency-contact-revealed">
                  <p className="emergency-contact-heading">Emergency contact (revealed)</p>
                  <div className="info-row">
                    <span className="info-label">Name</span>
                    <span className="info-value">{[contactDetails?.first_name, contactDetails?.last_name].filter(Boolean).join(' ') || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Contact</span>
                    <span className="info-value">{contactDetails?.contact || '—'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Gender</span>
                    <span className="info-value">{contactDetails?.gender || '—'}</span>
                  </div>
                </div>
              )}
            </div>

            {showRevealContactConfirm && (
              <div className="emergency-reveal-modal-overlay" role="dialog" aria-modal="true">
                <div className="emergency-reveal-modal">
                  <h3>Emergency contact access</h3>
                  <p>
                    You are about to view this student&apos;s confidential contact information. Only proceed if this is necessary for an emergency or crisis intervention.
                  </p>
                  <div className="emergency-reveal-modal-actions">
                    <button type="button" className="emergency-reveal-cancel" onClick={() => setShowRevealContactConfirm(false)}>
                      Cancel
                    </button>
                    <button type="button" className="emergency-reveal-confirm" onClick={handleRevealContactConfirm}>
                      I understand, reveal contact
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="profile-section-card info-card">
              <h3 className="section-title">Bio</h3>
              <p className="bio-text">Bio information is not available to protect student privacy.</p>
            </div>
            <div className="profile-section-card info-card">
              <h3 className="section-title">Risk Indicators</h3>
              {student.risks && student.risks.length > 0 ? (
                student.risks.map((risk, index) => (
                  <div key={index} className="risk-badge">{risk}</div>
                ))
              ) : (
                <div className="no-risk">✓ No risk indicators identified.</div>
              )}
            </div>
            <div className="profile-section-card info-card mood-context-card">
              <h3 className="section-title">Mood (context only)</h3>
              <p className="mood-disclaimer">
                Read-only. {isOnPoolCrisisAccess
                  ? 'Visible during crisis intervention. Mood data is for contextual awareness only.'
                  : 'Mood data is for contextual awareness only. It does not generate alerts, affect priority, or trigger escalation.'}
              </p>
              {moodHistory.length === 0 ? (
                <p>No mood entries logged yet.</p>
              ) : (
                <>
                  <div className="therapist-mood-chart-section">
                    <div className="chart-type-toggle">
                      <button
                        type="button"
                        className={moodChartType === 'line' ? 'active' : ''}
                        onClick={() => setMoodChartType('line')}
                      >
                        Line
                      </button>
                      <button
                        type="button"
                        className={moodChartType === 'bar' ? 'active' : ''}
                        onClick={() => setMoodChartType('bar')}
                      >
                        Bar
                      </button>
                    </div>
                    <p className="chart-legend">Scale: 1 = Difficult, 5 = Great</p>
                    <div className="therapist-mood-chart-wrapper">
                      <ResponsiveContainer width="100%" height={220}>
                        {moodChartType === 'line' ? (
                          <LineChart data={moodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="mood-chart-tooltip">
                                    <div className="tooltip-date">{d.fullDate}</div>
                                    <div className="tooltip-mood">{d.mood} ({d.value}/5)</div>
                                    {d.note && <div className="tooltip-note">&ldquo;{d.note}&rdquo;</div>}
                                  </div>
                                );
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#003DA5"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#003DA5' }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        ) : (
                          <BarChart data={moodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="mood-chart-tooltip">
                                    <div className="tooltip-date">{d.fullDate}</div>
                                    <div className="tooltip-mood">{d.mood} ({d.value}/5)</div>
                                    {d.note && <div className="tooltip-note">&ldquo;{d.note}&rdquo;</div>}
                                  </div>
                                );
                              }}
                            />
                            <Bar dataKey="value" fill="#003DA5" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mood-trend-bars therapist-mood">
                    {[...MOOD_OPTIONS].reverse().map((opt) => {
                      const count = moodHistory.filter((e) => e.mood === opt.value).length;
                      const pct = moodHistory.length ? (count / moodHistory.length) * 100 : 0;
                      const value = MOOD_VALUES[opt.value];
                      const barColor = MOOD_COLORS[opt.value] || '#003DA5';
                      return (
                        <div key={opt.value} className="mood-trend-row">
                          <span className="mood-trend-label">{opt.label} ({value})</span>
                          <div className="mood-trend-bar-wrap">
                            <div className="mood-trend-bar" style={{ width: `${pct}%`, background: barColor }} />
                          </div>
                          <span className="mood-trend-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <h4 className="mood-history-heading">Recent entries</h4>
                  <div className="therapist-mood-entries grouped">
                    {groupedMoodEntries.map((group) => (
                      <div key={group.key} className="mood-entry-group">
                        <h5 className="mood-group-label">{group.label} ({group.entries.length})</h5>
                        <div className="therapist-mood-entries-list">
                          {group.entries.map((entry) => {
                            const moodLabelText = moodLabel(entry.mood);
                            const borderColor = ENTRY_BORDER_COLORS[moodLabelText] || '#9CA3AF';
                            return (
                              <div
                                key={entry.id}
                                className="recent-entry"
                                style={{ borderLeftColor: borderColor }}
                              >
                                <span className="entry-timestamp mood-entry-date">{formatDateTime(entry.logged_at)}</span>
                                <span className="entry-mood-value mood-entry-mood">{moodLabelText} ({MOOD_VALUES[entry.mood] ?? '—'}/5)</span>
                                {entry.note && <span className="mood-entry-note"> — {entry.note}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-tab">
            {conversationId ? (
              <ChatScreen
                conversationId={conversationId}
                otherUserId={studentId}
                otherUserName={student?.alias || 'Student'}
                userRole="therapist"
                showBackButton={false}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h2>No conversation started yet</h2>
                <p>The conversation will be created automatically when you send the first message.</p>
                <button
                  className="create-conversation-btn"
                  onClick={async () => {
                    try {
                      // Try RPC function first (if available in schema)
                      const { data: rpcData, error: rpcError } = await supabase
                        .rpc('get_or_create_conversation', {
                          p_student_id: studentId,
                          p_therapist_id: user.id
                        });

                      if (!rpcError && rpcData) {
                        setConversationId(rpcData);
                        return;
                      }

                      // Fallback to direct insert
                      const { data, error } = await supabase
                        .from('conversations')
                        .insert({
                          student_id: studentId,
                          therapist_id: user.id
                        })
                        .select()
                        .single();

                      if (error) {
                        // If conflict (conversation already exists), fetch it
                        if (error.code === '23505' || error.status === 409) {
                          const { data: existing } = await supabase
                            .from('conversations')
                            .select('id')
                            .eq('student_id', studentId)
                            .eq('therapist_id', user.id)
                            .single();
                          if (existing) {
                            setConversationId(existing.id);
                          }
                        } else {
                          throw error;
                        }
                      } else if (data) {
                        setConversationId(data.id);
                      }
                    } catch (err) {
                      console.error('Error creating conversation:', err);
                      alert('Failed to create conversation. Please try again.');
                    }
                  }}
                >
                  Start Conversation
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'journals' && (
          <div className="journals-tab">
            <div className="journal-notice">
              📖 <strong>Shared journals only.</strong> You can only see entries
              the student has explicitly chosen to share with you.
            </div>
            {sharedJournals.length === 0 ? (
              <div className="empty-state journals-empty">
                <p>🔒</p>
                <h3>No shared journals yet</h3>
                <p>{student?.alias || 'This student'} hasn&apos;t shared any journal entries with you yet.</p>
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
                      <div className="entry-header">
                        <span className="entry-date">Entry from {formatDate(journal.entry_date)}</span>
                        <span className="shared-badge">
                          {journal.shared_at
                            ? `Shared on ${formatDate(journal.shared_at)}`
                            : '✓ Shared by student'}
                        </span>
                      </div>
                      <div className="entry-content">
                        {journal.content}
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

        {activeTab === 'emotional-trends' && user?.user_metadata?.role === 'therapist' && (
          <div className="emotional-trends-tab">
            <EmotionalTrends studentId={studentId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDetailView;

