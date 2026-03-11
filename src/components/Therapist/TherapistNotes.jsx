import React, { useState, useCallback, useEffect } from 'react';
import { LazyLottie } from '../LazyLottie';
import { supabase } from '../../supabaseClient';
import './TherapistNotes.css';

const EMPTY_NOTES_LOTTIE_PATH = '/Lottie/pencil%20write%20on%20clipboard.json';

const TherapistNotes = ({ studentId, studentAlias, onNoteCountChange }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [newNote, setNewNote] = useState({
    title: '',
    content: ''
  });

  const [editNote, setEditNote] = useState({
    title: '',
    content: ''
  });

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view notes.');
        setLoading(false);
        return;
      }

      const { data: notesData, error: notesError } = await supabase
        .from('therapist_notes')
        .select('*')
        .eq('therapist_id', user.id)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;
      setNotes(notesData || []);
      
      // Notify parent component of note count
      if (onNoteCountChange) {
        onNoteCountChange(notesData?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError(`Failed to load notes: ${err.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  }, [studentId, onNoteCountChange]);

  useEffect(() => {
    if (studentId) {
      fetchNotes();
    }
  }, [studentId, fetchNotes]);

  const handleCreateNote = async () => {
    if (!newNote.content.trim()) {
      alert('Please enter note content.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to create notes.');
        return;
      }

      const { data, error: insertError } = await supabase
        .from('therapist_notes')
        .insert({
          therapist_id: user.id,
          student_id: studentId,
          title: newNote.title.trim() || null,
          content: newNote.content.trim()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setNotes(prev => [data, ...prev]);
      setNewNote({ title: '', content: '' });
      setIsCreating(false);
      
      // Update count
      if (onNoteCountChange) {
        onNoteCountChange(notes.length + 1);
      }
    } catch (err) {
      console.error('Error creating note:', err);
      setError(`Failed to create note: ${err.message || 'Unknown error'}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditNote = async () => {
    if (!editNote.content.trim()) {
      alert('Please enter note content.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const { error: updateError } = await supabase
        .from('therapist_notes')
        .update({
          title: editNote.title.trim() || null,
          content: editNote.content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingNote.id);

      if (updateError) throw updateError;

      setNotes(prev => prev.map(note => 
        note.id === editingNote.id 
          ? { ...note, title: editNote.title.trim() || null, content: editNote.content.trim(), updated_at: new Date().toISOString() }
          : note
      ));
      setEditingNote(null);
      setEditNote({ title: '', content: '' });
    } catch (err) {
      console.error('Error updating note:', err);
      setError(`Failed to update note: ${err.message || 'Unknown error'}.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(noteId);
      const { error: deleteError } = await supabase
        .from('therapist_notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) throw deleteError;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      // Update count
      if (onNoteCountChange) {
        onNoteCountChange(notes.length - 1);
      }
    } catch (err) {
      console.error('Error deleting note:', err);
      alert('Failed to delete note. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const startEditing = (note) => {
    setEditingNote(note);
    setEditNote({
      title: note.title || '',
      content: note.content
    });
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditNote({ title: '', content: '' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading-container">Loading notes...</div>;
  }

  return (
    <div className="therapist-notes-container">
      <div className="notes-header">
        <h2 className="notes-title">Private Notes for {studentAlias || 'Student'}</h2>
        <p className="notes-subtitle">Document observations and thoughts about this student.</p>
        <div className="privacy-notice">
          🔒 <strong>Private notes.</strong> These observations are only
          visible to you and are never shared with the student.
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="new-note-btn"
          >
            + New Note
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isCreating && (
        <div className="note-form-card">
          <h3 className="form-card-title">Create New Note</h3>
          <div className="note-form">
            <input
              type="text"
              placeholder="Note title (optional)"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="note-title-input"
            />
            <textarea
              placeholder="Enter your note here..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="note-textarea"
              rows="8"
            />
            <div className="note-actions">
              <button
                onClick={handleCreateNote}
                disabled={saving}
                className="save-note-btn"
              >
                {saving ? 'Saving...' : 'Save Note'}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewNote({ title: '', content: '' });
                }}
                disabled={saving}
                className="cancel-note-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {notes.length === 0 && !isCreating ? (
        <div className="empty-state notes-empty-state">
          <LazyLottie path={EMPTY_NOTES_LOTTIE_PATH} loop style={{ width: 100, height: 100 }} />
          <h3>No Notes Yet</h3>
          <p>Start documenting your observations and thoughts about this student.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="create-first-btn"
          >
            + Create First Note
          </button>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-card">
              {editingNote?.id === note.id ? (
                <div className="note-form-card">
                  <h3 className="form-card-title">Edit Note</h3>
                  <div className="note-form">
                    <input
                      type="text"
                      placeholder="Note title (optional)"
                      value={editNote.title}
                      onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                      className="note-title-input"
                    />
                    <textarea
                      placeholder="Enter your note here..."
                      value={editNote.content}
                      onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
                      className="note-textarea"
                      rows="8"
                    />
                    <div className="note-actions">
                      <button
                        onClick={handleEditNote}
                        disabled={saving}
                        className="save-note-btn"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={saving}
                        className="cancel-note-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-header">
                    <div>
                      {note.title && <h3 className="note-title">{note.title}</h3>}
                      <p className="note-meta">
                        Created: {formatDateTime(note.created_at)}
                        {note.updated_at !== note.created_at && (
                          <> • Updated: {formatDateTime(note.updated_at)}</>
                        )}
                      </p>
                    </div>
                    <div className="note-actions-inline">
                      <button
                        onClick={() => startEditing(note)}
                        className="edit-btn"
                        title="Edit note"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deleting === note.id}
                        className="delete-btn"
                        title="Delete note"
                      >
                        {deleting === note.id ? 'Deleting...' : '🗑️'}
                      </button>
                    </div>
                  </div>
                  <div className="note-content">
                    <p>{note.content}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TherapistNotes;

