import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignUpPage.css';
import { supabase } from '../../supabaseClient';

// --- Alias generation wordlists (outside component) ---
const ADJECTIVES = ['Anonymous', 'Clever', 'Quiet', 'Brave', 'Calm', 'Gentle', 'Happy'];
const NOUNS = ['Panda', 'Koala', 'Bunny', 'Fox', 'Bear', 'Lion', 'Tiger', 'Sparrow'];

const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    
    // Password validation logic
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }
    setPasswordError('');

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      alert('Supabase is not configured. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      console.error('Missing Supabase configuration:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
      return;
    }

    // Generate the alias
    const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const generatedAlias = `${randomAdjective} ${randomNoun}`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'student',
            alias: generatedAlias,
            first_name: formData.firstName,
            last_name: formData.lastName,
            contact: formData.contact,
            gender: formData.gender,
          },
          // This tells Supabase where to send the user AFTER they click the email link
          emailRedirectTo: `${window.location.origin}/assessment`
        }
      });
      
      if (error) {
        console.error('Supabase signup error:', error);
        throw error;
      }
      
      // Check if signup was successful
      if (data?.user) {
        navigate('/please-verify');
      } else {
        alert('Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Signup error details:', error);
      const errorMessage = error?.error_description || error?.message || 'Failed to create account. Please check your connection and try again.';
      alert(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      alert('Supabase is not configured. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/assessment`,
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Google sign-in error details:', error);
      const errorMessage = error?.error_description || error?.message || 'Failed to sign in with Google. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <h2>Create Your Student Account</h2>
          <p>Join SafeTalk to connect with university therapists.</p>
        </div>

        <div className="disclaimer">
          <p><strong>Please Note:</strong> This information will only be used for emergency purposes. Upon login, you will be assigned an anonymous profile to ensure your privacy when interacting with therapists.</p>
        </div>

        <form onSubmit={handleEmailSignUp}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select...
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
                <label htmlFor="contact">Contact Number</label>
                <input type="tel" id="contact" name="contact" value={formData.contact} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          {passwordError && <p className="error-message">{passwordError}</p>}
          
          <button type="submit" className="submit-btn">Create Account</button>
          
          <div className="divider">or</div>

          <button type="button" className="google-btn" onClick={handleGoogleSignIn}>
            Continue with Google
          </button>
        </form>

        <div className="login-link">
          <p>Already have an account? <Link to="/login">Log In</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;