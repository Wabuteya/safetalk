import React from 'react';
import { Outlet } from 'react-router-dom';
import TherapistSideNav from './TherapistSideNav.jsx';
import './TherapistDashboard.css';

const TherapistDashboard = () => {
  // In a real app, this state would be managed globally (e.g., with Context or Redux)
  // and updated in real-time by a WebSocket or polling.
  const hasCrisisAlert = true; // Set to 'true' to test the alert banner

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