import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { getMoodHistory, MOOD_OPTIONS, MOOD_VALUES } from '../../utils/moodTracking';
import { isHandlingActiveCrisisForStudent } from '../../utils/crisisEvents';
import TherapistNotes from './TherapistNotes';
import EmotionalTrends from './EmotionalTrends';
import ChatScreen from '../Chat/ChatScreen';
import './StudentDetailView.css';

const moodLabel = (value) => MOOD_OPTIONS.find((o) => o.value === value)?.label || value;

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
    if (!window.confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(appointmentId);
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'cancelled_by_therapist' })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Remove from local state (or update status)
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
      rescheduled: '#17a2b8',
      completed: '#17a2b8',
      cancelled: '#dc3545',
      cancelled_by_student: '#dc3545',
      cancelled_by_therapist: '#dc3545',
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
  const location = useLocation();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [student, setStudent] = useState(null);
  const [sharedJournals, setSharedJournals] = useState([]);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
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
            <div className="info-card">
              <h3>Student Information</h3>
              <div className="info-row">
                <strong>Alias:</strong> {student.alias}
              </div>
              <div className="info-row">
                <strong>Status:</strong>
                <span className={`status-badge ${student.status}`}>{student.status}</span>
              </div>
              {!contactRevealed ? (
                <>
                  <div className="privacy-notice">
                    <p>🔒 Full student details (name, contact, gender) are hidden for privacy protection.</p>
                    <p>Details are only accessible during emergency/crisis situations when immediate intervention is required.</p>
                  </div>
                  <div className="emergency-reveal">
                    <button
                      type="button"
                      className="reveal-contact-btn"
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
                    <strong>Name:</strong>{' '}
                    {[contactDetails?.first_name, contactDetails?.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div className="info-row">
                    <strong>Contact:</strong> {contactDetails?.contact || '—'}
                  </div>
                  <div className="info-row">
                    <strong>Gender:</strong> {contactDetails?.gender || '—'}
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
            <div className="info-card mood-context-card">
              <h3>Mood (context only)</h3>
              <p className="mood-context-notice">
                Read-only. {isOnPoolCrisisAccess
                  ? 'Visible during crisis intervention. Mood data is for contextual awareness only.'
                  : 'Visible only because this student is attached to you. Mood data is for contextual awareness only. It does not generate alerts, affect priority, or trigger escalation.'}
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
                            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
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
                              stroke="#2196f3"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#2196f3' }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        ) : (
                          <BarChart data={moodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
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
                            <Bar dataKey="value" fill="#2196f3" radius={[4, 4, 0, 0]} />
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
                      return (
                        <div key={opt.value} className="mood-trend-row">
                          <span className="mood-trend-label">{opt.label} ({value})</span>
                          <div className="mood-trend-bar-wrap">
                            <div className="mood-trend-bar" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="mood-trend-count">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <h4 className="mood-history-heading">Recent entries</h4>
                  <ul className="therapist-mood-entries">
                    {moodHistory.slice(0, 10).map((entry) => (
                      <li key={entry.id}>
                        <span className="mood-entry-date">{formatDateTime(entry.logged_at)}</span>
                        <span className="mood-entry-mood">{moodLabel(entry.mood)} ({MOOD_VALUES[entry.mood] ?? '—'}/5)</span>
                        {entry.note && <span className="mood-entry-note"> — {entry.note}</span>}
                      </li>
                    ))}
                  </ul>
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

