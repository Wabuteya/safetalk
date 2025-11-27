import React from 'react';
import './MoodHistoryPage.css';

const MoodHistoryPage = () => {
  // No dummy data - will fetch from backend when implemented
  const moodData = [];

  return (
    <div className="mood-history-layout">
      <div className="page-header">
        <h1>Your Mood History</h1>
      </div>
      
      {moodData.length === 0 ? (
        <div className="empty-mood-state">
          <div className="empty-mood-icon">📊</div>
          <h2>Mood Tracking Coming Soon</h2>
          <p>Track your daily mood and see patterns over time. Your mood history will appear here once you start logging your feelings.</p>
        </div>
      ) : (
        <>
          <div className="time-filters">
            {/* Time filters will appear here when data is available */}
          </div>
          <div className="chart-container">
            {/* Chart will appear here when data is available */}
          </div>
          <div className="insights-container">
            {/* Insights will appear here when data is available */}
          </div>
        </>
      )}
    </div>
  );
};

export default MoodHistoryPage;