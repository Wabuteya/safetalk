import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useUser } from '../../contexts/UserContext';
import { getMoodHistory, MOOD_OPTIONS, MOOD_VALUES, groupMoodEntriesByDate } from '../../utils/moodTracking';
import './MoodHistoryPage.css';

const moodLabel = (value) => MOOD_OPTIONS.find((o) => o.value === value)?.label || value;

const moodColors = {
  'Difficult': '#7B1D1D',
  'Low': '#F59E0B',
  'Okay': '#3B82F6',
  'Good': '#10B981',
  'Great': '#003DA5',
};

const moodBorderColors = {
  'Difficult': '#7B1D1D',
  'Low': '#F59E0B',
  'Okay': '#3B82F6',
  'Good': '#10B981',
  'Great': '#003DA5',
};

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

const formatChartDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const MoodHistoryPage = () => {
  const { user } = useUser();
  const [moodData, setMoodData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'

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

  const filtered = useMemo(() => {
    return moodData.filter((entry) => {
      const age = Date.now() - new Date(entry.logged_at).getTime();
      const days = age / (24 * 60 * 60 * 1000);
      return days <= range;
    });
  }, [moodData, range]);

  const chartData = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
      .map((entry) => ({
        date: formatChartDate(entry.logged_at),
        fullDate: formatDate(entry.logged_at),
        value: MOOD_VALUES[entry.mood] ?? 3,
        mood: moodLabel(entry.mood),
        note: entry.note,
      }));
  }, [filtered]);

  const trendCounts = filtered.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  const groupedEntries = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());
    return groupMoodEntriesByDate(sorted);
  }, [filtered]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="mood-chart-tooltip">
        <div className="tooltip-date">{d.fullDate}</div>
        <div className="tooltip-mood">{d.mood} ({d.value}/5)</div>
        {d.note && <div className="tooltip-note">&ldquo;{d.note}&rdquo;</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="mood-history-layout">
        <div className="page-header">
          <h1 className="page-title">Your Mood History</h1>
        </div>
        <p>Loading mood history…</p>
      </div>
    );
  }

  return (
    <div className="mood-history-layout">
      <div className="page-header">
        <h1 className="page-title">Your Mood History</h1>
        <div className="time-filters">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              className={`filter-btn ${range === days ? 'active' : ''}`}
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
          <div className="mood-trends-section chart-container chart-card">
            <div className="chart-header">
              <h3 className="card-section-title">Mood over time</h3>
              <div className="chart-type-toggle chart-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => setChartType('line')}
                >
                  Line
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </button>
              </div>
            </div>
            <p className="chart-legend">Scale: 1 = Difficult, 5 = Great</p>
            <div className="mood-chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                {chartType === 'line' ? (
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#003DA5"
                      strokeWidth={2.5}
                      dot={{ fill: '#003DA5', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#003DA5' }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#003DA5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mood-overview-section chart-container overview-card">
            <h3 className="card-section-title">Mood overview</h3>
            <div className="mood-trend-bars">
              {[...MOOD_OPTIONS].reverse().map((opt) => {
                const count = trendCounts[opt.value] || 0;
                const pct = filtered.length ? (count / filtered.length) * 100 : 0;
                const value = MOOD_VALUES[opt.value];
                const barColor = moodColors[opt.label] || '#003DA5';
                return (
                  <div key={opt.value} className="mood-trend-row">
                    <span className="mood-trend-label">{opt.label} ({value})</span>
                    <div className="mood-trend-bar-wrap">
                      <div
                        className="mood-trend-bar"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                    <span className="mood-trend-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mood-history-list insights-container history-card">
            <h3 className="card-section-title">History</h3>
            <div className="mood-entries-grouped">
              {groupedEntries.map((group) => (
                <div key={group.key} className="mood-entry-group">
                  <h4 className="mood-group-label">{group.label} ({group.entries.length})</h4>
                  <ul className="mood-history-entries">
                    {group.entries.map((entry) => {
                      const label = moodLabel(entry.mood);
                      const borderColor = moodBorderColors[label] || '#003DA5';
                      return (
                        <li key={entry.id} className="history-entry mood-history-entry" style={{ borderLeftColor: borderColor }}>
                          <span className="entry-timestamp mood-entry-date">{formatDate(entry.logged_at)}</span>
                          <span className="entry-mood mood-entry-mood">
                            {label} ({MOOD_VALUES[entry.mood] ?? '—'}/5)
                          </span>
                          {entry.note && (
                            <p className="mood-entry-note">&ldquo;{entry.note}&rdquo;</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MoodHistoryPage;
