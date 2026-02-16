import React, { useState } from 'react';
import { MOOD_OPTIONS } from '../../utils/moodTracking';
import './MoodPrompt.css';

const MoodPrompt = ({ onClose, onSave }) => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedMood) return;
    setSaving(true);
    try {
      await onSave(selectedMood, note.trim() || null);
      onClose(true);
    } catch (err) {
      console.error('MoodPrompt save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose(false);
  };

  return (
    <div className="mood-prompt-overlay" role="dialog" aria-labelledby="mood-prompt-title" aria-modal="true">
      <div className="mood-prompt-card">
        <h2 id="mood-prompt-title">How are you feeling?</h2>
        <p className="mood-prompt-subtitle">Optional — skip anytime. This is for you only and won’t affect any alerts or support.</p>

        <div className="mood-options" role="group" aria-label="Mood options">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`mood-option-btn ${selectedMood === opt.value ? 'selected' : ''}`}
              onClick={() => setSelectedMood(opt.value)}
              aria-pressed={selectedMood === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mood-note-field">
          <label htmlFor="mood-note">Add a short note (optional)</label>
          <textarea
            id="mood-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="A few words if you’d like..."
            rows={2}
            maxLength={200}
          />
          {note.length > 0 && <span className="mood-note-count">{note.length}/200</span>}
        </div>

        <div className="mood-prompt-actions">
          <button type="button" className="mood-skip-btn" onClick={handleSkip}>
            Skip
          </button>
          <button
            type="button"
            className="mood-save-btn"
            onClick={handleSave}
            disabled={!selectedMood || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoodPrompt;
