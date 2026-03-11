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
  Anger: '#DC2626',
  Disgust: '#7C3AED',
  Fear: '#F59E0B',
  Joy: '#10B981',
  Neutral: '#6B7280',
  Sadness: '#003DA5',
  Surprise: '#F97316',
};

const EMOTION_DATA_KEYS = {
  Anger: 'anger_score',
  Disgust: 'disgust_score',
  Fear: 'fear_score',
  Joy: 'joy_score',
  Neutral: 'neutral_score',
  Sadness: 'sadness_score',
  Surprise: 'surprise_score',
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

const RISK_BORDER_COLORS = {
  High: '#DC2626',
  Medium: '#F59E0B',
  Low: '#10B981',
};

/**
 * Emotional Trends — Therapist-only view for journal-derived emotional and risk insights.
 * Students never see this component (role guard + route isolation).
 */
const snippet = (text, maxLen = 60) => {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  if (!t) return null;
  return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`;
};

const EmotionalTrends = ({ studentId }) => {
  const { user } = useUser();
  const [analysisData, setAnalysisData] = useState([]);
  const [journalSnippets, setJournalSnippets] = useState({});
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

  useEffect(() => {
    if (!studentId || !analysisData.length) {
      setJournalSnippets({});
      return;
    }
    const ids = [...new Set(analysisData.map((r) => r.journal_id).filter(Boolean))];
    if (ids.length === 0) {
      setJournalSnippets({});
      return;
    }
    supabase
      .from('journal_entries')
      .select('id, content')
      .in('id', ids)
      .eq('is_shared_with_therapist', true)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((j) => {
          map[j.id] = snippet(j.content);
        });
        setJournalSnippets(map);
      })
      .catch(() => setJournalSnippets({}));
  }, [studentId, analysisData]);

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
    const byDate = new Map();
    analysisData.forEach((row) => {
      const dateKey = formatAxisDate(row.created_at);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey).push(row);
    });
    return Array.from(byDate.entries())
      .map(([dateKey, rows]) => {
        const latest = rows.reduce((acc, r) => (new Date(r.created_at) > new Date(acc.created_at) ? r : acc));
        return { ...latest, timestamp: latest.created_at, date: dateKey };
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [analysisData]);

  const riskHistory = useMemo(() => {
    return [...analysisData]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((entry) => ({
        date: formatAxisDate(entry.created_at),
        level: riskLabel(entry.derived_risk),
        riskLevel: riskLabel(entry.derived_risk),
        journalSnippet: entry.journal_id ? journalSnippets[entry.journal_id] : null,
      }));
  }, [analysisData, journalSnippets]);

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
    const seen = new Set();
    return analysisData
      .map((row, idx) => ({ ...row, idx, date: formatAxisDate(row.created_at) }))
      .filter((r) => {
        const risk = String(r.derived_risk || '').toLowerCase();
        if (risk !== 'high' && risk !== 'medium') return false;
        if (seen.has(r.date)) return false;
        seen.add(r.date);
        return true;
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

  const latestRisk = String(riskSummary.latest?.derived_risk || 'low').toLowerCase();

  return (
    <div className="emotional-trends-container">
      <div className="ai-disclaimer">
        🤖 <strong>AI-generated insight.</strong> Emotional trends are derived from sentiment analysis of both shared and private journal entries. Use as supportive context only — not a clinical diagnosis.
      </div>

      <div className={`risk-card ${latestRisk}`}>
        <h4 className="section-title">Risk Snapshot</h4>
        <div className="risk-summary-body">
          {analysisData.length === 0 ? (
            <p className="emotional-trends-empty">No journal analysis data yet. Trends will appear after journal entries are analyzed.</p>
          ) : (
            <div className="risk-stats">
              <div className="risk-stat">
                <span className="risk-stat-label">Latest risk</span>
                <span className={`risk-stat-value risk-value ${latestRisk}`}>
                  {riskLabel(riskSummary.latest?.derived_risk)}
                </span>
              </div>
              <div className="risk-stat">
                <span className="risk-stat-label">High-risk occurrences</span>
                <span className={`risk-stat-value risk-value ${riskSummary.highCount > 0 ? 'high' : 'neutral'}`}>
                  {riskSummary.highCount}
                </span>
              </div>
              <div className="risk-stat">
                <span className="risk-stat-label">7-day trend</span>
                <span className={`risk-stat-value risk-value ${riskSummary.trend7d}`}>
                  {riskSummary.trend7d === 'increasing' && '↑ Increasing'}
                  {riskSummary.trend7d === 'decreasing' && '↓ Decreasing'}
                  {riskSummary.trend7d === 'stable' && '→ Stable'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chart-card">
        <h4 className="section-title">Emotional Trend Graph</h4>
        <div className="chart-body">
          {chartData.length === 0 ? (
            <p className="emotional-trends-empty">No data to display. Journal analysis will populate this chart.</p>
          ) : (
            <div className="emotional-trends-chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis domain={[0, 1]} stroke="#666" fontSize={12} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {riskMarkers.map((m) => (
                    <ReferenceDot
                      key={`${m.idx}-${m.date}`}
                      x={m.date}
                      y={1}
                      r={6}
                      fill={String(m.derived_risk || '').toLowerCase() === 'high' ? '#DC2626' : '#F59E0B'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}

                  {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
                    <Line
                      key={emotion}
                      type="monotone"
                      dataKey={EMOTION_DATA_KEYS[emotion]}
                      name={emotion}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="risk-legend">
                <span><span className="legend-dot high" /> High risk</span>
                <span><span className="legend-dot medium" /> Medium risk</span>
              </div>
              <p className="chart-note">
                🔴 Red dot indicates a high-risk journal entry detected on that date
              </p>
            </div>
          )}
        </div>
      </div>

      {riskHistory.length > 0 && (
        <div className="risk-history">
          <h4 className="risk-history-title">Risk History</h4>
          {riskHistory.map((entry, i) => {
            const levelClass = ['high', 'medium', 'low'].includes((entry.level || '').toLowerCase())
              ? entry.level.toLowerCase()
              : 'low';
            const borderColor = RISK_BORDER_COLORS[entry.riskLevel] || RISK_BORDER_COLORS.Low;
            return (
            <div key={i} className="risk-history-item" style={{ borderLeftColor: borderColor }}>
              <span className="risk-date">{entry.date}</span>
              <span className={`risk-badge ${levelClass}`}>
                {entry.level}
              </span>
              <span className="risk-trigger">&quot;{entry.journalSnippet || 'Journal entry'}&quot;</span>
            </div>
          );})}
        </div>
      )}
    </div>
  );
};

export default EmotionalTrends;
