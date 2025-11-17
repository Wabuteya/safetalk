import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { supabase } from '../../supabaseClient';

const SideNav = () => {
  const navigate = useNavigate();
  const [userAlias, setUserAlias] = useState('Anonymous User');

  useEffect(() => {
    // Try to get alias from localStorage first
    const storedAlias = localStorage.getItem('userAlias');
    if (storedAlias) {
      setUserAlias(storedAlias);
    }

    // Also fetch from Supabase to ensure we have the latest
    const fetchUserAlias = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.alias) {
          const alias = user.user_metadata.alias;
          setUserAlias(alias);
          localStorage.setItem('userAlias', alias);
        }
      } catch (error) {
        console.error('Error fetching user alias:', error);
      }
    };

    fetchUserAlias();
  }, []);

  const handleLogout = async () => {
    // Clear user session and localStorage
    await supabase.auth.signOut();
    localStorage.removeItem('userAlias');
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
        <p className="sidebar-alias">🐼 {userAlias}</p>
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