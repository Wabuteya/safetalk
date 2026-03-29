import { Link } from 'react-router-dom';
import TermsMarkdownBody from './TermsMarkdownBody';
import './TermsOfUsePage.css';

/**
 * Public Terms & Conditions — read-only. Linked from the landing footer as `/terms`.
 * No acceptance checkbox; binding acceptance happens only on `/accept-terms` during student signup.
 */
export default function PublicTermsPage() {
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
          to accept these terms as part of registration before your first assessment.
        </p>

        <TermsMarkdownBody />

        <footer className="terms-public-footer terms-public-footer--prominent">
          <Link to="/login">Sign in</Link>
          {' · '}
          <Link to="/signup">Create an account</Link>
        </footer>
      </div>
    </div>
  );
}
