import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TherapistDashboardHome = () => {
  const [therapistName, setTherapistName] = useState('Therapist');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTherapistName = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch therapist profile from database
          const { data: profile } = await supabase
            .from('therapist_profiles')
            .select('full_name, title')
            .eq('user_id', user.id)
            .single();

          if (profile?.full_name) {
            // Extract first name or use full name
            const firstName = profile.full_name.split(' ')[0];
            const displayName = profile.title 
              ? `${profile.title} ${firstName}`
              : firstName;
            setTherapistName(displayName);
          } else {
            // Fallback to user metadata if profile doesn't exist yet
            const metadataName = user.user_metadata?.full_name;
            if (metadataName) {
              const firstName = metadataName.split(' ')[0];
              setTherapistName(firstName);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching therapist name:', error);
        // Keep default 'Therapist' if error
      } finally {
        setLoading(false);
      }
    };

    fetchTherapistName();
  }, []);

  return (
    <div className="therapist-home">
      <h1>Dashboard</h1>
      <p>Welcome back, {therapistName}. Here is your summary for today.</p>

      <div className="dashboard-grid">
        <div className="widget-card priority-alert">
            <h3>Priority Alert</h3>
            <p><strong>Anonymous Panda</strong> has triggered a crisis alert.</p>
            <button>Go to Alerts</button>
        </div>

        <div className="widget-card">
          <h3>Upcoming Appointments</h3>
          <p>You have <strong>3 appointments</strong> scheduled for today.</p>
          <button>View Calendar</button>
        </div>

        <div className="widget-card">
          <h3>My Caseload</h3>
          <p>You are currently managing <strong>15 student cases</strong>.</p>
          <button>View Caseload</button>
        </div>
        
        <div className="widget-card">
          <h3>Unread Messages</h3>
          <p>You have <strong>8 unread messages</strong> from students.</p>
          <button>Open Chat</button>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboardHome;