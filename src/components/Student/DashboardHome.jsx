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
      setLatestMood(null);
      return;
    }
    try {
      const mood = await getLatestMood(user.id);
      setLatestMood(mood);
    } catch (err) {
      console.error('Error fetching latest mood:', err);
      setLatestMood(null);
    } finally {
      setLoadingMood(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLatestMood(null);
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
        <h1 className="welcome-title">Welcome, {userAlias}!</h1>
        <p className="welcome-subtitle">Your safe space is ready. What would you like to do today?</p>
      </div>

      <MessageOfTheDay />

      {latestMood && (
        <div className="dashboard-latest-mood mood-bar">
          <span className="latest-mood-label mood-label">How you're feeling:</span>
          <span className="latest-mood-value mood-value">{moodLabel(latestMood.mood)}</span>
          {latestMood.note && (
            <p className="latest-mood-note">&ldquo;{latestMood.note}&rdquo;</p>
          )}
          <button
            type="button"
            className="latest-mood-link view-history-link"
            onClick={() => navigate('/student-dashboard/mood-history')}
          >
            View mood history
          </button>
        </div>
      )}

      <div className="dashboard-grid">
        <div 
          className="dashboard-card widget-card journal" 
          onClick={() => navigate('/student-dashboard/journal')}
        >
          <div className="dashboard-card-sticker">
            <img
              className="card-sticker-image"
              src="/Sticker/Hand%20holding%20pen-amico.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3 className="card-title">My Journal</h3>
          {loadingJournalCount ? (
            <p className="card-description">Loading...</p>
          ) : (
            <p className="card-description">
              {journalCount === 0 
                ? 'Write down your thoughts. Your privacy is our priority.'
                : `You have ${journalCount} ${journalCount === 1 ? 'entry' : 'entries'} in your journal.`
              }
            </p>
          )}
          <button onClick={(e) => { e.stopPropagation(); navigate('/student-dashboard/journal'); }} className="card-btn">
            Write a New Entry
          </button>
        </div>

        <div 
          className="dashboard-card widget-card resources"
          onClick={() => navigate('/student-dashboard/resources')}
        >
          <div className="dashboard-card-sticker">
            <img
              className="card-sticker-image"
              src="/Sticker/Book%20lover-amico.png"
              alt=""
              aria-hidden="true"
            />
          </div>
          <h3 className="card-title">Support Resources</h3>
          <p className="card-description">Explore articles and tools to support your wellness journey.</p>
          <button onClick={(e) => { e.stopPropagation(); navigate('/student-dashboard/resources'); }} className="card-btn">
            Explore Resources
          </button>
        </div>
        
        <UpcomingAppointmentsWidget />
      </div>
    </div>
  );
};

export default DashboardHome;