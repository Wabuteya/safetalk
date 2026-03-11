import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DefaultAvatar, getTherapistPhotoUrl } from '../../utils/defaultAvatar';
import { getCrisisEventsForTherapist } from '../../utils/crisisEvents';
import { useCrisisRealtime } from '../../contexts/CrisisRealtimeContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';

const TherapistDashboardHome = () => {
  const navigate = useNavigate();
  const { newAlertReceived, clearNewAlert, refreshCount } = useCrisisRealtime() || {};
  const { unreadCount = 0 } = useUnreadMessages();
  const [user, setUser] = useState(null);
  const [therapistName, setTherapistName] = useState('Therapist');
  const [therapistPhotoUrl, setTherapistPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [caseloadCount, setCaseloadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [crisisEvents, setCrisisEvents] = useState([]);
  const [isOnCall, setIsOnCall] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);

  const refreshCrises = useCallback(async (therapistId) => {
    if (!therapistId) return;
    const { events, isOnCall: onCall } = await getCrisisEventsForTherapist(therapistId);
    setCrisisEvents(events);
    setIsOnCall(!!onCall);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        setUser(currentUser);

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const [profileResult, appointmentsResult, caseloadResult, pendingResult] = await Promise.all([
          supabase
            .from('therapist_profiles')
            .select('full_name, title, profile_photo_url, image_url, status')
            .eq('user_id', currentUser.id)
            .single(),
          supabase
            .from('appointments')
            .select('id')
            .eq('therapist_id', currentUser.id)
            .eq('appointment_date', todayStr)
            .in('status', ['scheduled', 'rescheduled']),
          supabase
            .from('therapist_student_relations')
            .select('id')
            .eq('therapist_id', currentUser.id),
          supabase
            .from('therapist_change_requests')
            .select('id')
            .eq('current_therapist_id', currentUser.id)
            .eq('status', 'pending'),
        ]);

        const profile = profileResult?.data;
        if (profile?.full_name) {
          const firstName = profile.full_name.split(' ')[0];
          setTherapistName(profile.title ? `${profile.title} ${firstName}` : firstName);
          const photoUrl = getTherapistPhotoUrl(profile.profile_photo_url, profile.image_url);
          setTherapistPhotoUrl(photoUrl);
        } else {
          const meta = currentUser.user_metadata?.full_name;
          if (meta) setTherapistName(meta.split(' ')[0]);
        }
        if (profile?.status) setAvailabilityStatus(profile.status);

        if (!appointmentsResult.error && appointmentsResult.data)
          setAppointmentsCount(appointmentsResult.data.length);
        if (!caseloadResult.error && caseloadResult.data)
          setCaseloadCount(caseloadResult.data.length);
        if (!pendingResult.error && pendingResult.data)
          setPendingRequestsCount(pendingResult.data.length);

        await refreshCrises(currentUser.id);
        if (refreshCount) await refreshCount(currentUser.id);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [refreshCrises, refreshCount]);

  const activeCrisisCount = crisisEvents.length;

  // Poll when there are active crises so summary count stays current
  useEffect(() => {
    if (!user?.id || activeCrisisCount === 0) return;
    const interval = setInterval(() => refreshCrises(user.id), 30000);
    return () => clearInterval(interval);
  }, [user?.id, activeCrisisCount, refreshCrises]);

  if (loading) {
    return (
      <div className="therapist-home">
        <div className="therapist-home-loading">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="therapist-home">
      {/* Real-time: red banner when a new crisis alert just arrived */}
      {newAlertReceived && (
        <div className="crisis-realtime-banner" role="alert">
          <span className="crisis-realtime-banner-text">New crisis alert received.</span>
          <button
            type="button"
            className="crisis-realtime-banner-btn"
            onClick={() => {
              clearNewAlert?.();
              navigate('/therapist-dashboard/alerts');
            }}
          >
            View Crisis Management
          </button>
        </div>
      )}
      {/* Crisis summary – link to centralized Crisis Alerts page */}
      {activeCrisisCount > 0 && (
        <div className="crisis-dashboard-summary">
          <span className="crisis-dashboard-summary-text">
            You have <strong>{activeCrisisCount}</strong> crisis alert{activeCrisisCount !== 1 ? 's' : ''} requiring attention.
          </span>
          <button
            type="button"
            className="crisis-dashboard-summary-btn"
            onClick={() => navigate('/therapist-dashboard/alerts')}
          >
            View Crisis Management
          </button>
        </div>
      )}

      <div className="dashboard-header">
        {therapistPhotoUrl ? (
          <img
            src={therapistPhotoUrl}
            alt={therapistName}
            className="therapist-avatar"
            onError={(e) => {
              e.target.style.display = 'none';
              const next = e.target.nextElementSibling;
              if (next) next.style.display = 'flex';
            }}
          />
        ) : null}
        {!therapistPhotoUrl && (
          <div className="therapist-home-avatar-placeholder">
            <DefaultAvatar size={64} />
          </div>
        )}
        <div>
          <h1 className="welcome-title">Welcome back, {therapistName}</h1>
          <p className="welcome-subtitle">Here is your summary for today.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="dash-card-sticker-placeholder" title="Schedule illustration">
            <img
              className="dash-card-sticker-image"
              src="/Sticker/Schedule-bro.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3>Upcoming Appointments</h3>
          <p>You have <strong>{appointmentsCount} {appointmentsCount === 1 ? 'appointment' : 'appointments'}</strong> today.</p>
          <button type="button" className="card-btn" onClick={() => navigate('/therapist-dashboard/appointments')}>
            View Calendar
          </button>
        </div>
        <div className="dash-card">
          <div className="dash-card-sticker-placeholder" title="Caseload illustration">
            <img
              className="dash-card-sticker-image"
              src="/Sticker/college%20students-rafiki.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3>My Caseload</h3>
          <p>Managing <strong>{caseloadCount} {caseloadCount === 1 ? 'student case' : 'student cases'}</strong>.</p>
          <button type="button" className="card-btn" onClick={() => navigate('/therapist-dashboard/caseload')}>
            View Caseload
          </button>
        </div>
        <div className="dash-card">
          <div className="dash-card-sticker-placeholder" title="New message illustration">
            <img
              className="dash-card-sticker-image"
              src="/Sticker/New%20message-bro.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3>Unread Messages</h3>
          <p>You have <strong>{unreadCount} unread {unreadCount === 1 ? 'message' : 'messages'}</strong>.</p>
          <button type="button" className="card-btn" onClick={() => navigate('/therapist-dashboard/live-chat')}>
            Open Chat
          </button>
        </div>
        <div className="dash-card maroon">
          <div className="dash-card-sticker-placeholder" title="Pending requests illustration">
            <img
              className="dash-card-sticker-image"
              src="/Sticker/Accept%20request-rafiki.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3>Pending Requests</h3>
          <p>You have <strong>{pendingRequestsCount} pending</strong> therapist change requests.</p>
          <button type="button" className="card-btn maroon" onClick={() => navigate('/therapist-dashboard/caseload')}>
            Review Requests
          </button>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboardHome;
