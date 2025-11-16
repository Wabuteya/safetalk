import { NavLink, useNavigate } from 'react-router-dom';
import { AiOutlineDashboard } from 'react-icons/ai';
import {
  FaUserGraduate,
  FaUserMd,
  FaRegNewspaper,
  FaHeartbeat,
  FaSignOutAlt
} from 'react-icons/fa';

const AdminSideNav = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/', { replace: true });
  };

  return (
    // Reusing sidebar styles, but with a unique theme class
    <nav className="sidebar admin-sidebar"> 
      <div className="sidebar-header">
        <h3>Admin Console</h3>
      </div>
      <div className="sidebar-profile">
        <p className="sidebar-alias">System Admin</p>
      </div>
      <ul className="sidebar-nav">
        <li>
          <NavLink to="/admin-dashboard" end>
            <AiOutlineDashboard className="nav-icon" />
            <span>Analytics</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin-dashboard/users">
            <FaUserGraduate className="nav-icon" />
            <span>Manage Students</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin-dashboard/therapists">
            <FaUserMd className="nav-icon" />
            <span>Manage Therapists</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/admin-dashboard/content">
            <FaRegNewspaper className="nav-icon" />
            <span>Manage Content</span>
          </NavLink>
        </li>
         <li>
          <NavLink to="/admin-dashboard/health">
            <FaHeartbeat className="nav-icon" />
            <span>System Health</span>
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
};

export default AdminSideNav;