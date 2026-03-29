import { useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Password reset links often use the project Site URL ("/") as the origin. Tokens then land on the
 * marketing homepage instead of /update-password, so users never see the reset form.
 *
 * - If the hash still contains type=recovery, forward to /update-password with the same hash/search.
 * - On PASSWORD_RECOVERY, routing is handled in supabaseClient.js (before React mounts) so the event
 *   is never missed. This component only forwards the hash when it is still present on "/".
 */
export default function AuthRecoveryRouteSync() {
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    const path = location.pathname;
    if (path !== '/' && path !== '') return;

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash || hash.length < 2) return;

    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    if (params.get('type') !== 'recovery') return;

    navigate(
      {
        pathname: '/update-password',
        search: window.location.search || location.search,
        hash,
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  return null;
}
