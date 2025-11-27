import React, { useEffect, useState, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import TherapistSideNav from './TherapistSideNav.jsx';
import { supabase } from '../../supabaseClient';
import './TherapistDashboard.css';

// --- NEW HELPER FUNCTION ---
const updateUserStatus = async (userId, status) => {
    if (!userId) return;

    const { error } = await supabase
        .from('therapist_profiles')
        .update({ status: status })
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error updating user status:', error);
    } else {
        console.log(`Status updated to: ${status}`);
    }
};

const TherapistDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    // Crisis alerts will be fetched from backend when implemented
    const hasCrisisAlert = false;

    // A ref to hold the timer ID, so we can reset it
    const inactivityTimer = useRef(null);

    useEffect(() => {
        const setupDashboard = async () => {
            try {
                // Wait a moment for session to be established after login
                await new Promise(resolve => setTimeout(resolve, 500));

                // Try multiple times to get the user (session might still be establishing)
                let currentUser = null;
                for (let i = 0; i < 5; i++) {
                    const { data: { user }, error: authError } = await supabase.auth.getUser();
                    
                    if (authError) {
                        // Only log real errors, not session errors
                        if (!authError.message?.includes('session') && !authError.message?.includes('Session')) {
                            console.error('Auth error:', authError);
                        }
                    }
                    
                    if (user) {
                        currentUser = user;
                        setUser(user);
                        break;
                    }
                    
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                if (!currentUser) {
                    console.log('No user found after retries, redirecting to login');
                    navigate('/login');
                    setLoading(false);
                    return;
                }

                // 2. Profile completion check
                const { data: profile, error } = await supabase
                    .from('therapist_profiles')
                    .select('is_live, status')
                    .eq('user_id', currentUser.id)
                    .single();
                
                if (error && error.code !== 'PGRST116') {
                    console.error("Error checking profile:", error);
                }

                if (!profile || !profile.is_live) {
                    if (window.location.pathname !== '/therapist-dashboard/profile') {
                        alert("Welcome! Please complete your public profile to become visible to students.");
                        navigate('/therapist-dashboard/profile');
                    }
                } else {
                    // 3. AUTO-ONLINE: Always set status to 'online' when dashboard loads
                    // This ensures therapists are available when they log in
                    const currentStatus = profile.status;
                    console.log('Current status:', currentStatus);
                    
                    // Always set to online on dashboard load (user can manually change it if needed)
                    console.log('Setting status to online on dashboard load');
                    await updateUserStatus(currentUser.id, 'online');
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Error in setupDashboard:', error);
                // Don't redirect on error - let the user see the dashboard
                setLoading(false);
            }
        };

        setupDashboard();
    }, [navigate]);

    useEffect(() => {
        if (!user) return;

        // --- INACTIVITY TIMER LOGIC (AUTO-AWAY) ---
        const resetTimer = () => {
            // Clear the previous timer
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);

            // Set a new timer. After 5 minutes (300000 ms), set status to 'away'
            inactivityTimer.current = setTimeout(() => {
                updateUserStatus(user.id, 'away');
            }, 300000); // 5 minutes
        };

        // Events that count as "activity"
        const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
        activityEvents.forEach(event => window.addEventListener(event, resetTimer));
        
        // Initial timer start
        resetTimer();

        // --- TAB CLOSE/LOGOUT LOGIC (AUTO-OFFLINE) ---
        const handleBeforeUnload = () => {
            // This is a 'best-effort' attempt. Some browsers may block it.
            updateUserStatus(user.id, 'offline');
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup function to remove listeners when the component unmounts
        return () => {
            if (inactivityTimer.current) {
                clearTimeout(inactivityTimer.current);
            }
            activityEvents.forEach(event => window.removeEventListener(event, resetTimer));
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Note: We don't set offline here to avoid conflicts with beforeunload
            // The beforeunload handler will handle tab close, and logout should be handled separately
        };
    }, [user]); // This effect depends on the user object

    if (loading) {
        return (
            <div className="therapist-dashboard-layout">
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    minHeight: '100vh',
                    fontSize: '1.1rem',
                    color: '#5b6888'
                }}>
                    Loading your dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="therapist-dashboard-layout">
            <TherapistSideNav />
            <div className="therapist-main-content">
                {hasCrisisAlert && (
                    <div className="crisis-alert-banner">
                        <strong>CRISIS ALERT:</strong> A student requires your immediate attention. 
                        <a href="/therapist-dashboard/alerts">View Alert Details</a>
                    </div>
                )}
                <main className="therapist-page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default TherapistDashboard;
