import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [userAlias, setUserAlias] = useState('Welcome');

  useEffect(() => {
    // Try to get alias from localStorage first (for quick display)
    const storedAlias = localStorage.getItem('userAlias');
    if (storedAlias) {
      setUserAlias(storedAlias);
    }

    // Also fetch from Supabase to ensure we have the latest
    const fetchUserAlias = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.alias) {
          const alias = user.user_metadata.alias;
          setUserAlias(alias);
          localStorage.setItem('userAlias', alias);
        }
      } catch (error) {
        console.error('Error fetching user alias:', error);
      }
    };

    fetchUserAlias();
  }, []);

  return (
    <div className="dashboard-home">
      <div className="welcome-header">
        <h1>Welcome, {userAlias}!</h1>
        <p>Your safe space is ready. What would you like to do today?</p>
      </div>

      <div className="dashboard-grid">
        <div className="widget-card mood-tracker">
          <h3>How are you feeling?</h3>
          <p>Quickly track your mood for the day.</p>
          <div className="mood-options">
            <span>😞</span>
            <span>😕</span>
            <span>😐</span>
            <span>🙂</span>
            <span>😄</span>
          </div>
        </div>

        <div 
          className="widget-card journal" 
          onClick={() => navigate('/student-dashboard/journal')}
        >
          <h3>My Journal</h3>
          <p>Write down your thoughts. Your privacy is our priority.</p>
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
        
        <div className="widget-card appointments">
          <h3>Upcoming Appointments</h3>
          <p>You have no upcoming appointments.</p>
          <button>Book a Session</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;