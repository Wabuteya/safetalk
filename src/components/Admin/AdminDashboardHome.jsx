import React from 'react';
// Reusing some widget styles
import '../Student/Dashboard.css';
import './AdminDashboard.css';

const AdminDashboardHome = () => {
  return (
    <div className="admin-home">
      <h1>System Analytics</h1>
      <p>A high-level overview of platform activity.</p>

      <div className="dashboard-grid">
        <div className="widget-card analytics-card">
          <h3>Total Students</h3>
          <p className="analytics-value">1,245</p>
        </div>
        <div className="widget-card analytics-card">
          <h3>Active Therapists</h3>
          <p className="analytics-value">12</p>
        </div>
        <div className="widget-card analytics-card">
          <h3>Sessions This Week</h3>
          <p className="analytics-value">82</p>
        </div>
        <div className="widget-card analytics-card">
          <h3>Active Crisis Alerts</h3>
          <p className="analytics-value critical">1</p>
        </div>
      </div>
      
      {/* A placeholder for a future chart */}
      <div className="analytics-chart-container">
          <h3>User Sign-ups Over Time</h3>
          <p>(A chart showing user growth would be displayed here.)</p>
      </div>
    </div>
  );
};

export default AdminDashboardHome;