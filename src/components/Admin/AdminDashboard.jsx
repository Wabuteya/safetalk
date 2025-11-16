import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSideNav from './AdminSideNav.jsx';
import './AdminDashboard.css'; // Use the new, dedicated CSS file

const AdminDashboard = () => {
  return (
    <div className="admin-dashboard-layout"> {/* Changed class name for clarity */}
      <AdminSideNav />
      <div className="admin-main-content">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;