import React from 'react';

const DashboardHome = () => {
  return (
    <div className="dashboard-home">
      <div className="welcome-header">
        <h1>Welcome, Anonymous Panda!</h1>
        <p>Your safe space is ready. What would you like to do today?</p>
      </div>

      <div className="dashboard-grid">
        <div className="widget-card mood-tracker">
          <h3>How are you feeling?</h3>
          <p>Quickly track your mood for the day.</p>
          <div className="mood-options">
            <span>😞</span>
            <span>😕</span>
            <span>😐</span>
            <span>🙂</span>
            <span>😄</span>
          </div>
        </div>

        <div className="widget-card journal">
          <h3>My Journal</h3>
          <p>Write down your thoughts. Your privacy is our priority.</p>
          <button>Write a New Entry</button>
        </div>

        <div className="widget-card resources">
          <h3>Motivational Resources</h3>
          <p>Explore articles and tools to support your wellness journey.</p>
          <button>Explore Resources</button>
        </div>
        
        <div className="widget-card appointments">
          <h3>Upcoming Appointments</h3>
          <p>You have no upcoming appointments.</p>
          <button>Book a Session</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;