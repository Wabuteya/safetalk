import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { fetchJournalAnalysisForStudent } from '../../utils/emotionalTrends';
import './EmotionalTrends.css';

const EMOTION_COLORS = {
  sadness: '#6c5ce7',
  fear: '#e17055',
  joy: '#00b894',
  anger: '#d63031',
  neutral: '#636e72',
  surprise: '#fdcb6e',
  disgust: '#8b7355',
};

const formatTooltipDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatAxisDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const pct = (v) => (v != null && !Number.isNaN(v) ? `${Math.round((v ?? 0) * 100)}%` : '—');

const riskLabel = (r) => (r ? String(r).charAt(0).toUpperCase() + String(r).slice(1).toLowerCase() : '—');

/**
 * Emotional Trends — Therapist-only view for journal-derived emotional and risk insights.
 * Students never see this component (role guard + route isolation).
 */
const EmotionalTrends = ({ studentId }) => {
  const { user } = useUser();
  const [analysisData, setAnalysisData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isTherapist = user?.user_metadata?.role === 'therapist';

  const fetchData = useCallback(async () => {
    if (!studentId || !isTherapist) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const data = await fetchJournalAnalysisForStudent(studentId);
      setAnalysisData(data);
    } catch (err) {
      console.error('Error fetching emotional trends:', err);
      setError('Failed to load emotional trends.');
      setAnalysisData([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, isTherapist]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: subscribe to new journal_analysis inserts for this student
  useEffect(() => {
    if (!studentId || !isTherapist) return;

    const channel = supabase
      .channel(`journal-analysis-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'journal_analysis',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [studentId, isTherapist, fetchData]);

  const chartData = useMemo(() => {
    return analysisData.map((row) => ({
      ...row,
      timestamp: row.created_at,
      dateLabel: formatAxisDate(row.created_at),
    }));
  }, [analysisData]);

  const riskSummary = useMemo(() => {
    if (!analysisData.length) {
      return { latest: null, highCount: 0, trend7d: 'stable' };
    }
    const latest = analysisData[analysisData.length - 1];
    const highCount = analysisData.filter((r) => String(r.derived_risk || '').toLowerCase() === 'high').length;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = analysisData.filter((r) => new Date(r.created_at).getTime() >= sevenDaysAgo);
    const older = analysisData.filter((r) => new Date(r.created_at).getTime() < sevenDaysAgo);

    const recentHigh = recent.filter((r) => String(r.derived_risk || '').toLowerCase() === 'high').length;
    const olderHigh = older.filter((r) => String(r.derived_risk || '').toLowerCase() === 'high').length;

    let trend7d = 'stable';
    if (recent.length > 0 && older.length > 0) {
      if (recentHigh > olderHigh) trend7d = 'increasing';
      else if (recentHigh < olderHigh) trend7d = 'decreasing';
    }

    return { latest, highCount, trend7d };
  }, [analysisData]);

  const riskMarkers = useMemo(() => {
    return analysisData
      .map((row, idx) => ({ ...row, idx }))
      .filter((r) => {
        const risk = String(r.derived_risk || '').toLowerCase();
        return risk === 'high' || risk === 'medium';
      });
  }, [analysisData]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;
    return (
      <div className="emotional-trends-tooltip">
        <div className="emotional-trends-tooltip-date">{formatTooltipDate(d.created_at)}</div>
        <div className="emotional-trends-tooltip-row">
          <span>Sadness</span>
          <span>{pct(d.sadness_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Fear</span>
          <span>{pct(d.fear_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Joy</span>
          <span>{pct(d.joy_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Anger</span>
          <span>{pct(d.anger_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Neutral</span>
          <span>{pct(d.neutral_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Surprise</span>
          <span>{pct(d.surprise_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-row">
          <span>Disgust</span>
          <span>{pct(d.disgust_score)}</span>
        </div>
        <div className="emotional-trends-tooltip-risk">
          <strong>Risk:</strong> {riskLabel(d.derived_risk)}
        </div>
      </div>
    );
  };

  if (!isTherapist) return null;
  if (!studentId) return null;

  if (loading) {
    return (
      <div className="emotional-trends-container">
        <div className="emotional-trends-card">
          <p className="emotional-trends-loading">Loading emotional trends…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="emotional-trends-container">
        <div className="emotional-trends-card emotional-trends-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emotional-trends-container">
      <div className="emotional-trends-card risk-summary-card">
        <h3>Risk Snapshot</h3>
        <div className="emotional-trends-card-body risk-summary-body">
          {analysisData.length === 0 ? (
            <p className="emotional-trends-empty">No journal analysis data yet. Trends will appear after journal entries are analyzed.</p>
          ) : (
            <div className="risk-summary-grid">
              <div className="risk-summary-item">
                <span className="risk-summary-label">Latest risk</span>
                <span className={`risk-summary-value risk-${String(riskSummary.latest?.derived_risk || 'low').toLowerCase()}`}>
                  {riskLabel(riskSummary.latest?.derived_risk)}
                </span>
              </div>
              <div className="risk-summary-item">
                <span className="risk-summary-label">Total high-risk occurrences</span>
                <span className="risk-summary-value">{riskSummary.highCount}</span>
              </div>
              <div className="risk-summary-item">
                <span className="risk-summary-label">7-day trend</span>
                <span className={`risk-summary-value trend-${riskSummary.trend7d}`}>
                  {riskSummary.trend7d === 'increasing' && '↑ Increasing'}
                  {riskSummary.trend7d === 'decreasing' && '↓ Decreasing'}
                  {riskSummary.trend7d === 'stable' && '→ Stable'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="emotional-trends-card">
        <h3>Emotional Trend Graph</h3>
        <div className="emotional-trends-card-body chart-body">
          {chartData.length === 0 ? (
            <p className="emotional-trends-empty">No data to display. Journal analysis will populate this chart.</p>
          ) : (
            <div className="emotional-trends-chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatAxisDate}
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis domain={[0, 1]} stroke="#666" fontSize={12} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {riskMarkers.map((m) => (
                    <ReferenceDot
                      key={`${m.idx}-${m.created_at}`}
                      x={m.created_at}
                      y={1}
                      r={6}
                      fill={String(m.derived_risk || '').toLowerCase() === 'high' ? '#d63031' : '#e17055'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}

                  <Line
                    type="monotone"
                    dataKey="sadness_score"
                    name="Sadness"
                    stroke={EMOTION_COLORS.sadness}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="fear_score"
                    name="Fear"
                    stroke={EMOTION_COLORS.fear}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="joy_score"
                    name="Joy"
                    stroke={EMOTION_COLORS.joy}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="anger_score"
                    name="Anger"
                    stroke={EMOTION_COLORS.anger}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="neutral_score"
                    name="Neutral"
                    stroke={EMOTION_COLORS.neutral}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="surprise_score"
                    name="Surprise"
                    stroke={EMOTION_COLORS.surprise}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="disgust_score"
                    name="Disgust"
                    stroke={EMOTION_COLORS.disgust}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="emotional-trends-legend-helper">
                <span className="marker-high">●</span> High risk &nbsp;
                <span className="marker-medium">●</span> Medium risk
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmotionalTrends;
