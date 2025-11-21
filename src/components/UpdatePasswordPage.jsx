import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './UpdatePasswordPage.css'; // Dedicated CSS file

const UpdatePasswordPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifyingSession, setVerifyingSession] = useState(true);

    // Check for password reset token in URL and establish session
    useEffect(() => {
        let mounted = true;
        let authListener = null;
        let retryCount = 0;
        const maxRetries = 5;

        const verifySession = async () => {
            try {
                // Check if there's a hash in the URL (password reset tokens come in hash fragments)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const type = hashParams.get('type');

                // Set up auth state listener to catch when Supabase processes the recovery token
                authListener = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('Auth state change:', event, session ? 'Session exists' : 'No session');
                    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                        if (mounted) {
                            setVerifyingSession(false);
                        }
                    }
                });

                // If we have a recovery token in the URL, Supabase will process it automatically
                if (type === 'recovery' && accessToken) {
                    // Supabase automatically processes hash fragments on page load
                    // We need to wait and check for the session with retries
                    const checkSessionWithRetry = async () => {
                        const { data: { session }, error } = await supabase.auth.getSession();
                        
                        if (session) {
                            console.log('Session established successfully');
                            if (mounted) {
                                setVerifyingSession(false);
                            }
                            return;
                        }

                        if (error) {
                            console.error('Session error:', error);
                            if (mounted) {
                                setError('Invalid or expired password reset link. Please request a new one.');
                                setVerifyingSession(false);
                            }
                            return;
                        }

                        // Retry if no session yet
                        retryCount++;
                        if (retryCount < maxRetries && mounted) {
                            setTimeout(checkSessionWithRetry, 500);
                        } else if (mounted) {
                            setError('Failed to verify your password reset link. Please request a new one.');
                            setVerifyingSession(false);
                        }
                    };

                    // Start checking after a brief delay to let Supabase process the hash
                    setTimeout(checkSessionWithRetry, 500);
                } else {
                    // Check if we already have a session (user might have navigated here directly)
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) {
                        console.error('Session error:', sessionError);
                        if (mounted) {
                            setError('Invalid or expired password reset link. Please request a new one.');
                            setVerifyingSession(false);
                        }
                        return;
                    }

                    if (!session) {
                        if (mounted) {
                            setError('No active session found. Please click the link from your password reset email.');
                            setVerifyingSession(false);
                        }
                        return;
                    }

                    if (mounted) {
                        setVerifyingSession(false);
                    }
                }
            } catch (err) {
                console.error('Error verifying session:', err);
                if (mounted) {
                    setError('Failed to verify your password reset link. Please try again.');
                    setVerifyingSession(false);
                }
            }
        };

        verifySession();

        // Cleanup
        return () => {
            mounted = false;
            if (authListener) {
                authListener.data.subscription.unsubscribe();
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        // Validate password length
        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match. Please try again.');
            return;
        }

        setLoading(true);

        try {
            // First, verify we have a session before attempting to update password
            const { data: { session: currentSession }, error: sessionCheckError } = await supabase.auth.getSession();
            
            if (sessionCheckError || !currentSession) {
                throw new Error('No active session found. Please click the link from your password reset email again.');
            }

            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                setError('Request timed out. Please check your internet connection and try again.');
                setLoading(false);
            }, 15000);

            const { data, error } = await supabase.auth.updateUser({
                password: password
            });

            clearTimeout(timeoutId);

            if (error) throw error;
            
            // LOGIC: Now that the password is updated, log them in and redirect
            // The updated user data is in data.user
            const userRole = data.user.user_metadata?.role;
            const userAlias = data.user.user_metadata?.alias;
            
            if (userAlias) {
                localStorage.setItem('userAlias', userAlias);
            }

            setMessage('Password updated successfully! Redirecting...');

            setTimeout(() => {
                if (userRole === 'student') navigate('/student-dashboard');
                else if (userRole === 'therapist') navigate('/therapist-dashboard');
                else if (userRole === 'admin') navigate('/admin-dashboard');
                else navigate('/login'); // Fallback
            }, 2000);

        } catch (error) {
            console.error('Password update error:', error);
            setError(error?.error_description || error?.message || 'Failed to update password. Please check your connection and try again.');
            setLoading(false);
        }
    };

    if (verifyingSession) {
        return (
            <div className="update-password-layout">
                <div className="update-password-card">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="up-spinner" style={{ margin: '0 auto 1rem', width: '32px', height: '32px', borderWidth: '3px' }}></div>
                        <p>Verifying your password reset link...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="update-password-layout">
            <div className="update-password-card">
                <div className="up-header">
                    <div className="up-icon">🔑</div>
                    <h2>Create a New Password</h2>
                    <p>Choose a strong password to secure your account. It must be at least 8 characters long.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="up-form">
                    <div className="up-form-group">
                        <label htmlFor="password" className="up-label">New Password</label>
                        <input 
                            type="password" 
                            id="password" 
                            value={password} 
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }} 
                            placeholder="Enter your new password"
                            className="up-input"
                            minLength="8"
                            required 
                            disabled={loading}
                            autoComplete="new-password"
                        />
                        <small className="up-hint">
                            Password must be at least 8 characters long.
                        </small>
                    </div>
                    
                    <div className="up-form-group">
                        <label htmlFor="confirmPassword" className="up-label">Confirm New Password</label>
                        <input 
                            type="password" 
                            id="confirmPassword" 
                            value={confirmPassword} 
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }} 
                            placeholder="Confirm your new password"
                            className="up-input"
                            minLength="8"
                            required 
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>
                    
                    {message && (
                        <div className="up-success-message">
                            <span className="up-message-icon">✓</span>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="up-error-message">
                            <span className="up-message-icon">⚠</span>
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="up-submit-btn" disabled={loading || !!message}>
                        {loading ? (
                            <>
                                <span className="up-spinner"></span>
                                Updating...
                            </>
                        ) : (
                            'Update Password & Log In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default UpdatePasswordPage;