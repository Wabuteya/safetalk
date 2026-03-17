import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state change listener FIRST to catch login events immediately
    // This must be set up before initializeUser to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.user_metadata?.role);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, updating context');
        const role = session.user.user_metadata?.role;
        
        // For students: check account_status before allowing access (covers Google OAuth, etc.)
        if (role === 'student') {
          const { data: profile, error: profileError } = await supabase
            .from('student_profiles')
            .select('user_id, alias, account_status')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!profileError && profile && (profile.account_status === 'suspended' || profile.account_status === 'deactivated')) {
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }

        // Clear old profile data first to avoid stale data
        setUserProfile(null);
        setUser(session.user);
        setLoading(false); // User is signed in, stop loading immediately
        
        // Fetch profile after sign in (non-blocking, with retry logic)
        const fetchProfile = async (retries = 3) => {
          try {
            console.log('User role:', role);
            
            if (role === 'student') {
              const { data: profile, error: profileError } = await supabase
                .from('student_profiles')
                .select('user_id, alias')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (!profileError && profile) {
                setUserProfile(profile);
              } else if (profileError && retries > 0) {
                // Retry on network errors
                if (profileError.message?.includes('fetch') || profileError.message?.includes('network')) {
                  console.log('Profile fetch network error, retrying...');
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return fetchProfile(retries - 1);
                }
              }
            } else if (role === 'therapist') {
              const { data: profile, error: profileError } = await supabase
                .from('therapist_profiles')
                .select('user_id, full_name')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (!profileError && profile) {
                setUserProfile(profile);
              } else if (profileError && retries > 0) {
                // Retry on network errors
                if (profileError.message?.includes('fetch') || profileError.message?.includes('network')) {
                  console.log('Profile fetch network error, retrying...');
                  await new Promise(resolve => setTimeout(resolve, 500));
                  return fetchProfile(retries - 1);
                }
              }
            } else if (role === 'admin') {
              // Admin doesn't need a profile
              setUserProfile({ user_id: session.user.id });
            }
          } catch (err) {
            // Retry on network errors
            if ((err.message?.includes('fetch') || err.message?.includes('network')) && retries > 0) {
              console.log('Profile fetch error, retrying...');
              await new Promise(resolve => setTimeout(resolve, 500));
              return fetchProfile(retries - 1);
            }
            // Only log non-network errors
            if (!err.message?.includes('fetch') && !err.message?.includes('network')) {
              console.error('Error fetching profile after sign in:', err);
            }
          }
        };
        
        // Fetch profile in background (non-blocking)
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        // Clear any cached data
        localStorage.removeItem('userAlias');
        try {
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith('moodPromptSkipped')) sessionStorage.removeItem(k);
          });
        } catch (_) {}
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update user on token refresh
        setUser(session.user);
      } else if (event === 'USER_UPDATED' && session?.user) {
        // Update user when user data changes
        setUser(session.user);
      }
    });

    // Try multiple times to get user (session might not be ready immediately after navigation)
    // This runs AFTER the auth state change listener is set up
    const initializeUser = async () => {
      let userFound = false;
      
      // Try up to 5 times with increasing delays (more attempts for first-time login)
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          // Wait longer on each attempt (exponential backoff)
          const delay = 150 + (attempt * 150);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try to get session first (faster)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          // Handle session errors gracefully
          if (sessionError) {
            // Network errors are common on first attempt, continue retrying
            if (sessionError.message?.includes('fetch') || sessionError.message?.includes('network')) {
              console.log('Network error on attempt', attempt + 1, ', retrying...');
              continue;
            }
            // Other errors might be real, but continue anyway
            console.warn('Session error on attempt', attempt + 1, ':', sessionError.message);
          }
          
          if (session?.user) {
            console.log('Session found on attempt', attempt + 1, 'user:', session.user.user_metadata?.role);
            const role = session.user.user_metadata?.role;
            
            // For students: await profile fetch and check account_status before allowing access
            if (role === 'student') {
              const { data: profile, error } = await supabase
                .from('student_profiles')
                .select('user_id, alias, account_status')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (!error && profile && (profile.account_status === 'suspended' || profile.account_status === 'deactivated')) {
                await supabase.auth.signOut();
                setLoading(false);
                break;
              }
              setUser(session.user);
              setLoading(false);
              userFound = true;
              if (!error && profile) {
                setUserProfile(profile);
              }
            } else if (role === 'therapist') {
              setUser(session.user);
              setLoading(false);
              userFound = true;
              supabase
                .from('therapist_profiles')
                .select('user_id, full_name')
                .eq('user_id', session.user.id)
              .maybeSingle()
              .then(({ data: profile, error }) => {
                if (!error && profile) {
                  setUserProfile(profile);
                }
                })
              .catch((err) => {
                // Silently handle errors - profile fetch is not critical
                // Network errors are expected on first attempt
                if (!err.message?.includes('fetch') && !err.message?.includes('network')) {
                  console.warn('Error fetching therapist profile:', err);
                }
              });
            } else if (role === 'admin') {
              setUser(session.user);
              setLoading(false);
              userFound = true;
              setUserProfile({ user_id: session.user.id });
            } else {
              // Fallback for unknown roles - preserve existing behavior
              setUser(session.user);
              setLoading(false);
              userFound = true;
            }
            if (userFound) break; // Found user, exit loop
          }
        } catch (err) {
          // Network errors are common on first attempt, continue retrying
          if (err.message?.includes('fetch') || err.message?.includes('network')) {
            console.log('Network error on attempt', attempt + 1, ', retrying...');
            continue;
          }
          // Continue to next attempt for other errors
          console.log('Attempt', attempt + 1, 'failed, retrying...', err.message);
        }
      }
      
      // Only set loading to false if we're sure there's no user
      // If auth state change listener might still fire, keep loading a bit longer
      if (!userFound) {
        // Give auth state change listener a chance to fire
        // Wait a bit more before giving up
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check one more time after the wait
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('Session found after final wait');
          setUser(session.user);
          setLoading(false);
        } else {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    // Start initialization after auth listener is set up
    initializeUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    refreshUser: async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
    }
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
