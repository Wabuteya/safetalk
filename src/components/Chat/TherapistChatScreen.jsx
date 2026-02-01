import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import ChatScreen from './ChatScreen';

/**
 * TherapistChatScreen Wrapper
 * Fetches conversation details and passes to ChatScreen
 */
const TherapistChatScreen = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConversation = async () => {
      if (!conversationId || !user) return;

      try {
        // Get conversation details
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('therapist_id', user.id)
          .single();

        if (convError) throw convError;

        // Get student alias (privacy: only alias, not real name)
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('alias')
          .eq('user_id', convData.student_id)
          .single();

        setConversation({
          ...convData,
          studentAlias: studentProfile?.alias || 'Student'
        });
      } catch (err) {
        console.error('Error fetching conversation:', err);
        setError('Failed to load conversation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Use location state if available (from ChatList navigation)
    if (location.state?.studentId && location.state?.studentAlias) {
      setConversation({
        student_id: location.state.studentId,
        studentAlias: location.state.studentAlias
      });
      setLoading(false);
    } else {
      fetchConversation();
    }
  }, [conversationId, user, location.state]);

  if (loading) {
    return (
      <div className="chat-screen">
        <div className="chat-loading">Loading conversation...</div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="chat-screen">
        <div className="chat-error">
          {error || 'Conversation not found'}
          <button onClick={() => navigate('/therapist-dashboard/live-chat')}>
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatScreen
      conversationId={conversationId}
      otherUserId={conversation.student_id}
      otherUserName={conversation.studentAlias}
      userRole="therapist"
    />
  );
};

export default TherapistChatScreen;

