import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../../supabaseClient';
import { mustAcceptTermsBeforeApp, recordTermsAcceptance } from '../../utils/termsAcceptance';
import termsSource from '../../../docs/TERMS_AND_CONDITIONS.md?raw';
import './TermsOfUsePage.css';

const TermsOfUsePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { user: nextUser } } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(nextUser ?? null);
      setLoading(false);

      if (!nextUser?.email_confirmed_at) return;

      if (!mustAcceptTermsBeforeApp(nextUser)) {
        const { data: assess } = await supabase
          .from('assessments')
          .select('id')
          .eq('user_id', nextUser.id)
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        navigate(assess ? '/student-dashboard' : '/assessment', { replace: true });
      }
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

  const showAccept = Boolean(user?.email_confirmed_at && mustAcceptTermsBeforeApp(user));

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
          <h1>Terms &amp; Conditions</h1>
          <Link to="/" className="terms-back-link">
            ← Home
          </Link>
        </header>

        <div className="terms-document">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsSource}</ReactMarkdown>
        </div>

        {showAccept ? (
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
        ) : !user ? (
          <p className="terms-public-footer">
            <Link to="/login">Sign in</Link>
            {' · '}
            <Link to="/signup">Create an account</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default TermsOfUsePage;
