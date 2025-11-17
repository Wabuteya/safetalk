import React from 'react';
import { Link } from 'react-router-dom';
import './VerifyEmailPage.css';

const VerifyEmailPage = () => {
  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        <div className="ve-header">
          <div className="ve-icon">📧</div>
          <h2>Almost There!</h2>
          <p className="ve-main-text">
            We've sent a verification link to your email address.
          </p>
          <p className="ve-sub-text">
            Please check your inbox and click the link to activate your account and complete your registration.
          </p>
        </div>
        
        <div className="ve-info-box">
          <div className="ve-info-item">
            <span className="ve-info-icon">✓</span>
            <span>Check your email inbox</span>
          </div>
          <div className="ve-info-item">
            <span className="ve-info-icon">✓</span>
            <span>Click the verification link</span>
          </div>
          <div className="ve-info-item">
            <span className="ve-info-icon">✓</span>
            <span>Complete your registration</span>
          </div>
        </div>

        <div className="ve-footer">
          <p className="ve-help-text">
            Didn't receive the email? Check your spam folder or{' '}
            <Link to="/signup" className="ve-link">try signing up again</Link>.
          </p>
          <div className="ve-back-link">
            <Link to="/login" className="ve-link">
              ← Back to Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default VerifyEmailPage;