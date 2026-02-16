import React from 'react';
import { EMERGENCY_CONTACTS } from '../../config/emergencyContacts';
import './CrisisResponseModal.css';

/**
 * Post-crisis confirmation shown after "Notify therapist".
 * Calm, minimal, non-technical. No internal alert states.
 */
const CrisisResponseModal = ({ therapistNotified, noTherapist, sendFailed, onClose }) => {
  if (therapistNotified) {
    return (
      <div className="crisis-response-overlay" role="dialog" aria-labelledby="crisis-response-title" aria-modal="true">
        <div className="crisis-response-modal crisis-reassurance">
          <h2 id="crisis-response-title" className="crisis-response-title">Support requested</h2>

          <div className="crisis-response-messages">
            <p className="crisis-response-line">A therapist has been notified.</p>
            <p className="crisis-response-line">They will respond shortly if available.</p>
            <p className="crisis-response-line">If you are in immediate danger, please contact emergency services.</p>
          </div>

          <div className="crisis-calming-content">
            <div className="crisis-calming-section">
              <h4>Breathing exercise</h4>
              <p>Try breathing in slowly for 4 counts, holding for 2, then breathing out for 4. Repeat a few times.</p>
            </div>
            <div className="crisis-calming-section">
              <h4>Grounding prompt</h4>
              <p>Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.</p>
            </div>
            <p className="crisis-supportive-message">You are not alone. Help is available.</p>
          </div>

          <div className="crisis-response-contacts">
            <h3 className="crisis-response-contacts-heading">Emergency contacts</h3>
            <ul className="crisis-response-contact-list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.number}>
                  <a
                    href={`tel:${contact.number.replace(/\s/g, '')}`}
                    className="crisis-response-contact-link"
                  >
                    {contact.label} — {contact.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <button type="button" className="crisis-response-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  if (noTherapist) {
    return (
      <div className="crisis-response-overlay" role="dialog" aria-labelledby="crisis-response-title" aria-modal="true">
        <div className="crisis-response-modal">
          <h2 id="crisis-response-title" className="crisis-response-title">Crisis Support</h2>
          <div className="crisis-response-messages">
            <p className="crisis-response-line">Connect with a therapist from Find a Therapist so they can receive urgent support.</p>
            <p className="crisis-response-line">If you are in immediate danger, please contact emergency services.</p>
          </div>
          <div className="crisis-response-contacts">
            <h3 className="crisis-response-contacts-heading">Emergency contacts</h3>
            <ul className="crisis-response-contact-list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.number}>
                  <a href={`tel:${contact.number.replace(/\s/g, '')}`} className="crisis-response-contact-link">
                    {contact.label} — {contact.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="crisis-response-close" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  if (sendFailed) {
    return (
      <div className="crisis-response-overlay" role="dialog" aria-labelledby="crisis-response-title" aria-modal="true">
        <div className="crisis-response-modal">
          <h2 id="crisis-response-title" className="crisis-response-title">Crisis Support</h2>
          <div className="crisis-response-messages">
            <p className="crisis-response-line">We could not send your request right now. You can still call the numbers below.</p>
          </div>
          <div className="crisis-response-contacts">
            <h3 className="crisis-response-contacts-heading">Emergency contacts</h3>
            <ul className="crisis-response-contact-list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.number}>
                  <a href={`tel:${contact.number.replace(/\s/g, '')}`} className="crisis-response-contact-link">
                    {contact.label} — {contact.number}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <button type="button" className="crisis-response-close" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return null;
};

export default CrisisResponseModal;
