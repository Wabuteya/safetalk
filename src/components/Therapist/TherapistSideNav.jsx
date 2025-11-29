import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../supabaseClient';
import StatusSelector from './StatusSelector.jsx'; // Import the new component

const TherapistSideNav = () => {
  const navigate = useNavigate();
  const [therapistName, setTherapistName] = useState('Therapist');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
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

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      // Set status to offline before logging out
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('therapist_profiles')
            .update({ status: 'offline' })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Error setting status to offline on logout:', error);
      }
      
      // Clear user session
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('Error signing out:', signOutError);
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
    <nav className="sidebar therapist-sidebar">
      <div className="sidebar-header">
        <h3>Therapist Portal</h3>
      </div>
      <div className="sidebar-profile">
        <p className="sidebar-alias">{therapistName}</p>
        {/* --- ADD THE NEW COMPONENT HERE --- */}
        {user && <StatusSelector userId={user.id} />}
      </div>
      <ul className="sidebar-nav">
        <li className="nav-section-heading">DASHBOARD</li>
        <li>
          <NavLink to="/therapist-dashboard" end>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard Home</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">CLIENT MANAGEMENT</li>
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
        <li className="nav-section-heading">RESOURCES</li>
        <li>
          <NavLink to="/therapist-dashboard/resources">
            <FaLightbulb className="nav-icon" />
            <span>Manage Resources</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/alerts">
            <FaBell className="nav-icon" />
            <span>Crisis Alerts</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">ACCOUNT</li>
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