import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { DefaultAvatar, getTherapistPhotoUrl } from '../../utils/defaultAvatar';

const TherapistDashboardHome = () => {
  const [therapistName, setTherapistName] = useState('Therapist');
  const [therapistPhotoUrl, setTherapistPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [caseloadCount, setCaseloadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch therapist profile from database
        const { data: profile } = await supabase
          .from('therapist_profiles')
          .select('full_name, title, profile_photo_url, image_url')
          .eq('user_id', user.id)
          .single();

        if (profile?.full_name) {
          // Extract first name or use full name
          const firstName = profile.full_name.split(' ')[0];
          const displayName = profile.title 
            ? `${profile.title} ${firstName}`
            : firstName;
          setTherapistName(displayName);
          
          // Set photo URL with fallback
          const photoUrl = getTherapistPhotoUrl(profile.profile_photo_url, profile.image_url);
          setTherapistPhotoUrl(photoUrl);
        } else {
          // Fallback to user metadata if profile doesn't exist yet
          const metadataName = user.user_metadata?.full_name;
          if (metadataName) {
            const firstName = metadataName.split(' ')[0];
            setTherapistName(firstName);
          }
        }

        // Fetch real data in parallel
        const today = new Date().toISOString().split('T')[0];
        
        const [appointmentsResult, caseloadResult] = await Promise.all([
          // Fetch today's appointments
          supabase
            .from('appointments')
            .select('id')
            .eq('therapist_id', user.id)
            .eq('appointment_date', today)
            .eq('status', 'scheduled'),
          // Fetch caseload count
          supabase
            .from('therapist_student_relations')
            .select('id')
            .eq('therapist_id', user.id)
        ]);

        if (!appointmentsResult.error && appointmentsResult.data) {
          setAppointmentsCount(appointmentsResult.data.length);
        }

        if (!caseloadResult.error && caseloadResult.data) {
          setCaseloadCount(caseloadResult.data.length);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="therapist-home">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          fontSize: '1.1rem',
          color: '#5b6888'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="therapist-home">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
        {therapistPhotoUrl ? (
          <img 
            src={therapistPhotoUrl} 
            alt={therapistName} 
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #ddd'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              const placeholder = e.target.nextElementSibling;
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        {!therapistPhotoUrl && (
          <div style={{ display: therapistPhotoUrl ? 'none' : 'flex' }}>
            <DefaultAvatar size={80} />
          </div>
        )}
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0' }}>Welcome back, {therapistName}. Here is your summary for today.</p>
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