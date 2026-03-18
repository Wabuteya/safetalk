import { NavLink, useNavigate } from 'react-router-dom';
import { AiOutlineDashboard } from 'react-icons/ai';
import {
  FaUserGraduate,
  FaUserMd,
  FaRegNewspaper,
  FaHeartbeat,
  FaSignOutAlt
} from 'react-icons/fa';
import { supabase } from '../../supabaseClient';

const AdminSideNav = ({ closeSidebar }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Clear user session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear localStorage
      localStorage.removeItem('userAlias');
      
      // Force navigation to home page (full page reload)
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
      // Force navigation even if there's an error
      localStorage.removeItem('userAlias');
      window.location.href = '/';
    }
  };

  return (
    // Reusing sidebar styles, but with a unique theme class
    <nav className="sidebar admin-sidebar"> 
      <div className="sidebar-header">
        <img src="/SafeTalk_Black.svg" alt="SafeTalk" className="safetalk-logo" />
        <h3 className="admin-console-title">Admin Console</h3>
      </div>
      <div className="sidebar-profile">
        <p className="sidebar-alias system-admin-label">System Admin</p>
      </div>
      <ul className="sidebar-nav">
        <li className="nav-section-heading">DASHBOARD</li>
        <li>
          <NavLink to="/admin-dashboard" end onClick={closeSidebar}>
            <AiOutlineDashboard className="nav-icon" />
            <span>Analytics</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">USER MANAGEMENT</li>
        <li>
          <NavLink to="/admin-dashboard/users" onClick={closeSidebar}>
            <FaUserGraduate className="nav-icon" />
            <span>Manage Students</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin-dashboard/therapists" onClick={closeSidebar}>
            <FaUserMd className="nav-icon" />
            <span>Manage Therapists</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">SYSTEM</li>
        <li>
          <NavLink to="/admin-dashboard/content" onClick={closeSidebar}>
            <FaRegNewspaper className="nav-icon" />
            <span>Manage Content</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin-dashboard/health" onClick={closeSidebar}>
            <FaHeartbeat className="nav-icon" />
            <span>System Health</span>
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <button className="logout-btn admin-logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
};

export default AdminSideNav;