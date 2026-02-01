import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { FaComments } from 'react-icons/fa';
import './CaseloadPage.css';
import './StatusSelector.css'; // For status dot colors

const StudentSummaryCard = ({ student }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [conversationId, setConversationId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversation ID and unread count for this student
  const fetchConversationAndUnread = useCallback(async () => {
    if (!user || !student.id) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', student.id)
        .eq('therapist_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConversationId(data.id);

        // Get unread message count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', data.id)
          .eq('read_status', false)
          .neq('sender_id', user.id);

        setUnreadCount(count || 0);
      } else {
        setConversationId(null);
        setUnreadCount(0);
      }
    } catch (err) {
      console.log('Error fetching conversation:', err);
    }
  }, [user, student.id]);

  useEffect(() => {
    fetchConversationAndUnread();
  }, [fetchConversationAndUnread]);

  // Set up real-time subscription to update unread count
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages-updates-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          // Refresh unread count when messages are updated (marked as read)
          fetchConversationAndUnread();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          // If new message is from student (not therapist), increment unread count
          if (payload.new.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, fetchConversationAndUnread]);

  const handleChatClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mark messages FROM STUDENT as read when therapist opens chat
    // Only mark messages that were sent by the student (not by therapist)
    if (conversationId && user) {
      try {
        await supabase
          .from('messages')
          .update({ read_status: true })
          .eq('conversation_id', conversationId)
          .eq('read_status', false)
          .neq('sender_id', user.id); // Only mark messages FROM student as read
        
        // Clear unread count immediately for better UX
        setUnreadCount(0);
      } catch (err) {
        console.error('Error marking messages as read:', err);
        // Continue navigation even if marking as read fails
      }
    }
    
    // Always navigate to student detail view with chat tab open
    // The chat component will handle conversation creation if needed
    navigate(`/therapist-dashboard/student/${student.id}`, {
      state: { openChatTab: true }
    });
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#28a745';
      case 'away':
        return '#ffc107';
      case 'offline':
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="student-card">
      <div className="student-card-header">
        <h3 className="student-alias">{student.alias}</h3>
        {student.status && (
          <div className="student-status">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(student.status) }}
            ></span>
            <span className="status-text">{student.status}</span>
          </div>
        )}
      </div>
      
      <div className="student-card-details">
        <div className="detail-item">
          <strong>Last Message:</strong> {student.lastContact || 'No messages yet'}
        </div>
        <div className="detail-item">
          <strong>Journals Shared:</strong> {student.journalsShared || 0}
        </div>
        <div className="detail-item">
          <strong>Appointments:</strong> {student.appointmentsCount || 0}
        </div>
        <div className="detail-item">
          <strong>Notes:</strong> {student.notesCount || 0}
        </div>
        {student.newJournals > 0 && (
          <div className="new-journal-indicator">
            {student.newJournals} New Journal{student.newJournals > 1 ? 's' : ''}
          </div>
        )}
        {student.appointmentsCount > 0 && (
          <div className="appointment-indicator">
            {student.appointmentsCount} Appointment{student.appointmentsCount > 1 ? 's' : ''}
          </div>
        )}
        {student.notesCount > 0 && (
          <div className="notes-indicator">
            {student.notesCount} Note{student.notesCount > 1 ? 's' : ''}
          </div>
        )}
      </div>
      
      <div className="student-card-actions">
        <button 
          className="chat-btn-card"
          onClick={handleChatClick}
        >
          <FaComments /> Chat {unreadCount > 0 && <span className="unread-badge-small">{unreadCount}</span>}
        </button>
        <Link to={`/therapist-dashboard/student/${student.id}`} className="view-progress-btn">
          View Profile
        </Link>
      </div>
    </div>
  );
};

export default StudentSummaryCard;
