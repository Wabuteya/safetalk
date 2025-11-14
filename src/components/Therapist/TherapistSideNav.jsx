import { NavLink, useNavigate } from 'react-router-dom';
import { AiOutlineDashboard } from 'react-icons/ai';
import {
  FaClipboardList,
  FaCalendarCheck,
  FaComments,
  FaLightbulb,
  FaBell,
  FaUserCircle,
  FaSignOutAlt
} from 'react-icons/fa';

const TherapistSideNav = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/', { replace: true });
  };

  return (
    <nav className="sidebar therapist-sidebar">
      <div className="sidebar-header">
        <h3>Therapist Portal</h3>
      </div>
      <div className="sidebar-profile">
        {/* This name will come from the therapist's own user data */}
        <p className="sidebar-alias"> 👩🏽‍⚕️Dr. Evelyn Reed</p>
      </div>
      <ul className="sidebar-nav">
        <li>
          <NavLink to="/therapist-dashboard" end>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard Home</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/caseload">
            <FaClipboardList className="nav-icon" />
            <span>My Caseload</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/appointments">
            <FaCalendarCheck className="nav-icon" />
            <span>Appointments</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/chat">
            <FaComments className="nav-icon" />
            <span>Live Chat</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/resources">
            <FaLightbulb className="nav-icon" />
            <span>Manage Resources</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/alerts">
            <FaBell className="nav-icon" />
            <span>Crisis Alerts (1)</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/profile">
            <FaUserCircle className="nav-icon" />
            <span>My Profile</span>
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

export default TherapistSideNav;