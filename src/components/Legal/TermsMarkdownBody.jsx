import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import termsSource from '../../../docs/TERMS_AND_CONDITIONS.md?raw';

/**
 * Shared Terms & Conditions document (from markdown).
 */
export default function TermsMarkdownBody() {
  return (
    <div className="terms-document">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{termsSource}</ReactMarkdown>
    </div>
  );
}
