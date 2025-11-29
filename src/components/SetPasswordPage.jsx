import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './SetPasswordPage.css';
import PasswordInput from './PasswordInput';

const SetPasswordPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    // Check if user has a valid session (from email confirmation link)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    console.error('Session check error:', error);
                    setError('Invalid or expired link. Please request a new invitation.');
                    setCheckingSession(false);
                    return;
                }

                if (!session) {
                    setError('No active session found. Please click the link from your invitation email again.');
                    setCheckingSession(false);
                    return;
                }

                // Verify user is a therapist
                const userRole = session.user.user_metadata?.role;
                if (userRole !== 'therapist') {
                    setError('This page is only for therapists. Please use the appropriate link.');
                    setCheckingSession(false);
                    return;
                }

                setCheckingSession(false);
            } catch (err) {
                console.error('Error checking session:', err);
                setError('Failed to verify your session. Please try again.');
                setCheckingSession(false);
            }
        };

        checkSession();
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
            // Add timeout to prevent hanging
            const timeoutId = setTimeout(() => {
                setError('Request timed out. Please check your internet connection and try again.');
                setLoading(false);
            }, 15000);

            // Update the user's password
            const { data, error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            clearTimeout(timeoutId);

            if (updateError) throw updateError;

            // Verify user role
            const userRole = data.user.user_metadata?.role;
            
            if (userRole !== 'therapist') {
                throw new Error('Invalid user role. This page is only for therapists.');
            }

            setMessage('Password set successfully! Redirecting to your dashboard...');

            // Redirect to therapist dashboard after a short delay
            setTimeout(() => {
                navigate('/therapist-dashboard');
            }, 2000);

        } catch (error) {
            console.error('Password set error:', error);
            setError(error?.error_description || error?.message || 'Failed to set password. Please check your connection and try again.');
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="set-password-layout">
                <div className="set-password-card">
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div className="sp-spinner" style={{ margin: '0 auto 1rem' }}></div>
                        <p>Verifying your invitation...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="set-password-layout">
            <div className="set-password-card">
                <div className="sp-header">
                    <div className="sp-icon">🔐</div>
                    <h2>Set Your Password</h2>
                    <p>Welcome! Please create a secure password for your therapist account. It must be at least 8 characters long.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="sp-form">
                    <div className="sp-form-group">
                        <label htmlFor="password" className="sp-label">Password</label>
                        <PasswordInput 
                            id="password" 
                            value={password} 
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }} 
                            placeholder="Enter your password"
                            className="sp-input"
                            minLength="8"
                            required 
                            disabled={loading}
                            autoComplete="new-password"
                        />
                        <small className="sp-hint">
                            Password must be at least 8 characters long.
                        </small>
                    </div>
                    
                    <div className="sp-form-group">
                        <label htmlFor="confirmPassword" className="sp-label">Confirm Password</label>
                        <PasswordInput 
                            id="confirmPassword" 
                            value={confirmPassword} 
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }} 
                            placeholder="Confirm your password"
                            className="sp-input"
                            minLength="8"
                            required 
                            disabled={loading}
                            autoComplete="new-password"
                        />
                    </div>
                    
                    {message && (
                        <div className="sp-success-message">
                            <span className="sp-message-icon">✓</span>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="sp-error-message">
                            <span className="sp-message-icon">⚠</span>
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="sp-submit-btn" disabled={loading || !!message}>
                        {loading ? (
                            <>
                                <span className="sp-spinner"></span>
                                Setting Password...
                            </>
                        ) : (
                            'Set Password & Continue'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetPasswordPage;

