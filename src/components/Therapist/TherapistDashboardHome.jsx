import React from 'react';

const TherapistDashboardHome = () => {
  return (
    <div className="therapist-home">
      <h1>Dashboard</h1>
      <p>Welcome back, Dr. Reed. Here is your summary for today.</p>

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