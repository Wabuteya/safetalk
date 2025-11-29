import React, { useState } from 'react';
import './CrisisAlertsPage.css';

const CrisisAlertsPage = () => {
  // No dummy data - will fetch from backend when implemented
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [contactInfoRevealed, setContactInfoRevealed] = useState(false);

  const handleRevealContact = () => {
    // This would involve a password check in a real app
    setContactInfoRevealed(true);
    setShowModal(false);
  };
  
  const handleResolveAlert = () => {
    if (selectedAlert) {
      // In a real app, this sends an API call to the backend
      // For now, this is a placeholder - will be implemented when backend is ready
      alert(`Alert for ${selectedAlert.studentAlias} has been marked as resolved.`);
      const updatedAlerts = alerts.filter(a => a.id !== selectedAlert.id);
      setAlerts(updatedAlerts);
      setSelectedAlert(updatedAlerts[0] || null);
    }
  };


  return (
    <div className="crisis-alerts-layout">
      {/* --- CONFIRMATION MODAL --- */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Confirm Access to Sensitive Information</h3>
            <p>You are about to view a student's confidential emergency contact information. Please confirm that this is a necessary step for managing a crisis situation.</p>
            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="modal-btn cancel">Cancel</button>
              <button onClick={handleRevealContact} className="modal-btn confirm">I Understand, Reveal Info</button>
            </div>
          </div>
        </div>
      )}

      {/* --- LEFT SIDEBAR: ALERT QUEUE --- */}
      <div className="alert-queue">
        <h3>Active Alerts ({alerts.length})</h3>
        {alerts.length === 0 ? (
          <div className="no-alerts-message">
            <p>No active alerts.</p>
            <p className="subtext">Crisis alerts will appear here when detected.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlert(alert);
                setContactInfoRevealed(false);
              }}
            >
              <p className="alias">{alert.studentAlias}</p>
              <p className="trigger">{alert.triggerType}</p>
            </div>
          ))
        )}
      </div>

      {/* --- RIGHT CONTENT: ALERT DETAILS --- */}
      <div className="alert-details">
        {selectedAlert ? (
          <>
            <h2>Alert Details for {selectedAlert.studentAlias}</h2>
            
            <div className="detail-section">
              <h4>Triggering Content</h4>
              <p className="trigger-text">"{selectedAlert.triggerContent}"</p>
              <small>Detected on: {new Date(selectedAlert.timestamp).toLocaleString()}</small>
            </div>

            <div className="detail-section emergency-contact">
              <h4>Emergency Contact Information</h4>
              {contactInfoRevealed ? (
                <div className="contact-info-revealed">
                    <p><strong>Name:</strong> {selectedAlert.emergencyContact.name}</p>
                    <p><strong>Contact:</strong> {selectedAlert.emergencyContact.contact}</p>
                </div>
              ) : (
                <button className="reveal-btn" onClick={() => setShowModal(true)}>
                  Reveal Emergency Contact
                </button>
              )}
            </div>

            <div className="detail-section action-log">
              <h4>Action Log</h4>
              <textarea placeholder="Log actions taken (e.g., 'Contacted student at 10:35am', 'Escalated to university services')..." rows="4"></textarea>
              <button className="resolve-btn" onClick={handleResolveAlert}>Mark as Resolved</button>
            </div>
          </>
        ) : (
          <div className="no-alert-selected">
            <h2>All Clear</h2>
            <p>There are no active alerts that require your attention.</p>
            <p className="subtext">When crisis alerts are detected, they will appear in the sidebar and details will be shown here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrisisAlertsPage;