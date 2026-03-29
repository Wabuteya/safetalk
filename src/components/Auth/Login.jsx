import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LazyLottie } from '../LazyLottie';
import { FaLock, FaUserSecret, FaStethoscope } from 'react-icons/fa';
import './Login.css';
import { supabase } from '../../supabaseClient';
import PasswordInput from '../PasswordInput';

const LOGIN_LOTTIE_PATH = '/Lottie/Mental%20Wellbeing%20-%20Seek%20Help.json';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      console.log('Attempting login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
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
        // Store subscription reference to avoid race condition
        // The callback can fire synchronously, so we need to handle this carefully
        let subscriptionRef = null;
        
        // Set up listener for auth state changes
        // Store the result first, then extract subscription to avoid race condition
        const authStateChangeResult = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user && session.user.id === data.user.id) {
            console.log('Auth state change detected: SIGNED_IN');
            authStateChanged = true;
            // Use subscriptionRef which is set immediately after this function call
            // Wrap in try-catch to handle edge cases where subscription might not be available
            if (subscriptionRef) {
              try {
                subscriptionRef.unsubscribe();
              } catch (err) {
                console.warn('Error unsubscribing from auth state change:', err);
              }
            }
            resolve();
          }
        });
        
        // Extract and store subscription reference immediately after onAuthStateChange call
        // This must happen right after the call to ensure it's available if callback fires synchronously
        subscriptionRef = authStateChangeResult?.data?.subscription || null;
        
        // Check immediately if session is already available
        supabase.auth.getSession()
          .then(({ data: { session }, error }) => {
            if (error) {
              console.error('Error getting session:', error);
              // Continue anyway - don't block login flow
              return;
            }
            if (session?.user && session.user.id === data.user.id) {
              console.log('Session already available, auth state likely already changed');
              authStateChanged = true;
              // Unsubscribe if subscription is available
              if (subscriptionRef) {
                subscriptionRef.unsubscribe();
              }
              resolve();
              return;
            }
          })
          .catch((err) => {
            console.error('Error in getSession promise:', err);
            // Continue anyway - don't block login flow
            // The timeout will handle proceeding
          });
        
        // Shorter timeout since we check immediately
        setTimeout(() => {
          if (!authStateChanged) {
            console.log('Auth state change timeout, proceeding anyway');
            // Unsubscribe if subscription is available
            if (subscriptionRef) {
              subscriptionRef.unsubscribe();
            }
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

      // For students: check account_status before allowing access
      if (userRole === 'student') {
        const { data: profile, error: profileError } = await supabase
          .from('student_profiles')
          .select('account_status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!profileError && profile && (profile.account_status === 'suspended' || profile.account_status === 'deactivated')) {
          await supabase.auth.signOut();
          setError(
            profile.account_status === 'suspended'
              ? 'Your account has been suspended. Please contact support for assistance.'
              : 'Your account has been deactivated. Please contact support for assistance.'
          );
          return;
        }
      }

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
        <section className="left-panel">
          <div className="left-panel-logo">
            <img src="/SafeTalk_White.svg" alt="SafeTalk" className="safetalk-logo" />
          </div>
          <span className="hero-chip">SECURE BY DEFAULT</span>
          <h1>Pick up where you left off</h1>
          <p>
            Where students and therapists connect. Journal, chat, and keep every conversation
            protected inside SafeTalk’s encrypted workspace.
          </p>
          <div className="left-panel-lottie">
            <LazyLottie path={LOGIN_LOTTIE_PATH} loop={true} />
          </div>
          <div className="trust-row">
            <span><FaLock className="trust-icon" /> End-to-end encrypted</span>
            <span><FaUserSecret className="trust-icon" /> Anonymous journaling</span>
            <span><FaStethoscope className="trust-icon" /> Verified therapists</span>
          </div>
        </section>

        <div className="right-panel">
        <header className="login-header">
          <h1>Welcome back to SafeTalk</h1>
          <p className="login-subtitle">Your confidential space for mental health support.</p>
        </header>

        <form onSubmit={handleEmailLogin} className="login-form">
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
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
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
