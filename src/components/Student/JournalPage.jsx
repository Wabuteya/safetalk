import React, { useState } from 'react';
import './JournalPage.css';

// MOCK DATA: In a real app, this would come from a backend API.
const initialEntries = [
  {
    id: 1,
    date: '2025-11-10',
    content: 'Today was a tough day. I felt overwhelmed by my upcoming exams. Writing this down helps to clear my head a bit.',
    isShared: false,
  },
  {
    id: 2,
    date: '2025-11-12',
    content: 'Felt a bit better today. I spoke with a friend and it really helped lift my spirits. Maybe I should reach out more often.',
    isShared: true,
  }
];

const JournalPage = () => {
  const [entries, setEntries] = useState(initialEntries);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [shareWithTherapist, setShareWithTherapist] = useState(false);

  const handleNewEntryClick = () => {
    setSelectedEntry(null);
    setIsCreatingNew(true);
    setNewEntryContent('');
    setShareWithTherapist(false);
  };

  const handleSelectEntry = (entry) => {
    setIsCreatingNew(false);
    setSelectedEntry(entry);
  };

  const handleSaveEntry = () => {
    if (newEntryContent.trim() === '') {
      alert("Journal entry can't be empty.");
      return;
    }

    const newEntry = {
      id: Date.now(), // Use a timestamp for a unique ID
      date: new Date().toISOString().slice(0, 10), // Get today's date in YYYY-MM-DD format
      content: newEntryContent,
      isShared: shareWithTherapist,
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    
    // Reset the view to show the newly created entry
    setIsCreatingNew(false);
    setSelectedEntry(newEntry);
  };

  return (
    <div className="journal-layout">
      {/* LEFT COLUMN: Entry List */}
      <div className="journal-sidebar">
        <button className="new-entry-btn" onClick={handleNewEntryClick}>
          + New Entry
        </button>
        <div className="entry-list">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`entry-item ${selectedEntry?.id === entry.id ? 'active' : ''}`}
              onClick={() => handleSelectEntry(entry)}
            >
              <p className="entry-date">{entry.date}</p>
              <p className="entry-preview">
                {entry.content.substring(0, 40)}...
              </p>
              {entry.isShared && <span className="shared-indicator">Shared</span>}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Editor/Viewer */}
      <div className="journal-main">
        {isCreatingNew ? (
          // --- Creating a New Entry ---
          <div className="journal-editor">
            <h2>New Journal Entry</h2>
            <textarea
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              placeholder="Write what's on your mind..."
            />
            <div className="editor-actions">
              <label className="share-checkbox">
                <input
                  type="checkbox"
                  checked={shareWithTherapist}
                  onChange={(e) => setShareWithTherapist(e.target.checked)}
                />
                Share this entry with your therapist
              </label>
              <button className="save-btn" onClick={handleSaveEntry}>Save Entry</button>
            </div>
          </div>
        ) : selectedEntry ? (
          // --- Viewing a Selected Entry ---
          <div className="journal-viewer">
            <div className="viewer-header">
              <h2>Entry from {selectedEntry.date}</h2>
              {selectedEntry.isShared && <span className="shared-indicator large">Shared with Therapist</span>}
            </div>
            <p className="viewer-content">
              {selectedEntry.content}
            </p>
          </div>
        ) : (
          // --- Default Welcome Message ---
          <div className="journal-welcome">
            <h2>Welcome to Your Journal</h2>
            <p>Select an entry from the list to read it, or create a new one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalPage;