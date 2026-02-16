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

const CrisisAlertsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event');
  const { refreshCount } = useCrisisRealtime() || {};

  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [actingId, setActingId] = useState(null);

  const refreshAlerts = useCallback(async (therapistId) => {
    if (!therapistId) return;
    const events = await getCrisisEventsForTherapistAll(therapistId);
    setAlerts(events);
  }, []);

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
      <header className="crisis-alerts-page-header">
        <h1>Crisis Management</h1>
        <p className="crisis-alerts-subtitle">Centralized view of all crisis events. Open an alert to acknowledge and take action.</p>
      </header>

      <div className="crisis-alerts-main">
        <div className="crisis-alerts-list-panel">
          <h2 className="crisis-alerts-list-title">All alerts ({alerts.length})</h2>
          {alerts.length === 0 ? (
            <div className="crisis-alerts-empty">
              <p>No crisis alerts.</p>
              <p className="subtext">Alerts will appear here when students use Crisis Support or when crises are created.</p>
            </div>
          ) : (
            <div className="crisis-alerts-table-wrap">
              <table className="crisis-alerts-table">
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
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={`crisis-alerts-row ${selectedId === alert.id ? 'selected' : ''} status-${alert.status}`}
                      onClick={() => openAlert(alert)}
                    >
                      <td>{alert.studentAlias}</td>
                      <td>—</td>
                      <td>{formatSource(alert.source)}</td>
                      <td>{formatTime(alert.triggered_at)}</td>
                      <td>
                        <span className={`crisis-alerts-status-badge status-${alert.displayStatus?.toLowerCase()}`}>
                          {alert.displayStatus}
                        </span>
                      </td>
                      <td>{alert.assignedTherapistName}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="crisis-alerts-btn-open"
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

        <div className="crisis-alerts-detail-panel">
          {selectedAlert ? (
            <>
              <h2 className="crisis-alerts-detail-title">Alert details</h2>
              <div className="crisis-alerts-detail-card">
                <div className="crisis-alerts-detail-row">
                  <span className="label">Student</span>
                  <span>{selectedAlert.studentAlias}</span>
                </div>
                <div className="crisis-alerts-detail-row">
                  <span className="label">Risk level</span>
                  <span>—</span>
                </div>
                <div className="crisis-alerts-detail-row">
                  <span className="label">Trigger source</span>
                  <span>{formatSource(selectedAlert.source)}</span>
                </div>
                <div className="crisis-alerts-detail-row">
                  <span className="label">Time triggered</span>
                  <span>{formatTime(selectedAlert.triggered_at)}</span>
                </div>
                <div className="crisis-alerts-detail-row">
                  <span className="label">Current status</span>
                  <span className={`crisis-alerts-status-badge status-${selectedAlert.displayStatus?.toLowerCase()}`}>
                    {selectedAlert.displayStatus}
                  </span>
                </div>
                <div className="crisis-alerts-detail-row">
                  <span className="label">Assigned therapist</span>
                  <span>{selectedAlert.assignedTherapistName}</span>
                </div>
                {selectedAlert.acknowledged_at && (
                  <div className="crisis-alerts-detail-row">
                    <span className="label">Acknowledged at</span>
                    <span>{formatTime(selectedAlert.acknowledged_at)}</span>
                  </div>
                )}
                {selectedAlert.resolved_at && (
                  <div className="crisis-alerts-detail-row">
                    <span className="label">Resolved at</span>
                    <span>{formatTime(selectedAlert.resolved_at)}</span>
                  </div>
                )}
              </div>

              <div className="crisis-alerts-detail-actions">
                <button type="button" className="crisis-alerts-btn-case" onClick={openStudentCase}>
                  Open student case
                </button>
                {selectedAlert.status !== 'resolved' && (
                  <button
                    type="button"
                    className="crisis-alerts-btn-resolve"
                    onClick={handleResolve}
                    disabled={!!actingId}
                  >
                    {actingId === selectedAlert.id ? 'Updating…' : 'Mark as Resolved'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="crisis-alerts-no-selection">
              <h2 className="crisis-alerts-detail-title">Alert details</h2>
              <p>Select an alert from the list to view details and take action.</p>
              <p className="subtext">Opening an alert marks it as Acknowledged if it is still Active.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrisisAlertsPage;
