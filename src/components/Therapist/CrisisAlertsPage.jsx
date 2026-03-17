import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  getCrisisEventsForTherapistAll,
  acknowledgeCrisisEvent,
  resolveCrisisEvent,
} from '../../utils/crisisEvents';
import { useCrisisRealtime } from '../../contexts/CrisisRealtimeContext';
import './CrisisAlertsPage.css';

const formatTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const formatSource = (source) => (source ? source.replace(/_/g, ' ') : '—');

const capitalizeName = (name) =>
  name
    ? name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    : '—';

const CrisisAlertsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event');
  const { refreshCount, clearNewAlert } = useCrisisRealtime() || {};

  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'resolved'

  const activeCount = alerts.filter((a) => a.status !== 'resolved').length;
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length;
  const filteredAlerts =
    statusFilter === 'active'
      ? alerts.filter((a) => a.status !== 'resolved')
      : statusFilter === 'resolved'
        ? alerts.filter((a) => a.status === 'resolved')
        : alerts;

  const refreshAlerts = useCallback(async (therapistId) => {
    if (!therapistId) return;
    const events = await getCrisisEventsForTherapistAll(therapistId);
    setAlerts(events);
  }, []);

  useEffect(() => {
    clearNewAlert?.();
  }, [clearNewAlert]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        setLoading(false);
        return;
      }
      setUser(u);
      await refreshAlerts(u.id);
      if (refreshCount) await refreshCount(u.id);
      setLoading(false);
    };
    init();
  }, [refreshAlerts, refreshCount]);

  useEffect(() => {
    if (eventIdParam && alerts.length > 0) {
      const exists = alerts.some((a) => a.id === eventIdParam);
      if (exists) setSelectedId(eventIdParam);
    }
  }, [eventIdParam, alerts]);

  const selectedAlert = alerts.find((a) => a.id === selectedId);

  const openAlert = async (alert) => {
    setSelectedId(alert.id);
    setSearchParams({ event: alert.id }, { replace: true });

    const shouldAcknowledge = ['triggered', 'active', 'escalated'].includes(alert.status);
    if (user?.id && shouldAcknowledge) {
      setActingId(alert.id);
      try {
        await acknowledgeCrisisEvent(alert.id, user.id);
        await refreshAlerts(user.id);
      } catch (err) {
        console.error('Acknowledge on open failed:', err);
      } finally {
        setActingId(null);
      }
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert || !user?.id) return;
    setActingId(selectedAlert.id);
    try {
      const { error } = await resolveCrisisEvent(selectedAlert.id, user.id);
      if (error) throw error;
      await refreshAlerts(user.id);
      if (refreshCount) await refreshCount(user.id);
    } catch (err) {
      console.error('Resolve failed:', err);
    } finally {
      setActingId(null);
    }
  };

  const openStudentCase = () => {
    if (selectedAlert) navigate(`/therapist-dashboard/student/${selectedAlert.student_id}`);
  };

  if (loading) {
    return (
      <div className="crisis-alerts-layout">
        <div className="crisis-alerts-loading">Loading crisis alerts...</div>
      </div>
    );
  }

  return (
    <div className="crisis-alerts-layout">
      <h1 className="page-title">Crisis Management</h1>
      <p className="page-subtitle">Centralized view of all crisis events. Open an alert to acknowledge and take action.</p>

      <div className="crisis-banner">
        🚨 <strong>Crisis alerts require prompt attention.</strong> Active alerts should be acknowledged within 15 minutes.
      </div>

      <div className="crisis-layout">
        <div className="crisis-alerts-list-panel">
          <div className="alert-filters">
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({alerts.length})
            </button>
            <button
              type="button"
              className={`filter-tab urgent ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-tab ${statusFilter === 'resolved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="crisis-alerts-empty">
              <p>No crisis alerts.</p>
              <p className="subtext">Alerts will appear here when students use Crisis Support or when crises are created.</p>
            </div>
          ) : (
            <div className="crisis-table-wrapper">
              <table className="crisis-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Risk level</th>
                    <th>Trigger source</th>
                    <th>Time triggered</th>
                    <th>Status</th>
                    <th>Assigned therapist</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={`${selectedId === alert.id ? 'selected' : ''} ${alert.status !== 'resolved' ? 'active-alert' : ''}`}
                      onClick={() => openAlert(alert)}
                    >
                      <td>{alert.studentAlias}</td>
                      <td>
                        <span className="risk-badge high">High</span>
                      </td>
                      <td>{formatSource(alert.source)}</td>
                      <td>{formatTime(alert.triggered_at)}</td>
                      <td>
                        <span className={`status-badge ${alert.displayStatus?.toLowerCase()}`}>
                          {alert.displayStatus}
                        </span>
                      </td>
                      <td>{capitalizeName(alert.assignedTherapistName)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="open-alert-btn"
                          onClick={() => openAlert(alert)}
                          disabled={actingId === alert.id}
                        >
                          {actingId === alert.id ? '…' : 'Open'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="alert-details-panel">
          <h2 className="panel-title">Alert details</h2>
          {selectedAlert ? (
            <div className="alert-detail-content">
              <div className="detail-row">
                <span className="detail-label">Student</span>
                <span className="detail-value">{selectedAlert.studentAlias}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Risk Level</span>
                <span className={`risk-badge ${(selectedAlert.riskLevel || 'high').toLowerCase()}`}>
                  {selectedAlert.riskLevel || 'High'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trigger</span>
                <span className="detail-value">{formatSource(selectedAlert.source)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time</span>
                <span className="detail-value">{formatTime(selectedAlert.triggered_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`status-badge ${selectedAlert.displayStatus?.toLowerCase()}`}>
                  {selectedAlert.displayStatus}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Therapist</span>
                <span className="detail-value">{capitalizeName(selectedAlert.assignedTherapistName)}</span>
              </div>

              <div className="panel-actions">
                {selectedAlert.status !== 'resolved' &&
                  (selectedAlert.acknowledged_at ? (
                    <button type="button" className="acknowledge-btn" disabled>
                      ✓ Acknowledged
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="acknowledge-btn"
                      onClick={async () => {
                        if (!user?.id) return;
                        setActingId(selectedAlert.id);
                        try {
                          await acknowledgeCrisisEvent(selectedAlert.id, user.id);
                          await refreshAlerts(user.id);
                        } catch (err) {
                          console.error('Acknowledge failed:', err);
                        } finally {
                          setActingId(null);
                        }
                      }}
                      disabled={!!actingId}
                    >
                      {actingId === selectedAlert.id ? '…' : '✓ Acknowledge'}
                    </button>
                  ))}
                <button type="button" className="reveal-identity-btn" onClick={openStudentCase}>
                  🔓 Reveal Student Identity
                </button>
                {selectedAlert.status !== 'resolved' && selectedAlert.acknowledged_at && (
                  <button
                    type="button"
                    className="acknowledge-btn"
                    onClick={handleResolve}
                    disabled={!!actingId}
                  >
                    {actingId === selectedAlert.id ? 'Updating…' : 'Mark as Resolved'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="panel-empty-state">
              Select an alert from the list to view details and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrisisAlertsPage;
