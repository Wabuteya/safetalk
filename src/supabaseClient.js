import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please create a .env file in the project root with:');
  console.error('VITE_SUPABASE_URL=your_supabase_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('\nYou can find these in your Supabase project: Settings → API');
}

// Create client with validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration is missing. Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. ' +
    'Restart your dev server after adding the .env file.'
  );
}

/** Must match auth.storageKey — used for cross-tab session sync (e.g. email verification). */
export const SUPABASE_AUTH_STORAGE_KEY = 'sb-auth-token';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Ensure session is stored properly in Chrome
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

/** Set from UpdatePasswordPage after a successful password change — avoids sending users back here from "/". */
export const PWD_UPDATED_SESSION_FLAG = 'safetalk-pwd-updated-at';

const RECOVERY_ROUTE_DEBOUNCE_MS = 4000;
const RECOVERY_ROUTE_TS_KEY = 'safetalk-auth-recovery-route-ts';

function isMarketingRootPath() {
  const p = window.location.pathname;
  return p === '/' || p === '';
}

function shouldRedirectRootForPasswordRecovery(event, session) {
  if (!session?.user || !isMarketingRootPath()) return false;

  if (event === 'PASSWORD_RECOVERY') return true;

  // Some flows only emit SIGNED_IN / INITIAL_SESSION (e.g. missed PASSWORD_RECOVERY timing).
  if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return false;

  const sent = session.user.recovery_sent_at;
  if (!sent) return false;
  const ageMs = Date.now() - new Date(sent).getTime();
  return ageMs >= 0 && ageMs <= 30 * 60 * 1000;
}

function redirectMarketingRootToUpdatePassword() {
  if (!isMarketingRootPath()) return;

  try {
    const skipUntil = Number(sessionStorage.getItem(PWD_UPDATED_SESSION_FLAG) || '0');
    if (skipUntil && Date.now() - skipUntil < 60 * 60 * 1000) return;

    const prev = Number(sessionStorage.getItem(RECOVERY_ROUTE_TS_KEY) || '0');
    if (Date.now() - prev < RECOVERY_ROUTE_DEBOUNCE_MS) return;
    sessionStorage.setItem(RECOVERY_ROUTE_TS_KEY, String(Date.now()));
  } catch {
    /* sessionStorage unavailable */
  }

  window.location.replace(`${window.location.origin}/update-password`);
}

// Subscribe immediately so we do not miss PASSWORD_RECOVERY (emitted during auth init before React mounts).
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (!shouldRedirectRootForPasswordRecovery(event, session)) return;
    redirectMarketingRootToUpdatePassword();
  });
}