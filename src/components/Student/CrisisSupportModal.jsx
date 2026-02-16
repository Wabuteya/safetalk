import React, { useState } from 'react';
import { EMERGENCY_CONTACTS } from '../../config/emergencyContacts';
import './CrisisSupportModal.css';

/**
 * Crisis Support modal: focused options for clarity and user control.
 * - Contact emergency services: user-initiated call only (tap-to-call links)
 * - Notify therapist: creates crisis alert, routes to assigned or on-call
 * - Cancel: close without action
 */
const CrisisSupportModal = ({ onNotifyTherapist, onCancel }) => {
  const [view, setView] = useState('options'); // 'options' | 'emergency'

  return (
    <div className="crisis-support-overlay" role="dialog" aria-labelledby="crisis-support-title" aria-modal="true">
      <div className="crisis-support-modal">
        <h2 id="crisis-support-title" className="crisis-support-title">Crisis Support</h2>

        {view === 'options' ? (
          <>
            <p className="crisis-support-intro">How would you like to proceed?</p>
            <div className="crisis-support-actions">
              <button
                type="button"
                className="crisis-support-btn emergency"
                onClick={() => setView('emergency')}
              >
                Contact emergency services
              </button>
              <button
                type="button"
                className="crisis-support-btn therapist"
                onClick={() => {
                  onNotifyTherapist();
                }}
              >
                Notify therapist for urgent support
              </button>
              <button
                type="button"
                className="crisis-support-btn cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="crisis-support-intro">Tap a number below to call. No call is made until you tap.</p>
            <ul className="crisis-support-contact-list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.number}>
                  <a
                    href={`tel:${contact.number.replace(/\s/g, '')}`}
                    className="crisis-support-contact-link"
                  >
                    {contact.label} — {contact.number}
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="crisis-support-back"
              onClick={() => setView('options')}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CrisisSupportModal;
