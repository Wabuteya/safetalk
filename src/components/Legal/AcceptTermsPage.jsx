import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { mustAcceptTermsBeforeApp, recordTermsAcceptance } from '../../utils/termsAcceptance';
import TermsMarkdownBody from './TermsMarkdownBody';
import './TermsOfUsePage.css';

/**
 * Post–email-verification flow: confirmed students who have not yet accepted terms.
 * Not linked from the public footer — use `/terms` for the read-only document + sign in/up.
 */
export default function AcceptTermsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user: nextUser } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!nextUser) {
        navigate('/login', { replace: true });
        return;
      }

      if (!nextUser.email_confirmed_at) {
        navigate('/please-verify', { replace: true });
        return;
      }

      const role = nextUser.user_metadata?.role;
      if (role === 'therapist') {
        navigate('/therapist-dashboard', { replace: true });
        return;
      }
      if (role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
        return;
      }

      if (!mustAcceptTermsBeforeApp(nextUser)) {
        const { data: assess } = await supabase
          .from('assessments')
          .select('id')
          .eq('user_id', nextUser.id)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        navigate(assess ? '/student-dashboard' : '/assessment', { replace: true });
        return;
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleContinue = async () => {
    setError('');
    if (!checked) return;
    setSubmitting(true);
    try {
      const { error: upErr } = await recordTermsAcceptance(supabase);
      if (upErr) throw upErr;
      navigate('/assessment', { replace: true });
    } catch (e) {
      setError(e?.message || 'Could not save your acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="terms-page">
        <div className="terms-page-inner">
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="terms-page">
      <div className="terms-page-inner">
        <header className="terms-page-header">
          <h1>Accept Terms &amp; Conditions</h1>
          <Link to="/" className="terms-back-link">
            ← Home
          </Link>
        </header>

        <p className="terms-accept-lead">
          Your email is verified. Please read the terms below, then check the box to continue to your assessment.
        </p>

        <TermsMarkdownBody />

        <div className="terms-accept-panel">
          <label>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>I have read and agree to the Terms and Conditions of Use.</span>
          </label>
          <div className="terms-accept-actions">
            <button
              type="button"
              className="terms-continue-btn"
              disabled={!checked || submitting}
              onClick={handleContinue}
            >
              {submitting ? 'Saving…' : 'Continue to assessment'}
            </button>
          </div>
          {error ? <p className="terms-error">{error}</p> : null}
        </div>

        <p className="terms-accept-alt">
          Wrong place? <Link to="/terms">View terms only</Link> · <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
