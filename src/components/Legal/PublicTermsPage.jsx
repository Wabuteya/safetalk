import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { ACCEPT_TERMS_ROUTE, mustAcceptTermsBeforeApp } from '../../utils/termsAcceptance';
import TermsMarkdownBody from './TermsMarkdownBody';
import './TermsOfUsePage.css';

/**
 * Public Terms & Conditions (e.g. footer on landing). Sign in / Sign up only — no acceptance checkbox.
 * Logged-in students who still need to accept see a short banner linking to `/accept-terms`.
 */
export default function PublicTermsPage() {
  const [showContinueSetup, setShowContinueSetup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user?.email_confirmed_at) return;
      setShowContinueSetup(mustAcceptTermsBeforeApp(user));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="terms-page">
      <div className="terms-page-inner">
        <header className="terms-page-header">
          <h1>Terms &amp; Conditions</h1>
          <Link to="/" className="terms-back-link">
            ← Home
          </Link>
        </header>

        <p className="terms-public-lead">
          Read our terms below. To use SafeTalk as a student, create an account and confirm your email — you will be asked
          to accept these terms before your first assessment.
        </p>

        <TermsMarkdownBody />

        {showContinueSetup ? (
          <div className="terms-setup-banner" role="status">
            <p>You have verified your email but still need to accept the terms to continue registration.</p>
            <Link to={ACCEPT_TERMS_ROUTE} className="terms-setup-banner-link">
              Continue to acceptance
            </Link>
          </div>
        ) : null}

        <footer className="terms-public-footer terms-public-footer--prominent">
          <Link to="/login">Sign in</Link>
          {' · '}
          <Link to="/signup">Create an account</Link>
        </footer>
      </div>
    </div>
  );
}
