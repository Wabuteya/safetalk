import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SideNav from './SideNav';
import './Dashboard.css';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../supabaseClient';

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
      <div className="dashboard-layout" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // If no user after loading, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-layout">
      <SideNav />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;