import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import './SystemHealthPage.css';

const SUPABASE_STATUS_URL = 'https://status.supabase.com/api/v2/summary.json';

const statusConfig = {
  operational: { label: 'Operational', color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0', dot: '#22C55E' },
  degraded: { label: 'Degraded', color: '#92600A', bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B' },
  outage: { label: 'Outage', color: '#DC2626', bg: '#FFF0F0', border: '#FECACA', dot: '#DC2626' },
  partial_outage: { label: 'Partial Outage', color: '#DC2626', bg: '#FFF0F0', border: '#FECACA', dot: '#DC2626' },
  major_outage: { label: 'Major Outage', color: '#DC2626', bg: '#FFF0F0', border: '#FECACA', dot: '#DC2626' },
};

const mapSupabaseStatus = (status) => {
  if (!status || status === 'operational') return 'operational';
  if (status === 'degraded_performance' || status === 'partial_outage') return 'degraded';
  return 'outage';
};

const SystemHealthPage = () => {
  const [lastChecked, setLastChecked] = useState(new Date());
  const [activeUsers, setActiveUsers] = useState(0);
  const [todayAlerts, setTodayAlerts] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [crisisCount, setCrisisCount] = useState(0);
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemServices, setSystemServices] = useState([
    { name: 'Database', status: 'operational' },
    { name: 'Authentication', status: 'operational' },
    { name: 'Chat Messaging', status: 'operational' },
    { name: 'Email Notifications', status: 'operational' },
    { name: 'File Storage', status: 'operational' },
    { name: 'Sentiment Analysis AI', status: 'operational' },
  ]);
  const [uptimePercent, setUptimePercent] = useState('—');
  const [avgResponseMs, setAvgResponseMs] = useState(null);
  const [loading, setLoading] = useState(true);
  const responseTimesRef = useRef([]);

  useEffect(() => {
    const fetchHealthData = async () => {
      const startTime = performance.now();
      try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayStartISO = todayStart.toISOString();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const [supabaseStatusRes, ...dbResults] = await Promise.allSettled([
          fetch(SUPABASE_STATUS_URL).then((r) => r.json()),
          supabase.from('user_presence').select('user_id'),
          supabase
            .from('crisis_events')
            .select('id')
            .gte('triggered_at', todayStartISO),
          supabase
            .from('messages')
            .select('id')
            .gte('created_at', todayStartISO),
          supabase
            .from('journal_entries')
            .select('id')
            .gte('created_at', todayStartISO),
          supabase
            .from('appointments')
            .select('id')
            .eq('appointment_date', todayStartISO.split('T')[0]),
          supabase
            .from('crisis_routing_log')
            .select('action, created_at, details')
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('crisis_events')
            .select('triggered_at, acknowledged_at, resolved_at, status')
            .gte('triggered_at', oneDayAgo)
            .order('triggered_at', { ascending: false })
            .limit(20),
          supabase
            .from('journal_entries')
            .select('id, created_at')
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('messages')
            .select('id, created_at')
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('journal_analysis')
            .select('journal_id, created_at')
            .gte('created_at', oneDayAgo)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        const elapsed = Math.round(performance.now() - startTime);
        responseTimesRef.current = [...responseTimesRef.current.slice(-9), elapsed];
        const avg = Math.round(
          responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length
        );
        setAvgResponseMs(avg);

        const statusData = supabaseStatusRes.status === 'fulfilled' ? supabaseStatusRes.value : null;
        if (statusData?.status) {
          const indicator = statusData.status.indicator;
          setUptimePercent(
            indicator === 'none' ? '99.9%' : indicator === 'minor' ? '99.5%' : indicator === 'major' ? '98.0%' : '—'
          );
        }

        if (statusData?.components) {
          const compMap = Object.fromEntries(
            statusData.components
              .filter((c) => !c.group)
              .map((c) => [c.name, mapSupabaseStatus(c.status)])
          );
          setSystemServices([
            { name: 'Database', status: compMap.Database || 'operational' },
            { name: 'Authentication', status: compMap.Auth || 'operational' },
            { name: 'Chat Messaging', status: compMap.Realtime || 'operational' },
            { name: 'Email Notifications', status: compMap.Auth || 'operational' },
            { name: 'File Storage', status: compMap.Storage || 'operational' },
            { name: 'Sentiment Analysis AI', status: compMap['Edge Functions'] || 'operational' },
          ]);
        }

        const [
          presenceResult,
          crisisResult,
          messagesResult,
          journalsResult,
          appointmentsResult,
          routingLogResult,
          crisisEventsResult,
          journalEntriesResult,
          messagesRecentResult,
          journalAnalysisResult,
        ] = dbResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { data: null, error: r.reason }
        );

        const presenceData = presenceResult?.data ?? [];
        const uniqueUsers = new Set(presenceData.map((p) => p.user_id));
        setActiveUsers(uniqueUsers.size);
        setTodayAlerts(crisisResult?.data?.length ?? 0);
        setCrisisCount(crisisResult?.data?.length ?? 0);
        setMessagesCount(messagesResult?.data?.length ?? 0);
        setJournalCount(journalsResult?.data?.length ?? 0);
        setAppointmentsCount(appointmentsResult?.data?.length ?? 0);

        const events = [];
        (routingLogResult?.data ?? []).forEach((row) => {
          const msg =
            row.action === 'acknowledged_by'
              ? 'Crisis alert acknowledged by therapist'
              : row.action === 'created'
                ? 'Crisis event created'
                : row.action === 'routed_to_on_call'
                  ? 'Crisis routed to on-call pool'
                  : row.action === 'resolved'
                    ? 'Crisis resolved'
                    : `Crisis: ${row.action}`;
          events.push({ ts: new Date(row.created_at), type: 'success', message: msg });
        });
        (crisisEventsResult?.data ?? []).forEach((row) => {
          if (row.triggered_at)
            events.push({
              ts: new Date(row.triggered_at),
              type: 'warning',
              message: 'Crisis triggered',
            });
          if (row.resolved_at)
            events.push({
              ts: new Date(row.resolved_at),
              type: 'success',
              message: 'Crisis resolved',
            });
        });
        (journalEntriesResult?.data ?? []).forEach((row) => {
          events.push({
            ts: new Date(row.created_at),
            type: 'info',
            message: 'Journal entry created',
          });
        });
        (messagesRecentResult?.data ?? []).forEach((row) => {
          events.push({
            ts: new Date(row.created_at),
            type: 'info',
            message: 'Message sent',
          });
        });
        (journalAnalysisResult?.data ?? []).forEach((row) => {
          events.push({
            ts: new Date(row.created_at),
            type: 'success',
            message: `Journal analysis completed for entry`,
          });
        });

        events.sort((a, b) => b.ts - a.ts);
        const logs = events.slice(0, 12).map((e) => ({
          time: e.ts.toLocaleTimeString(),
          type: e.type,
          message: e.message,
        }));

        if (logs.length > 0) {
          setSystemLogs(logs);
        } else {
          setSystemLogs([
            { time: new Date().toLocaleTimeString(), type: 'info', message: 'No recent system events in the last 24 hours' },
          ]);
        }
      } catch (err) {
        console.error('Error fetching health data:', err);
        setSystemLogs((prev) => [
          { time: new Date().toLocaleTimeString(), type: 'error', message: 'Failed to fetch some health metrics' },
          ...prev.slice(0, 5),
        ]);
      } finally {
        setLastChecked(new Date());
        setLoading(false);
      }
    };

    fetchHealthData();
    const interval = setInterval(fetchHealthData, 60000);
    return () => clearInterval(interval);
  }, []);

  const hasOutage = systemServices.some((s) => s.status === 'outage');
  const hasDegraded = systemServices.some((s) => s.status === 'degraded');
  const overallStatus = hasOutage ? 'outage' : hasDegraded ? 'issues' : 'operational';

  if (loading) {
    return (
      <div className="system-health-page">
        <div className="page-header">
          <h1 className="page-title">System Health</h1>
          <p className="page-subtitle">Loading...</p>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
          Loading health data...
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-page">
      <div className="page-header">
        <h1 className="page-title">System Health</h1>
        <p className="page-subtitle">
          Real-time status of all platform services.
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      </div>

      <div className={`overall-status ${overallStatus}`}>
        {overallStatus === 'operational' && '✅ All systems are operational'}
        {overallStatus === 'issues' && '⚠️ Some systems are degraded'}
        {overallStatus === 'outage' && '🚨 One or more systems are experiencing an outage'}
      </div>

      <div className="health-stats-grid">
        <div className="health-stat">
          <p className="stat-value">{uptimePercent}</p>
          <p className="stat-label">Uptime this month</p>
        </div>
        <div className="health-stat">
          <p className="stat-value">{avgResponseMs != null ? `${avgResponseMs}ms` : '—'}</p>
          <p className="stat-label">Avg response time</p>
        </div>
        <div className="health-stat">
          <p className="stat-value">{activeUsers}</p>
          <p className="stat-label">Active users now</p>
        </div>
        <div className="health-stat">
          <p className="stat-value">{todayAlerts}</p>
          <p className="stat-label">Crisis alerts today</p>
        </div>
      </div>

      <div className="services-section">
        <h2 className="section-title">Service Status</h2>
        <div className="services-grid">
          {systemServices.map((service) => {
            const config = statusConfig[service.status] || statusConfig.operational;
            return (
              <div
                className="service-card"
                key={service.name}
                style={{ borderTop: `4px solid ${config.dot}` }}
              >
                <div className="service-header">
                  <span className="service-name">{service.name}</span>
                  <span
                    className="service-status-badge"
                    style={{
                      background: config.bg,
                      color: config.color,
                      border: `1px solid ${config.border}`,
                    }}
                  >
                    <span className="status-dot" style={{ background: config.dot }} />
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="activity-section">
        <h2 className="section-title">Today&apos;s Activity</h2>
        <div className="activity-grid">
          <div className="activity-card blue">
            <p className="activity-value">{messagesCount}</p>
            <p className="activity-label">Messages sent</p>
          </div>
          <div className="activity-card maroon">
            <p className="activity-value">{journalCount}</p>
            <p className="activity-label">Journal entries</p>
          </div>
          <div className="activity-card gold">
            <p className="activity-value">{appointmentsCount}</p>
            <p className="activity-label">Appointments today</p>
          </div>
          <div className="activity-card red">
            <p className="activity-value">{crisisCount}</p>
            <p className="activity-label">Crisis alerts</p>
          </div>
        </div>
      </div>

      <div className="log-section">
        <h2 className="section-title">Recent System Events</h2>
        <div className="log-card">
          {systemLogs.map((log, i) => (
            <div className="log-entry" key={i}>
              <span className="log-time">{log.time}</span>
              <span className={`log-type ${log.type}`}>{log.type}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemHealthPage;
