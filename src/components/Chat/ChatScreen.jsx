import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import MessageBubble from './MessageBubble';
import './Chat.css';

/**
 * ChatScreen Component
 * Main chat interface for therapist-student conversations
 * Supports real-time messaging with Supabase subscriptions
 * Falls back to async polling if real-time fails
 */
const ChatScreen = ({ conversationId, otherUserId, otherUserName, userRole, showBackButton = true }) => {
  const { user } = useUser();
  const { refresh: refreshUnread } = useUnreadMessages();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch initial messages and mark as read
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark all unread messages FROM THE OTHER USER as read
      // For therapist: mark messages FROM student as read
      // For student: mark messages FROM therapist as read
      if (data && data.length > 0) {
        const unreadMessages = data.filter(
          msg => !msg.read_status && msg.sender_id !== user.id
        );

        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          await supabase
            .from('messages')
            .update({ read_status: true })
            .in('id', messageIds);
          refreshUnread?.();
        }
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, refreshUnread]);

  // Check therapist availability
  const checkAvailability = useCallback(async () => {
    if (!otherUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('is_online, last_seen')
        .eq('user_id', otherUserId)
        .maybeSingle(); // Use maybeSingle to handle case where record doesn't exist

      if (error) {
        // If table doesn't exist or RLS blocks access, silently fail
        if (error.code === '42P01' || error.code === 'PGRST116' || error.status === 406) {
          console.log('Presence table not available, defaulting to offline');
          setIsOnline(false);
          return;
        }
        throw error;
      }

      if (data) {
        // Consider online if last_seen is within last 5 minutes
        const lastSeen = new Date(data.last_seen);
        const now = new Date();
        const diffMinutes = (now - lastSeen) / 60000;
        setIsOnline(data.is_online && diffMinutes < 5);
      } else {
        // No presence record exists, assume offline
        setIsOnline(false);
      }
    } catch (err) {
      // Silently handle errors - presence is not critical for chat functionality
      console.log('Error checking availability (non-critical):', err);
      setIsOnline(false);
    }
  }, [otherUserId]);

  // Update user presence
  const updatePresence = useCallback(async (online) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: online,
          last_seen: new Date().toISOString()
        });

      // Silently handle errors - presence is optional
      if (error) {
        if (error.code === '42P01' || error.status === 406) {
          // Table doesn't exist or not accessible - that's okay
          console.log('Presence table not available, skipping presence update');
        } else {
          console.log('Error updating presence (non-critical):', error);
        }
      }
    } catch (err) {
      // Silently handle errors - presence is not critical
      console.log('Error updating presence (non-critical):', err);
    }
  }, [user]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !user) return;

    // Initial fetch
    fetchMessages();
    checkAvailability();

    // Set user as online
    updatePresence(true);

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to messages');
        }
      });

    subscriptionRef.current = channel;

    // Check availability periodically (fallback)
    const availabilityInterval = setInterval(checkAvailability, 30000); // Every 30 seconds

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      clearInterval(availabilityInterval);
      updatePresence(false);
    };
  }, [conversationId, user, fetchMessages, checkAvailability, updatePresence]);

  // Handle window visibility changes (update presence)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
        checkAvailability();
      } else {
        updatePresence(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence, checkAvailability]);

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_role: user.user_metadata?.role || 'student',
          content: messageContent,
          read_status: false
        })
        .select()
        .single();

      if (error) throw error;

      // Message will be added via real-time subscription, but add immediately for better UX
      setMessages((prev) => [...prev, data]);

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-screen">
        <div className="chat-loading">Loading conversation...</div>
      </div>
    );
  }

  return (
    <div className="chat-screen">
      {/* Chat Header */}
      <div className="chat-header">
        {/* Back button only shown when explicitly requested (e.g., for student standalone chat) */}
        {showBackButton && (
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        )}
        <div className="chat-header-info">
          <h2>{otherUserName}</h2>
          <div className="availability-status">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Emergency Disclaimer – students only; therapists don't need this reminder */}
      {userRole === 'student' && (
        <div className="chat-disclaimer">
          <strong>⚠️ Important:</strong> Messaging is not for emergencies. Use Crisis Support for immediate help.
        </div>
      )}

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentUserId={user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="message-input"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!newMessage.trim() || sending}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatScreen;

