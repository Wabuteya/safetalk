import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../supabaseClient';
import { getLatestMood, MOOD_OPTIONS } from '../../utils/moodTracking';
import UpcomingAppointmentsWidget from './UpcomingAppointmentsWidget';
import MessageOfTheDay from './MessageOfTheDay';

const moodLabel = (value) => MOOD_OPTIONS.find((o) => o.value === value)?.label || value;

const DashboardHome = () => {
  const navigate = useNavigate();
  const { userProfile, user } = useUser(); // Use cached user profile from context
  const [journalCount, setJournalCount] = useState(0);
  const [loadingJournalCount, setLoadingJournalCount] = useState(true);
  const [latestMood, setLatestMood] = useState(null);
  const [loadingMood, setLoadingMood] = useState(true);

  // Get alias from cached profile or localStorage fallback
  const userAlias = useMemo(() => {
    if (userProfile?.alias) {
      localStorage.setItem('userAlias', userProfile.alias);
      return userProfile.alias;
    }
    return localStorage.getItem('userAlias') || 'Welcome';
  }, [userProfile]);

  // Fetch journal entry count
  useEffect(() => {
    const fetchJournalCount = async () => {
      if (!user) {
        setLoadingJournalCount(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('student_id', user.id);

        if (!error && data) {
          setJournalCount(data.length);
        }
      } catch (err) {
        console.error('Error fetching journal count:', err);
      } finally {
        setLoadingJournalCount(false);
      }
    };

    fetchJournalCount();
  }, [user]);

  const fetchLatestMood = useCallback(async () => {
    if (!user?.id) {
      setLoadingMood(false);
      return;
    }
    try {
      const mood = await getLatestMood(user.id);
      setLatestMood(mood);
    } catch (err) {
      console.error('Error fetching latest mood:', err);
    } finally {
      setLoadingMood(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoadingMood(true);
    fetchLatestMood();
  }, [fetchLatestMood]);

  useEffect(() => {
    const onMoodLogged = () => fetchLatestMood();
    window.addEventListener('safetalk:moodLogged', onMoodLogged);
    return () => window.removeEventListener('safetalk:moodLogged', onMoodLogged);
  }, [fetchLatestMood]);

  return (
    <div className="dashboard-home">
      <div className="welcome-header">
        <h1>Welcome, {userAlias}!</h1>
        <p>Your safe space is ready. What would you like to do today?</p>
      </div>

      <MessageOfTheDay />

      {latestMood && (
        <div className="dashboard-latest-mood">
          <span className="latest-mood-label">How you're feeling:</span>
          <span className="latest-mood-value">{moodLabel(latestMood.mood)}</span>
          {latestMood.note && (
            <p className="latest-mood-note">&ldquo;{latestMood.note}&rdquo;</p>
          )}
          <button
            type="button"
            className="latest-mood-link"
            onClick={() => navigate('/student-dashboard/mood-history')}
          >
            View mood history
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        <div 
          className="widget-card journal" 
          onClick={() => navigate('/student-dashboard/journal')}
        >
          <h3>My Journal</h3>
          {loadingJournalCount ? (
            <p>Loading...</p>
          ) : (
            <p>
              {journalCount === 0 
                ? 'Write down your thoughts. Your privacy is our priority.'
                : `You have ${journalCount} ${journalCount === 1 ? 'entry' : 'entries'} in your journal.`
              }
            </p>
          )}
          <button onClick={(e) => {
            e.stopPropagation();
            navigate('/student-dashboard/journal');
          }}>Write a New Entry</button>
        </div>

        <div 
          className="widget-card resources"
          onClick={() => navigate('/student-dashboard/resources')}
        >
          <h3>Support Resources</h3>
          <p>Explore articles and tools to support your wellness journey.</p>
          <button onClick={(e) => {
            e.stopPropagation();
            navigate('/student-dashboard/resources');
          }}>Explore Resources</button>
        </div>
        
        <UpcomingAppointmentsWidget />
      </div>
    </div>
  );
};

export default DashboardHome;