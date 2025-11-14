import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-layout">
      <SideNav />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;