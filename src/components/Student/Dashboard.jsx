import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SideNav from './SideNav';
import DashboardLayout from '../layout/DashboardLayout';
import MoodPromptGate from './MoodPromptGate';
import PostCrisisBanner from './PostCrisisBanner';
import { PostCrisisProvider } from '../../contexts/PostCrisisContext';
import './Dashboard.css';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../supabaseClient';
import { ACCEPT_TERMS_ROUTE, mustAcceptTermsBeforeApp } from '../../utils/termsAcceptance';

const Dashboard = () => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    console.log('Dashboard useEffect - loading:', loading, 'user:', user ? user.id : 'null');
    
    // Give UserContext time to update after login
    const checkAuth = async () => {
      // Wait a bit for UserContext to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check session directly as fallback
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Dashboard: Session found directly, user:', session.user.user_metadata?.role);
        setCheckingAuth(false);
      } else if (!loading && !user) {
        console.log('No user found in Dashboard, redirecting to login');
        navigate('/login', { replace: true });
        setCheckingAuth(false);
      } else if (!loading && user) {
        console.log('Dashboard rendering with user:', user.user_metadata?.role, 'ID:', user.id);
        if (mustAcceptTermsBeforeApp(user)) {
          navigate(ACCEPT_TERMS_ROUTE, { replace: true });
          setCheckingAuth(false);
          return;
        }
        setCheckingAuth(false);
      } else if (loading) {
        // Still loading, wait a bit more
        setCheckingAuth(true);
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [user, loading, navigate]);

  // Show loading state while checking authentication
  if (loading || checkingAuth) {
    return (
      <div className="dashboard-layout-root" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If no user after loading, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <PostCrisisProvider>
      <DashboardLayout
        sidebar={<SideNav />}
        title="SafeTalk"
        mobileLogoSrc="/SafeTalk_Colour.svg"
      >
        <div className="dashboard-content">
          <PostCrisisBanner />
          <Outlet />
        </div>
      </DashboardLayout>
      <MoodPromptGate />
    </PostCrisisProvider>
  );
};

export default Dashboard;