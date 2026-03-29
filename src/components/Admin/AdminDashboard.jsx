import { Outlet } from 'react-router-dom';
import AdminSideNav from './AdminSideNav.jsx';
import DashboardLayout from '../layout/DashboardLayout';
import './AdminDashboard.css';

const AdminDashboard = () => {
  return (
    <DashboardLayout
      sidebar={<AdminSideNav />}
      title="Admin Console"
      mobileLogoSrc="/SafeTalk_Colour.svg"
    >
      <div className="admin-main-content">
        <main>
          <Outlet />
        </main>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;