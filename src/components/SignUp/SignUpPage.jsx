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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);
    
    // Password validation logic
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase is not configured. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      setLoading(false);
      return;
    }

    // Generate the alias
    const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const generatedAlias = `${randomAdjective} ${randomNoun}`;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
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
      
      if (signUpError) {
        console.error('Supabase signup error:', signUpError);
        console.error('Full error object:', JSON.stringify(signUpError, null, 2));
        
        // Provide more helpful error messages
        let errorMessage = signUpError.error_description || signUpError.message || 'Failed to create account.';
        
        if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
          errorMessage = 'An account with this email already exists. Please log in instead.';
        } else if (errorMessage.includes('email') || errorMessage.includes('confirmation')) {
          // Show the actual error from Supabase for debugging
          errorMessage = `Error sending confirmation email.\n\nSupabase Error: ${errorMessage}\n\nPlease check:\n1. Go to Supabase Dashboard → Authentication → Settings\n2. Enable "Enable email confirmations"\n3. Set Site URL to: http://localhost:5173\n4. Add Redirect URL: http://localhost:5173/**\n5. Go to Email Templates → Reset "Confirm signup" template to default\n\nCheck browser console (F12) for detailed error.`;
        } else if (errorMessage.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a few minutes and try again.';
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      // If signup successful, create student profile in database
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('student_profiles')
            .insert({
              user_id: data.user.id,
              alias: generatedAlias,
              first_name: formData.firstName,
              last_name: formData.lastName,
              contact: formData.contact,
              gender: formData.gender
            });

          if (profileError) {
            console.error('Error creating student profile:', profileError);
            // Don't block signup if profile creation fails - we can retry later
            // But log it for debugging
          } else {
            // Store alias in localStorage for immediate use
            localStorage.setItem('userAlias', generatedAlias);
          }
        } catch (profileErr) {
          console.error('Error creating student profile:', profileErr);
          // Continue anyway - profile can be created later
        }

        // Check if email confirmation is required
        if (data.session === null && data.user) {
          // Email confirmation required - navigate to verification page
          setLoading(false); // Stop loading before navigation
          navigate('/please-verify');
        } else if (data.session) {
          // Email confirmation not required or already confirmed - go to assessment
          setLoading(false); // Stop loading before navigation
          navigate('/assessment');
        } else {
          // Edge case - user created but unclear state
          setError('Account created but email confirmation status is unclear. Please check your email or contact support.');
          setLoading(false);
        }
      } else {
        setError('Signup failed. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Signup error details:', error);
      const errorMessage = error?.error_description || error?.message || 'Failed to create account. Please check your connection and try again.';
      setError(errorMessage);
      setLoading(false);
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
              <input 
                type="text" 
                id="firstName" 
                name="firstName" 
                value={formData.firstName} 
                onChange={handleChange} 
                required 
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName" 
                value={formData.lastName} 
                onChange={handleChange} 
                required 
                disabled={loading}
              />
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
                disabled={loading}
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
                <input 
                  type="tel" 
                  id="contact" 
                  name="contact" 
                  value={formData.contact} 
                  onChange={handleChange} 
                  required 
                  disabled={loading}
                />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={(e) => {
                handleChange(e);
                setError('');
              }} 
              required 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
              disabled={loading}
            />
          </div>

          {passwordError && <p className="error-message">{passwordError}</p>}
          {error && (
            <div className="error-message" style={{ 
              padding: '0.75rem', 
              marginBottom: '1rem', 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              borderRadius: '0.5rem',
              border: '1px solid #f5c6cb',
              fontSize: '0.9rem',
              whiteSpace: 'pre-line'
            }}>
              {error}
            </div>
          )}
          
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
          
          <div className="divider">or</div>

          <button 
            type="button" 
            className="google-btn" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
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