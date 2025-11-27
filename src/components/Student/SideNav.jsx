import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
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
import { useUser } from '../../contexts/UserContext';

const SideNav = () => {
  const navigate = useNavigate();
  const { userProfile } = useUser(); // Use cached user profile from context

  // Get alias from cached profile or localStorage fallback
  const userAlias = useMemo(() => {
    if (userProfile?.alias) {
      localStorage.setItem('userAlias', userProfile.alias);
      return userProfile.alias;
    }
    return localStorage.getItem('userAlias') || 'Anonymous User';
  }, [userProfile]);

  const handleLogout = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Logout button clicked - starting logout process');
    
    // Clear localStorage immediately
    localStorage.removeItem('userAlias');
    
    // Try to sign out with a timeout
    try {
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 2000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]).catch(() => {
        // If timeout or error, just continue with navigation
        console.log('Sign out timed out or failed, continuing with logout');
        return { error: null };
      });
      
      if (error) {
        console.error('Error signing out:', error);
      } else {
        console.log('Successfully signed out');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
    
    // Always force navigation, even if sign out failed
    console.log('Navigating to home page');
    window.location.href = '/';
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
        <p className="sidebar-alias">{userAlias}</p>
      </div>
      <ul className="sidebar-nav">
        <li className="nav-section-heading">DASHBOARD</li>
        <li>
          <NavLink to="/student-dashboard" end>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">WELLNESS</li>
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
        <li className="nav-section-heading">SUPPORT</li>
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
        <li className="nav-section-heading">ACCOUNT</li>
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