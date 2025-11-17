import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { supabase } from '../../supabaseClient';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      if (data.user) {
        const userRole = data.user.user_metadata?.role;
        const userAlias = data.user.user_metadata?.alias;

        if (userAlias) {
          localStorage.setItem('userAlias', userAlias);
        } else {
          localStorage.removeItem('userAlias');
        }

        if (userRole === 'student') {
          navigate('/student-dashboard');
        } else if (userRole === 'therapist') {
          navigate('/therapist-dashboard');
        } else if (userRole === 'admin') {
          navigate('/admin-dashboard');
        } else {
          // Handle no role - default to student dashboard
          navigate('/student-dashboard');
        }
      }
    } catch (error) {
      setError(error.error_description || error.message);
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
            <input
              type="password"
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
