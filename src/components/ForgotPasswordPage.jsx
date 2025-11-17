import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './ForgotPasswordPage.css'; // Dedicated CSS file

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setMessage('Password reset link has been sent to your email address.');
        } catch (error) {
            setError(error.error_description || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="forgot-password-layout">
            <div className="forgot-password-card">
                <div className="fp-header">
                    <div className="fp-icon">🔐</div>
                    <h2>Forgot Password?</h2>
                    <p>No problem! Enter your email address and we'll send you a link to reset your password.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="fp-form">
                    <div className="fp-form-group">
                        <label htmlFor="email" className="fp-label">Email Address</label>
                        <input 
                            type="email" 
                            id="email" 
                            value={email} 
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError('');
                                setMessage('');
                            }} 
                            placeholder="you@example.com"
                            className="fp-input"
                            required 
                            disabled={loading}
                            autoComplete="email"
                        />
                    </div>
                    
                    {message && (
                        <div className="fp-success-message">
                            <span className="fp-message-icon">✓</span>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="fp-error-message">
                            <span className="fp-message-icon">⚠</span>
                            {error}
                        </div>
                    )}
                    
                    <button type="submit" className="fp-submit-btn" disabled={loading || !!message}>
                        {loading ? (
                            <>
                                <span className="fp-spinner"></span>
                                Sending...
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>
                
                <div className="fp-back-link">
                    <Link to="/login" className="fp-link">
                        ← Back to Log In
                    </Link>
                </div>
            </div>
        </div>
    );
};
export default ForgotPasswordPage;