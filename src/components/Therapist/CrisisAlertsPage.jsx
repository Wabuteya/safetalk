import React, { useState } from 'react';
import './CrisisAlertsPage.css';

// Mock data for active alerts
const mockAlerts = [
  {
    id: 'alert-001',
    studentAlias: 'Anonymous Panda',
    triggerType: 'High-Risk Keywords in Journal',
    triggerContent: 'I just feel so hopeless and I don\'t see a way out. I feel like it will never get better and I just want it to end.',
    timestamp: '2025-11-15T10:30:00Z',
    status: 'Active',
    emergencyContact: {
        name: 'Alex Doe',
        contact: '123-456-7890',
        relationship: 'Student'
    }
  },
  // Add another alert here to test the queue
];

const CrisisAlertsPage = () => {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [selectedAlert, setSelectedAlert] = useState(alerts[0] || null);
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
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`alert-item ${selectedAlert?.id === alert.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedAlert(alert);
              setContactInfoRevealed(false); // Reset reveal status when switching
            }}
          >
            <p className="alias">{alert.studentAlias}</p>
            <p className="trigger">{alert.triggerType}</p>
          </div>
        ))}
        {alerts.length === 0 && <p className="no-alerts">No active alerts.</p>}
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
            </div>
        )}
      </div>
    </div>
  );
};

export default CrisisAlertsPage;