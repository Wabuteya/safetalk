import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './Chat.css';

/**
 * ChatList Component
 * Displays list of conversations for therapists
 * Shows one conversation per student
 */
const ChatList = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch conversations for the therapist
  const fetchConversations = useCallback(async () => {
    if (!user || user.user_metadata?.role !== 'therapist') {
      setLoading(false);
      return;
    }

    try {
      // Get all conversations for this therapist
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('therapist_id', user.id)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get student info and last message
      const conversationsWithDetails = await Promise.all(
        (convData || []).map(async (conv) => {
          // Get student profile (alias only for privacy)
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('alias')
            .eq('user_id', conv.student_id)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_role')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Check unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('read_status', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            studentAlias: studentProfile?.alias || 'Student',
            lastMessage: lastMessage?.content || 'No messages yet',
            lastMessageTime: lastMessage?.created_at || conv.updated_at,
            unreadCount: unreadCount || 0
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription for new conversations
    if (user && user.user_metadata?.role === 'therapist') {
      const channel = supabase
        .channel('therapist-conversations')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `therapist_id=eq.${user.id}`
          },
          () => {
            // Refresh conversations when changes occur
            fetchConversations();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, fetchConversations]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleConversationClick = (conversation) => {
    navigate(`/therapist-dashboard/live-chat/${conversation.id}`, {
      state: {
        studentId: conversation.student_id,
        studentAlias: conversation.studentAlias
      }
    });
  };

  if (loading) {
    return (
      <div className="chat-list-container">
        <div className="chat-loading">Loading conversations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-list-container">
        <div className="chat-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="chat-list-container">
      <div className="chat-list-header">
        <h1>Live Chat</h1>
        <p>Your conversations with students</p>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-chat-list">
          <p>No conversations yet.</p>
          <p>When students message you, conversations will appear here.</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="conversation-item"
              onClick={() => handleConversationClick(conv)}
            >
              <div className="conversation-header">
                <h3>{conv.studentAlias}</h3>
                {conv.unreadCount > 0 && (
                  <span className="unread-badge">{conv.unreadCount}</span>
                )}
              </div>
              <p className="conversation-preview">{conv.lastMessage}</p>
              <span className="conversation-time">{formatTime(conv.lastMessageTime)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;

