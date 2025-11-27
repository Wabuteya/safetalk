import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './JournalPage.css';

const JournalPage = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser(); // Use cached user from context
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newEntryContent, setNewEntryContent] = useState('');
  const [shareWithTherapist, setShareWithTherapist] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasLinkedTherapist, setHasLinkedTherapist] = useState(false);

  // High-risk keywords for sentiment analysis
  const highRiskKeywords = useMemo(() => [
    'suicide', 'kill myself', 'end my life', 'hopeless', 'worthless', 
    'despair', 'self-harm', 'cut myself', 'overdose'
  ], []);

  // Function to check for high-risk sentiment
  const checkHighRiskSentiment = useCallback((content) => {
    const lowerContent = content.toLowerCase();
    return highRiskKeywords.some(keyword => lowerContent.includes(keyword));
  }, [highRiskKeywords]);

  // Fetch journal entries and therapist relationship in parallel
  useEffect(() => {
    // If userLoading is false and no user, show error
    if (!userLoading && !user) {
      setLoading(false);
      setError('Please log in to view your journal.');
      return;
    }
    
    // If no user yet, wait for userLoading to finish
    if (!user) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        if (!user) {
          setError('Please log in to view your journal.');
          setLoading(false);
          return;
        }

        // Fetch therapist relationship and journal entries in parallel
        const [relationshipResult, entriesResult] = await Promise.all([
          supabase
            .from('therapist_student_relations')
            .select('therapist_id')
            .eq('student_id', user.id)
            .maybeSingle(),
          supabase
            .from('journal_entries')
            .select('id, entry_date, content, is_shared_with_therapist, shared_at, created_at, updated_at') // Only select needed fields
            .eq('student_id', user.id)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false })
        ]).catch((err) => {
          // Handle network errors
          console.error('Network error fetching data:', err);
          throw new Error('Network error: Please check your internet connection and try again.');
        });

        const { data: relationship, error: relError } = relationshipResult;
        const { data: entriesData, error: entriesError } = entriesResult;

        if (relError && relError.code !== 'PGRST116') {
          console.error('Error checking therapist relationship:', relError);
        }

        setHasLinkedTherapist(!!(relationship && relationship.therapist_id));

        if (entriesError) {
          // Provide more helpful error messages
          if (entriesError.message?.includes('Load failed') || entriesError.message?.includes('fetch')) {
            throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
          }
          throw entriesError;
        }

        // Format entries for display
        const formattedEntries = (entriesData || []).map(entry => ({
          id: entry.id,
          date: entry.entry_date,
          content: entry.content,
          isShared: entry.is_shared_with_therapist,
          sharedAt: entry.shared_at,
          createdAt: entry.created_at,
          updatedAt: entry.updated_at,
          hasHighRiskSentiment: checkHighRiskSentiment(entry.content)
        }));

        setEntries(formattedEntries);
      } catch (err) {
        console.error('Error fetching journal entries:', err);
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to load journal entries.';
        if (err.message) {
          if (err.message.includes('Network error') || err.message.includes('fetch') || err.message.includes('Load failed')) {
            errorMessage = 'Network error: Please check your internet connection and try again.';
          } else if (err.message.includes('permission') || err.message.includes('403')) {
            errorMessage = 'Permission denied. Please ensure you are logged in correctly.';
          } else {
            errorMessage = `Failed to load journal entries: ${err.message}`;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    } else {
      setLoading(false);
      setError('Please log in to view your journal.');
    }
  }, [user, userLoading]); // Removed checkHighRiskSentiment - it's stable and doesn't need to trigger re-fetch

  const handleNewEntryClick = () => {
    setSelectedEntry(null);
    setIsCreatingNew(true);
    setNewEntryContent('');
    setShareWithTherapist(false);
    setError('');
  };

  const handleSelectEntry = (entry) => {
    setIsCreatingNew(false);
    setSelectedEntry(entry);
    setError('');
  };

  const handleSaveEntry = async () => {
    if (newEntryContent.trim() === '') {
      alert("Journal entry can't be empty.");
      return;
    }

    if (!user) {
      alert('Please log in to save journal entries.');
      return;
    }

    // Validate therapist link if trying to share
    if (shareWithTherapist && !hasLinkedTherapist) {
      const shouldRedirect = confirm(
        'You need to select a therapist first before you can share journal entries.\n\nWould you like to go to the Find Therapist page now?'
      );
      if (shouldRedirect) {
        navigate('/student-dashboard/therapists');
      } else {
        setShareWithTherapist(false); // Uncheck the checkbox
      }
      return;
    }

    // Warn user that sharing is permanent before saving
    if (shareWithTherapist) {
      const confirmShare = confirm(
        '⚠️ IMPORTANT: Once you share this journal entry, it becomes a permanent part of your therapy record and cannot be unshared.\n\nDo you want to proceed with sharing this entry?'
      );
      if (!confirmShare) {
        setShareWithTherapist(false); // Uncheck if user cancels
        return; // Don't save with sharing enabled
      }
    }

    setSaving(true);
    setError('');

    try {
      const entryDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

      const { data: savedEntry, error: saveError } = await supabase
        .from('journal_entries')
        .insert({
          student_id: user.id,
          entry_date: entryDate,
          content: newEntryContent.trim(),
          is_shared_with_therapist: shareWithTherapist && hasLinkedTherapist
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      // Format the new entry for display
      const formattedEntry = {
        id: savedEntry.id,
        date: savedEntry.entry_date,
        content: savedEntry.content,
        isShared: savedEntry.is_shared_with_therapist,
        sharedAt: savedEntry.shared_at,
        createdAt: savedEntry.created_at,
        updatedAt: savedEntry.updated_at
      };

      // Add to entries list and select it
      setEntries([formattedEntry, ...entries]);
      setSelectedEntry(formattedEntry);
      setIsCreatingNew(false);
      setNewEntryContent('');
      setShareWithTherapist(false);
    } catch (err) {
      console.error('Error saving journal entry:', err);
      setError(`Failed to save entry: ${err.message || 'Unknown error'}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShare = async (entry) => {
    if (!user) {
      alert('Please log in to update journal entries.');
      return;
    }

    // Prevent unsharing - shared entries cannot be unshared
    if (entry.isShared) {
      alert('⚠️ This entry has already been shared with your therapist and cannot be unshared. Shared journal entries become a permanent part of your therapy record.');
      return;
    }

    // If trying to share (enable sharing), check if therapist is linked
    if (!hasLinkedTherapist) {
      const shouldRedirect = confirm(
        'You need to select a therapist first before you can share journal entries.\n\nWould you like to go to the Find Therapist page now?'
      );
      if (shouldRedirect) {
        navigate('/student-dashboard/therapists');
      }
      return; // Don't proceed with sharing
    }

    // Warn user that sharing cannot be undone
    const confirmShare = confirm(
      '⚠️ IMPORTANT: Once you share this journal entry with your therapist, it cannot be unshared. This entry will become a permanent part of your therapy record.\n\nDo you want to proceed with sharing this entry?'
    );

    if (!confirmShare) {
      return; // User canceled
    }

    try {
      const newShareStatus = true; // Only allow sharing, not unsharing

      const { data: updatedEntry, error: updateError } = await supabase
        .from('journal_entries')
        .update({
          is_shared_with_therapist: newShareStatus
        })
        .eq('id', entry.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update the entry in the list
      const updatedEntries = entries.map(e => 
        e.id === entry.id 
          ? {
              ...e,
              isShared: updatedEntry.is_shared_with_therapist,
              sharedAt: updatedEntry.shared_at
            }
          : e
      );

      setEntries(updatedEntries);

      // Update selected entry if it's the one being modified
      if (selectedEntry && selectedEntry.id === entry.id) {
        setSelectedEntry({
          ...selectedEntry,
          isShared: updatedEntry.is_shared_with_therapist,
          sharedAt: updatedEntry.shared_at
        });
      }

      alert('✅ Entry shared with your therapist. This entry is now a permanent part of your therapy record.');
    } catch (err) {
      console.error('Error updating share status:', err);
      alert(`Failed to update share status: ${err.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
      return;
    }

    if (!user) {
      alert('Please log in to delete journal entries.');
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entry.id)
        .eq('student_id', user.id); // Extra safety check

      if (deleteError) {
        throw deleteError;
      }

      // Remove from entries list
      const updatedEntries = entries.filter(e => e.id !== entry.id);
      setEntries(updatedEntries);

      // Clear selection if deleted entry was selected
      if (selectedEntry && selectedEntry.id === entry.id) {
        setSelectedEntry(null);
      }

      alert('Entry deleted successfully.');
    } catch (err) {
      console.error('Error deleting journal entry:', err);
      alert(`Failed to delete entry: ${err.message || 'Unknown error'}. Please try again.`);
    }
  };

  // Show loading if we're fetching data (don't wait for userLoading - it might be stuck)
  if (loading) {
    return (
      <div className="journal-layout">
        <div className="loading-container">
          <p>Loading your journal...</p>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    setError('');
    if (user) {
      // Trigger re-fetch by updating a dependency
      const fetchData = async () => {
        try {
          setLoading(true);
          setError('');

          // Fetch therapist relationship and journal entries in parallel
          const [relationshipResult, entriesResult] = await Promise.all([
            supabase
              .from('therapist_student_relations')
              .select('therapist_id')
              .eq('student_id', user.id)
              .maybeSingle(),
            supabase
              .from('journal_entries')
              .select('id, entry_date, content, is_shared_with_therapist, shared_at, created_at, updated_at')
              .eq('student_id', user.id)
              .order('entry_date', { ascending: false })
              .order('created_at', { ascending: false })
          ]).catch((err) => {
            throw new Error('Network error: Please check your internet connection and try again.');
          });

          const { data: relationship, error: relError } = relationshipResult;
          const { data: entriesData, error: entriesError } = entriesResult;

          if (relError && relError.code !== 'PGRST116') {
            console.error('Error checking therapist relationship:', relError);
          }

          setHasLinkedTherapist(!!(relationship && relationship.therapist_id));

          if (entriesError) {
            if (entriesError.message?.includes('Load failed') || entriesError.message?.includes('fetch')) {
              throw new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            }
            throw entriesError;
          }

          const formattedEntries = (entriesData || []).map(entry => ({
            id: entry.id,
            date: entry.entry_date,
            content: entry.content,
            isShared: entry.is_shared_with_therapist,
            sharedAt: entry.shared_at,
            createdAt: entry.created_at,
            updatedAt: entry.updated_at,
            hasHighRiskSentiment: checkHighRiskSentiment(entry.content)
          }));

          setEntries(formattedEntries);
        } catch (err) {
          console.error('Error fetching journal entries:', err);
          let errorMessage = 'Failed to load journal entries.';
          if (err.message) {
            if (err.message.includes('Network error') || err.message.includes('fetch') || err.message.includes('Load failed')) {
              errorMessage = 'Network error: Please check your internet connection and try again.';
            } else {
              errorMessage = `Failed to load journal entries: ${err.message}`;
            }
          }
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  };

  return (
    <div className="journal-layout">
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span>{error}</span>
            <button className="retry-btn" onClick={handleRetry}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* LEFT COLUMN: Entry List */}
      <div className="journal-sidebar">
        <button className="new-entry-btn" onClick={handleNewEntryClick}>
          + New Entry
        </button>
        <div className="entry-list">
          {entries.length === 0 ? (
            <div className="empty-entries">
              <p>No journal entries yet.</p>
              <p>Click "New Entry" to get started!</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={`entry-item ${selectedEntry?.id === entry.id ? 'active' : ''}`}
                onClick={() => handleSelectEntry(entry)}
              >
                <div className="entry-item-header">
                  <p className="entry-date">{entry.date}</p>
                  {entry.isShared && <span className="shared-indicator">Shared</span>}
                </div>
                <p className="entry-preview">
                  {entry.content.length > 60 
                    ? entry.content.substring(0, 60) + '...' 
                    : entry.content}
                </p>
              </div>
            ))
          )}
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
              disabled={saving}
              rows={15}
            />
            <div className="editor-actions">
              <label className="share-checkbox">
                <input
                  type="checkbox"
                  checked={shareWithTherapist}
                  onChange={(e) => {
                    if (e.target.checked && !hasLinkedTherapist) {
                      const shouldRedirect = confirm(
                        'You need to select a therapist first before you can share journal entries.\n\nWould you like to go to the Find Therapist page now?'
                      );
                      if (shouldRedirect) {
                        navigate('/student-dashboard/therapists');
                        return; // Don't check the box
                      } else {
                        e.target.checked = false; // Uncheck if user cancels
                        return;
                      }
                    }
                    setShareWithTherapist(e.target.checked);
                  }}
                  disabled={saving}
                />
                Share this entry with your therapist
                {!hasLinkedTherapist && (
                  <span className="no-therapist-warning"> (Select a therapist first)</span>
                )}
                {hasLinkedTherapist && (
                  <span className="permanent-warning"> (Permanent - cannot be unshared)</span>
                )}
              </label>
              <div className="editor-buttons">
                <button 
                  className="cancel-btn" 
                  onClick={() => {
                    setIsCreatingNew(false);
                    setNewEntryContent('');
                    setShareWithTherapist(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={handleSaveEntry}
                  disabled={saving || !newEntryContent.trim()}
                >
                  {saving ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        ) : selectedEntry ? (
          // --- Viewing a Selected Entry ---
          <div className="journal-viewer">
            <div className="viewer-header">
              <div>
                <h2>Entry from {selectedEntry.date}</h2>
                {selectedEntry.isShared && (
                  <span className="shared-indicator large">Shared with Therapist</span>
                )}
              </div>
              <div className="viewer-actions">
                {!selectedEntry.isShared && (
                  <button
                    className="toggle-share-btn"
                    onClick={() => handleToggleShare(selectedEntry)}
                    disabled={!hasLinkedTherapist}
                    title={!hasLinkedTherapist ? 'Select a therapist first to share entries' : 'Share this entry (permanent action)'}
                  >
                    🔓 Share with Therapist
                  </button>
                )}
                {selectedEntry.isShared && (
                  <span className="permanent-shared-badge">🔒 Permanently Shared</span>
                )}
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteEntry(selectedEntry)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            <div className="viewer-content">
              <p>{selectedEntry.content}</p>
            </div>
            {selectedEntry.isShared && selectedEntry.sharedAt && (
              <div className="viewer-footer">
                <p className="shared-info">
                  Shared on {new Date(selectedEntry.sharedAt).toLocaleString()}
                </p>
              </div>
            )}
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
