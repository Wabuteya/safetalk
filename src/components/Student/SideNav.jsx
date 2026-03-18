import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
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
import { FaComments } from 'react-icons/fa';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { usePostCrisis } from '../../contexts/PostCrisisContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import { createCrisisEvent } from '../../utils/crisisEvents';
import CrisisSupportModal from './CrisisSupportModal';
import CrisisResponseModal from './CrisisResponseModal';

const SideNav = ({ closeSidebar }) => {
  const navigate = useNavigate();
  const { user, userProfile } = useUser();
  const { postCrisis, activatePostCrisis } = usePostCrisis();
  const { unreadCount, linkedTherapistId } = useUnreadMessages();
  const [showCrisisSupport, setShowCrisisSupport] = useState(false);
  const [crisisSending, setCrisisSending] = useState(false);
  const [crisisModal, setCrisisModal] = useState(null); // 'sent' | 'no_therapist' | 'error'

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
    
    // Clear localStorage and mood skip (so they get prompted again after next login)
    localStorage.removeItem('userAlias');
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('moodPromptSkipped')) sessionStorage.removeItem(k);
      });
    } catch (_) {}

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
    if (!user?.id) {
      alert('Please log in to use Crisis Support.');
      return;
    }
    setShowCrisisSupport(true);
  };

  const handleNotifyTherapist = async () => {
    setShowCrisisSupport(false);
    setCrisisSending(true);
    try {
      const { data: relation, error: relError } = await supabase
        .from('therapist_student_relations')
        .select('therapist_id')
        .eq('student_id', user.id)
        .maybeSingle();

      if (relError || !relation?.therapist_id) {
        setCrisisModal('no_therapist');
        setCrisisSending(false);
        return;
      }

      const { error } = await createCrisisEvent(user.id, relation.therapist_id, 'crisis_support');
      if (error) throw error;

      activatePostCrisis(relation.therapist_id);
      setCrisisModal('sent');
    } catch (err) {
      console.error('Crisis support error:', err);
      setCrisisModal('error');
    } finally {
      setCrisisSending(false);
    }
  };

  return (
    <>
    <nav className="sidebar">
      <div className="sidebar-logo">
        <img src="/SafeTalk_White.svg" alt="SafeTalk" className="safetalk-logo" />
      </div>
      <div className="sidebar-username">{userAlias}</div>
      <ul className="sidebar-nav">
        <li className="nav-section-label">DASHBOARD</li>
        <li>
          <NavLink to="/student-dashboard" end onClick={closeSidebar}>
            <AiOutlineDashboard className="nav-icon" />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li className="nav-section-label">WELLNESS</li>
        <li>
          <NavLink to="/student-dashboard/journal" onClick={closeSidebar}>
            <FaBook className="nav-icon" />
            <span>My Journal</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/student-dashboard/mood-history" onClick={closeSidebar}>
            <FaHeart className="nav-icon" />
            <span>Mood History</span>
          </NavLink>
        </li>
        <li className="nav-section-label">SUPPORT</li>
        <li>
          <NavLink to="/student-dashboard/therapists" onClick={closeSidebar}>
            <FaUserMd className="nav-icon" />
            <span>Find a Therapist</span>
          </NavLink>
        </li>
        {linkedTherapistId && (
          <li>
            <NavLink to={`/student-dashboard/chat/${linkedTherapistId}`} onClick={closeSidebar}>
              <FaComments className="nav-icon" />
              <span>Chat</span>
              {unreadCount > 0 && (
                <span className="nav-unread-badge" aria-label={`${unreadCount} unread`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          </li>
        )}
        <li>
          <NavLink to="/student-dashboard/resources" onClick={closeSidebar}>
            <FaLightbulb className="nav-icon" />
            <span>Support Resources</span>
          </NavLink>
        </li>
        {postCrisis.therapistResponded && postCrisis.therapistId && (
          <li>
            <button
              type="button"
              className="sidebar-chat-indicator"
              onClick={() => {
                closeSidebar?.();
                navigate(`/student-dashboard/chat/${postCrisis.therapistId}`);
              }}
            >
              <span className="chat-indicator-dot" aria-hidden />
              <span>Chat with therapist — new message</span>
            </button>
          </li>
        )}
        <li className="nav-section-label">ACCOUNT</li>
        <li>
          <NavLink to="/student-dashboard/profile" onClick={closeSidebar}>
            <FaUserCircle className="nav-icon" />
            <span>My Profile</span>
          </NavLink>
        </li>
      </ul>
      <div className="sidebar-footer">
        <div className="crisis-support">
          <button
            type="button"
            className="crisis-btn"
            onClick={handleCrisisSupportClick}
            disabled={crisisSending}
          >
            <FaExclamationTriangle className="crisis-icon" />
            <span>{crisisSending ? 'Sending…' : 'Crisis Support'}</span>
          </button>
          <p>If you are in immediate danger, please call emergency services.</p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="logout-icon" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>

    {showCrisisSupport && (
      <CrisisSupportModal
        onNotifyTherapist={handleNotifyTherapist}
        onCancel={() => setShowCrisisSupport(false)}
      />
    )}

    {crisisModal && (
      <CrisisResponseModal
        therapistNotified={crisisModal === 'sent'}
        noTherapist={crisisModal === 'no_therapist'}
        sendFailed={crisisModal === 'error'}
        onClose={() => setCrisisModal(null)}
      />
    )}
    </>
  );
};

export default SideNav;