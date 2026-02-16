import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DefaultAvatar, getTherapistPhotoUrl } from '../../utils/defaultAvatar';
import { getCrisisEventsForTherapist } from '../../utils/crisisEvents';
import { useCrisisRealtime } from '../../contexts/CrisisRealtimeContext';

const TherapistDashboardHome = () => {
  const navigate = useNavigate();
  const { newAlertReceived, clearNewAlert, refreshCount } = useCrisisRealtime() || {};
  const [user, setUser] = useState(null);
  const [therapistName, setTherapistName] = useState('Therapist');
  const [therapistPhotoUrl, setTherapistPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [caseloadCount, setCaseloadCount] = useState(0);
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

        const [profileResult, appointmentsResult, caseloadResult] = await Promise.all([
          supabase
            .from('therapist_profiles')
            .select('full_name, title, profile_photo_url, image_url, status')
            .eq('user_id', currentUser.id)
            .single(),
          supabase
            .from('appointments')
            .select('id')
            .eq('therapist_id', currentUser.id)
            .eq('appointment_date', new Date().toISOString().split('T')[0])
            .eq('status', 'scheduled'),
          supabase
            .from('therapist_student_relations')
            .select('id')
            .eq('therapist_id', currentUser.id),
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

      <div className="therapist-home-header">
        {therapistPhotoUrl ? (
          <img
            src={therapistPhotoUrl}
            alt={therapistName}
            className="therapist-home-avatar"
            onError={(e) => {
              e.target.style.display = 'none';
              const next = e.target.nextElementSibling;
              if (next) next.style.display = 'flex';
            }}
          />
        ) : null}
        {!therapistPhotoUrl && (
          <div className="therapist-home-avatar-placeholder">
            <DefaultAvatar size={80} />
          </div>
        )}
        <div>
          <h1 className="therapist-home-title">Dashboard</h1>
          <p className="therapist-home-subtitle">
            Welcome back, {therapistName}. Here is your summary for today.
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="widget-card">
          <h3>Upcoming Appointments</h3>
          <p>
            You have <strong>{appointmentsCount} {appointmentsCount === 1 ? 'appointment' : 'appointments'}</strong> scheduled for today.
          </p>
          <button onClick={() => navigate('/therapist-dashboard/appointments')}>
            View Calendar
          </button>
        </div>
        <div className="widget-card">
          <h3>My Caseload</h3>
          <p>
            You are currently managing <strong>{caseloadCount} {caseloadCount === 1 ? 'student case' : 'student cases'}</strong>.
          </p>
          <button onClick={() => navigate('/therapist-dashboard/caseload')}>
            View Caseload
          </button>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboardHome;
