import { NavLink, useNavigate } from 'react-router-dom';
import { 
  FaBook, 
  FaHeart, 
  FaUserMd, 
  FaLightbulb, 
  FaUserCircle,
  FaSignOutAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { AiOutlineDashboard } from 'react-icons/ai';

const SideNav = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear any user session data here
    navigate('/', { replace: true });
  };

  const handleCrisisSupportClick = () => {
    alert(
      'EMERGENCY SUPPORT ACTIVATED\n\nThis would now connect you to emergency services and send a priority alert to a therapist.'
    );
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h3>SafeTalk </h3>
      </div>
      <div className="sidebar-profile">
        <p className="sidebar-alias">🐼 Anonymous Panda</p>
      </div>
      <ul className="sidebar-nav">
        <li>
          <NavLink to="/student-dashboard" end>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/journal">
            <FaBook className="nav-icon" />
            <span>My Journal</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/mood-history">
            <FaHeart className="nav-icon" />
            <span>Mood History</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/therapists">
            <FaUserMd className="nav-icon" />
            <span>Find a Therapist</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/resources">
            <FaLightbulb className="nav-icon" />
            <span>Motivational Resources</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/profile">
            <FaUserCircle className="nav-icon" />
            <span>My Profile</span>
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <div className="crisis-support">
          <button className="crisis-btn" onClick={handleCrisisSupportClick}>
            <FaExclamationTriangle className="crisis-icon" />
            <span>Crisis Support</span>
          </button>
          <p>If you are in immediate danger, please call emergency services.</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
};

export default SideNav;