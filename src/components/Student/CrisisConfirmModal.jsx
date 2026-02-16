import React from 'react';
import './CrisisConfirmModal.css';

/**
 * Confirmation step before sending a crisis alert. Prevents accidental presses.
 */
const CrisisConfirmModal = ({ onProceed, onCancel }) => (
  <div className="crisis-confirm-overlay" role="dialog" aria-labelledby="crisis-confirm-title" aria-modal="true">
    <div className="crisis-confirm-modal">
      <h2 id="crisis-confirm-title" className="crisis-confirm-title">Confirm Crisis Alert</h2>
      <p className="crisis-confirm-message">You are about to place a Crisis alert. Your therapist will be notified immediately.</p>
      <div className="crisis-confirm-actions">
        <button type="button" className="crisis-confirm-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="crisis-confirm-proceed" onClick={onProceed}>
          Proceed
        </button>
      </div>
    </div>
  </div>
);

export default CrisisConfirmModal;
