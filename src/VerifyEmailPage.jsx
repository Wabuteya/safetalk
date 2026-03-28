import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, SUPABASE_AUTH_STORAGE_KEY } from './supabaseClient';
import { ACCEPT_TERMS_ROUTE } from './utils/termsAcceptance';
import './VerifyEmailPage.css';

const VerifyEmailPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const goToTermsIfVerified = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user?.email_confirmed_at) return;
      navigate(ACCEPT_TERMS_ROUTE, { replace: true });
    };

    const onStorage = (e) => {
      if (e.key !== SUPABASE_AUTH_STORAGE_KEY || !e.newValue) return;
      goToTermsIfVerified();
    };

    window.addEventListener('storage', onStorage);
    goToTermsIfVerified();

    const poll = window.setInterval(goToTermsIfVerified, 1500);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
      window.clearInterval(poll);
    };
  }, [navigate]);

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
          <p className="ve-keep-tab-hint">
            Keep this tab open. After you verify in the email link, we will continue here in this tab automatically.
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
            <span>Review terms, then complete your setup</span>
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