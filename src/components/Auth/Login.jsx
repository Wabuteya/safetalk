import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { supabase } from '../../supabaseClient';
import PasswordInput from '../PasswordInput';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Login error:', error);
        // Check if error is due to unconfirmed email
        if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
          setError('Please confirm your email address before logging in. Check your inbox for the confirmation link.');
          return;
        }
        throw error;
      }

      if (!data || !data.user) {
        console.error('No user data returned');
        setError('Login failed: No user data received. Please try again.');
        return;
      }

      const userRole = data.user.user_metadata?.role;
      console.log('Login successful, user role:', userRole);
      console.log('User ID:', data.user.id);
      console.log('Full user data:', data.user);

      // Wait for the session to be fully established and UserContext to update
      // Chrome needs more time for session storage to persist
      console.log('Waiting for session to be established...');
      
      // Check if auth state change already fired (it might fire immediately)
      // If not, wait for it with a shorter timeout
      let authStateChanged = false;
      const authStatePromise = new Promise((resolve) => {
        // Check immediately if session is already available
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && session.user.id === data.user.id) {
            console.log('Session already available, auth state likely already changed');
            authStateChanged = true;
            resolve();
            return;
          }
        });
        
        // Set up listener for future auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user && session.user.id === data.user.id) {
            console.log('Auth state change detected: SIGNED_IN');
            authStateChanged = true;
            subscription.unsubscribe();
            resolve();
          }
        });
        
        // Shorter timeout since we check immediately
        setTimeout(() => {
          if (!authStateChanged) {
            console.log('Auth state change timeout, proceeding anyway');
            subscription.unsubscribe();
            resolve();
          }
        }, 1000);
      });
      
      // Wait for auth state and storage to persist (Chrome needs this)
      await Promise.all([
        authStatePromise,
        new Promise(resolve => setTimeout(resolve, 600))
      ]);

      // Verify session is established before navigating
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
      }
      if (!session) {
        console.error('Session not found after login');
        setError('Login failed: Session not established. Please try again.');
        return;
      }

      console.log('Session verified, user ID:', session.user.id);
      console.log('Session user role:', session.user.user_metadata?.role);
      
      // Additional wait for Chrome to fully persist session
      await new Promise(resolve => setTimeout(resolve, 300));

      // Fetch alias from student_profiles table (for students) - non-blocking
      if (userRole === 'student') {
        supabase
          .from('student_profiles')
          .select('alias')
          .eq('user_id', data.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (!profileError && profile?.alias) {
              localStorage.setItem('userAlias', profile.alias);
            } else if (data.user.user_metadata?.alias) {
              localStorage.setItem('userAlias', data.user.user_metadata.alias);
            }
          })
          .catch(() => {
            // Silently fail - alias fetch is not critical for login
            if (data.user.user_metadata?.alias) {
              localStorage.setItem('userAlias', data.user.user_metadata.alias);
            }
          });
      }

      // Navigate using React Router (client-side navigation preserves session)
      console.log('About to navigate. Role:', userRole);
      
      // Determine target route
      let targetRoute = '/student-dashboard';
      if (userRole === 'student') {
        targetRoute = '/student-dashboard';
      } else if (userRole === 'therapist') {
        targetRoute = '/therapist-dashboard';
      } else if (userRole === 'admin') {
        targetRoute = '/admin-dashboard';
      }
      
      console.log('Navigating to:', targetRoute);
      
      // Try React Router navigation first
      navigate(targetRoute, { replace: true });
      
      // Fallback for Chrome: Use window.location if navigate doesn't work after a delay
      // This ensures navigation happens even if React Router has issues
      setTimeout(() => {
        // Check if we're still on login page (navigation didn't work)
        if (window.location.pathname === '/login') {
          console.log('Navigation fallback: Using window.location');
          window.location.href = targetRoute;
        }
      }, 1000);
    } catch (error) {
      console.error('Login catch error:', error);
      setError(error.error_description || error.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student-dashboard`,
        }
      });
    } catch (error) {
      setError(error.error_description || error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <span className="hero-chip">Secure by default</span>
          <h1>Pick up where you left off</h1>
          <p>
            Manage student journeys, respond to live chats, and keep every conversation
            protected inside SafeTalk’s encrypted workspace.
          </p>
          <div className="hero-stat-grid">
            <div className="stat-card">
              <strong>1.2K</strong>
              <span>Students Supported</span>
            </div>
            <div className="stat-card">
              <strong>98%</strong>
              <span>Satisfaction Rate</span>
            </div>
            <div className="stat-card">
              <strong>24/7</strong>
              <span>Secure Access</span>
            </div>
          </div>
        </section>

        <div className="login-card">
        <header className="login-header">
          <h1>Welcome back to SafeTalk</h1>
          <p>Your confidential space for mental health support.</p>
        </header>

        <form onSubmit={handleEmailLogin} className="login-form" noValidate>
          <label className="input-group">
            <span className="input-label">Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              required
            />
          </label>

          <label className="input-group">
            <span className="input-label">Password</span>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="error-message" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="login-btn">
              Log In
            </button>
            <Link to="/forgot-password" className="link-btn">
              Forgot password?
            </Link>
          </div>
        </form>

        <div className="divider">or</div>

        <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
          Continue with Google
        </button>

        <footer className="login-footer">
          <p>
            New to SafeTalk? <Link to="/signup">Create a confidential account</Link>
          </p>
        </footer>
        </div>
      </div>
    </div>
  );
};

export default Login;
