import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
import { useCrisisRealtime } from '../../contexts/CrisisRealtimeContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import StatusSelector from './StatusSelector.jsx';

const TherapistSideNav = ({ closeSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { crisisCount = 0 } = useCrisisRealtime() || {};
  const isOnCrisisPage = location.pathname.startsWith('/therapist-dashboard/alerts');
  const { unreadCount = 0 } = useUnreadMessages();
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
      // Set status to offline before logging out (best effort, don't block logout if it fails)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Use a timeout to prevent blocking logout
          const statusUpdatePromise = supabase
            .from('therapist_profiles')
            .update({ status: 'offline' })
            .eq('user_id', user.id);
          
          // Race against a timeout - don't wait more than 1 second
          await Promise.race([
            statusUpdatePromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
          ]).catch(() => {
            // Silently ignore timeout or errors - logout should proceed regardless
          });
        }
      } catch (error) {
        // Silently ignore errors - logout should proceed regardless
        // Errors are expected if session is already invalidated
      }
      
      // Clear user session
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        // Log but don't block logout
        console.error('Error signing out:', signOutError);
      }
      
      // Clear localStorage
      localStorage.removeItem('userAlias');
      
      // Force navigation to home page (full page reload)
      window.location.href = '/';
    } catch (err) {
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
        <p className="therapist-name sidebar-alias">{therapistName}</p>
        {/* --- ADD THE NEW COMPONENT HERE --- */}
        {user && <StatusSelector userId={user.id} />}
      </div>
      <ul className="sidebar-nav">
        <li className="nav-section-heading">DASHBOARD</li>
        <li>
          <NavLink to="/therapist-dashboard" end onClick={closeSidebar}>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard Home</span>
          </NavLink>
        </li>
        <li className="nav-section-heading">CLIENT MANAGEMENT</li>
        <li>
          <NavLink to="/therapist-dashboard/caseload" onClick={closeSidebar}>
            <FaClipboardList className="nav-icon" />
            <span>My Caseload</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/appointments" onClick={closeSidebar}>
            <FaCalendarCheck className="nav-icon" />
            <span>Appointments</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/live-chat" onClick={closeSidebar}>
            <FaComments className="nav-icon" />
            <span>Live Chat</span>
            {unreadCount > 0 && (
              <span className="crisis-nav-badge unread-messages-badge" aria-label={`${unreadCount} unread`}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        </li>
        <li className="nav-section-heading">RESOURCES</li>
        <li>
          <NavLink to="/therapist-dashboard/resources" onClick={closeSidebar}>
            <FaLightbulb className="nav-icon" />
            <span>Manage Resources</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/therapist-dashboard/alerts" className={({ isActive }) => (isActive ? 'active' : '')} onClick={closeSidebar}>
            <FaBell className="nav-icon" />
            <span>Crisis Management</span>
            {crisisCount > 0 && !isOnCrisisPage && (
              <span className="crisis-nav-badge" aria-label={`${crisisCount} crisis alerts`}>
                {crisisCount > 99 ? '99+' : crisisCount}
              </span>
            )}
          </NavLink>
        </li>
        <li className="nav-section-heading">ACCOUNT</li>
        <li>
          <NavLink to="/therapist-dashboard/profile" onClick={closeSidebar}>
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