/** Supabase `raw_user_meta_data` key set when the student accepts Terms. */
export const TERMS_ACCEPTED_META_KEY = 'terms_accepted_at';

/** Route where students accept terms after email confirmation (checkbox + assessment). Not the public `/terms` page. */
export const ACCEPT_TERMS_ROUTE = '/accept-terms';

/**
 * Students (including OAuth users before role is set) must accept terms once.
 * Therapists and admins are not gated here.
 */
export function mustAcceptTermsBeforeApp(user) {
  if (!user?.email_confirmed_at) return false;
  const role = user.user_metadata?.role;
  if (role === 'therapist' || role === 'admin') return false;
  return !user.user_metadata?.[TERMS_ACCEPTED_META_KEY];
}

export async function recordTermsAcceptance(supabase) {
  return supabase.auth.updateUser({
    data: { [TERMS_ACCEPTED_META_KEY]: new Date().toISOString() },
  });
}
