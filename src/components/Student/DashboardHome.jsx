import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../supabaseClient';
import UpcomingAppointmentsWidget from './UpcomingAppointmentsWidget';

const DashboardHome = () => {
  const navigate = useNavigate();
  const { userProfile, user } = useUser(); // Use cached user profile from context
  const [journalCount, setJournalCount] = useState(0);
  const [loadingJournalCount, setLoadingJournalCount] = useState(true);

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

  return (
    <div className="dashboard-home">
      <div className="welcome-header">
        <h1>Welcome, {userAlias}!</h1>
        <p>Your safe space is ready. What would you like to do today?</p>
      </div>

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
          <h3>Motivational Resources</h3>
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