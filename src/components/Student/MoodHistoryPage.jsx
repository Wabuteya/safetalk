import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { getMoodHistory } from '../../utils/moodTracking';
import { MOOD_OPTIONS } from '../../utils/moodTracking';
import './MoodHistoryPage.css';

const moodLabel = (value) => MOOD_OPTIONS.find((o) => o.value === value)?.label || value;

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MoodHistoryPage = () => {
  const { user } = useUser();
  const [moodData, setMoodData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    setMoodData([]);
    const fetchHistory = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getMoodHistory(user.id, 90);
        setMoodData(data);
      } catch (err) {
        console.error('Error fetching mood history:', err);
        setMoodData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user?.id]);

  const filtered = moodData.filter((entry) => {
    const age = Date.now() - new Date(entry.logged_at).getTime();
    const days = age / (24 * 60 * 60 * 1000);
    return days <= range;
  });

  const trendCounts = filtered.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="mood-history-layout">
        <div className="page-header">
          <h1>Your Mood History</h1>
        </div>
        <p>Loading mood history…</p>
      </div>
    );
  }

  return (
    <div className="mood-history-layout">
      <div className="page-header">
        <h1>Your Mood History</h1>
        <div className="time-filters">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={range === days ? 'active' : ''}
              onClick={() => setRange(days)}
            >
              Last {days} days
            </button>
          ))}
        </div>
      </div>

      {moodData.length === 0 ? (
        <div className="empty-mood-state">
          <div className="empty-mood-icon">📊</div>
          <h2>No mood entries yet</h2>
          <p>When you log your mood (from your dashboard or before journaling), your history and trends will appear here.</p>
        </div>
      ) : (
        <>
          <div className="mood-trends-section chart-container">
            <h3>Mood overview</h3>
            <div className="mood-trend-bars">
              {MOOD_OPTIONS.map((opt) => {
                const count = trendCounts[opt.value] || 0;
                const pct = filtered.length ? (count / filtered.length) * 100 : 0;
                return (
                  <div key={opt.value} className="mood-trend-row">
                    <span className="mood-trend-label">{opt.label}</span>
                    <div className="mood-trend-bar-wrap">
                      <div
                        className="mood-trend-bar"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="mood-trend-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mood-history-list insights-container">
            <h3>History</h3>
            <ul className="mood-history-entries">
              {filtered.map((entry) => (
                <li key={entry.id} className="mood-history-entry">
                  <span className="mood-entry-date">{formatDate(entry.logged_at)}</span>
                  <span className={`mood-entry-mood mood-${entry.mood}`}>
                    {moodLabel(entry.mood)}
                  </span>
                  {entry.note && (
                    <p className="mood-entry-note">&ldquo;{entry.note}&rdquo;</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default MoodHistoryPage;
