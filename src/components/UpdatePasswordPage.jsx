import React, { useState } from 'react';
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