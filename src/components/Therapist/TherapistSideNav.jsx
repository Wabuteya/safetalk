import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import { supabase } from '../../supabaseClient';

const TherapistSideNav = () => {
  const navigate = useNavigate();
  const [therapistName, setTherapistName] = useState('Therapist');

  useEffect(() => {
    const fetchTherapistName = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch therapist profile from database
          const { data: profile } = await supabase
            .from('therapist_profiles')
            .select('full_name, title')
            .eq('user_id', user.id)
            .single();

          if (profile?.full_name) {
            // Use title if available, otherwise just use full name
            const displayName = profile.title 
              ? `${profile.title} ${profile.full_name}`
              : profile.full_name;
            setTherapistName(displayName);
          } else {
            // Fallback to user metadata if profile doesn't exist yet
            const metadataName = user.user_metadata?.full_name;
            if (metadataName) {
              setTherapistName(metadataName);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching therapist name:', error);
        // Keep default 'Therapist' if error
      }
    };

    fetchTherapistName();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('userAlias');
    navigate('/', { replace: true });
  };

  return (
    <nav className="sidebar therapist-sidebar">
      <div className="sidebar-header">
        <h3>Therapist Portal</h3>
      </div>
      <div className="sidebar-profile">
        <p className="sidebar-alias">{therapistName}</p>
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