import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try multiple times to get user (session might not be ready immediately after navigation)
    const initializeUser = async () => {
      let userFound = false;
      
      // Try up to 3 times with increasing delays
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Wait longer on each attempt
          await new Promise(resolve => setTimeout(resolve, 100 + (attempt * 100)));
          
          // Try to get session first (faster)
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            console.log('Session found on attempt', attempt + 1, 'user:', session.user.user_metadata?.role);
            setUser(session.user);
            setLoading(false);
            userFound = true;
            
            // Fetch profile in background (non-blocking)
            const role = session.user.user_metadata?.role;
          if (role === 'student') {
            supabase
              .from('student_profiles')
              .select('user_id, alias')
              .eq('user_id', session.user.id)
              .maybeSingle()
              .then(({ data: profile, error }) => {
                if (!error && profile) {
                  setUserProfile(profile);
                }
              })
              .catch((err) => {
                // Silently handle errors - profile fetch is not critical
                console.warn('Error fetching student profile:', err);
              });
          } else if (role === 'therapist') {
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
                console.warn('Error fetching therapist profile:', err);
              });
          } else if (role === 'admin') {
            setUserProfile({ user_id: session.user.id });
          }
            break; // Found user, exit loop
          }
        } catch (err) {
          // Continue to next attempt
          console.log('Attempt', attempt + 1, 'failed, retrying...');
        }
      }
      
      // If no user found after all attempts, set loading to false
      if (!userFound) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    };

    initializeUser();

    // Listen for auth changes - this is critical for detecting login
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.user_metadata?.role);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, updating context');
        // Clear old profile data first to avoid stale data
        setUserProfile(null);
        setUser(session.user);
        setLoading(false); // User is signed in, stop loading immediately
        
        // Fetch profile after sign in (non-blocking)
        try {
          const role = session.user.user_metadata?.role;
          console.log('User role:', role);
          
          if (role === 'student') {
            const { data: profile, error: profileError } = await supabase
              .from('student_profiles')
              .select('user_id, alias')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (!profileError && profile) {
              setUserProfile(profile);
            }
          } else if (role === 'therapist') {
            const { data: profile, error: profileError } = await supabase
              .from('therapist_profiles')
              .select('user_id, full_name')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (!profileError && profile) {
              setUserProfile(profile);
            }
          } else if (role === 'admin') {
            // Admin doesn't need a profile
            setUserProfile({ user_id: session.user.id });
          }
        } catch (err) {
          // Silently handle network errors during profile fetch
          if (!err.message?.includes('fetch') && !err.message?.includes('network')) {
            console.error('Error fetching profile after sign in:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        // Clear any cached data
        localStorage.removeItem('userAlias');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update user on token refresh
        setUser(session.user);
      } else if (event === 'USER_UPDATED' && session?.user) {
        // Update user when user data changes
        setUser(session.user);
      }
    });

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
