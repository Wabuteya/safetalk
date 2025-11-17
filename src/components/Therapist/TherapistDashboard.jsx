import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import TherapistSideNav from './TherapistSideNav.jsx';
import { supabase } from '../../supabaseClient';
import './TherapistDashboard.css';

const TherapistDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // In a real app, this state would be managed globally (e.g., with Context or Redux)
  // and updated in real-time by a WebSocket or polling.
  const hasCrisisAlert = true; // Set to 'true' to test the alert banner

  useEffect(() => {
    const checkUserProfile = async () => {
      // Get the current logged-in user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Check if a profile exists for this user in our new table
        const { data: profile, error } = await supabase
          .from('therapist_profiles')
          .select('is_live')
          .eq('user_id', user.id)
          .single(); // .single() gets one row or null

        if (error && error.code !== 'PGRST116') { // Ignore error when no rows are found
          console.error("Error checking profile:", error);
        }

        // If there's no profile OR if the profile is not yet live...
        if (!profile || !profile.is_live) {
          // and if we are NOT already on the profile page...
          if (window.location.pathname !== '/therapist-dashboard/profile') {
            // Redirect them!
            alert("Welcome! Please complete your public profile to become visible to students.");
            navigate('/therapist-dashboard/profile');
          }
        }
      }

      setLoading(false);
    };

    checkUserProfile();
  }, [navigate]); // Rerun if navigate changes

  if (loading) {
    return (
      <div className="therapist-dashboard-layout">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '100vh',
          fontSize: '1.1rem',
          color: '#5b6888'
        }}>
          Loading your dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="therapist-dashboard-layout">
      <TherapistSideNav />
      <div className="therapist-main-content">
        {/* --- THIS IS THE PERSISTENT CRISIS ALERT HEADER --- */}
        {hasCrisisAlert && (
          <div className="crisis-alert-banner">
            <strong>CRISIS ALERT:</strong> A student requires your immediate attention. 
            <a href="/therapist-dashboard/alerts">View Alert Details</a>
          </div>
        )}
        <main className="therapist-page-content">
          <Outlet /> {/* Child components will be rendered here */}
        </main>
      </div>
    </div>
  );
};

export default TherapistDashboard;