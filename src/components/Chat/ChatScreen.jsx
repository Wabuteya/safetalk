import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import { DefaultAvatar } from '../../utils/defaultAvatar';
import MessageBubble from './MessageBubble';
import './Chat.css';

/**
 * ChatScreen Component
 * Main chat interface for therapist-student conversations
 * Supports real-time messaging with Supabase subscriptions
 * Falls back to async polling if real-time fails
 */
const ChatScreen = ({ conversationId, otherUserId, otherUserName, otherUserPhotoUrl, userRole, showBackButton = true }) => {
  const { user } = useUser();
  const { refresh: refreshUnread } = useUnreadMessages();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Normalize message shape (handles Supabase realtime payload vs REST response differences)
  const normalizeMessage = useCallback((msg) => {
    if (!msg) return null;
    const content = msg.content ?? msg.Content ?? msg.body ?? msg.message ?? '';
    return { ...msg, content: typeof content === 'string' ? content : String(content ?? '') };
  }, []);

  // Fetch initial messages and mark as read
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_role, content, read_status, created_at, updated_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const normalized = (data || []).map(normalizeMessage).filter(Boolean);
      setMessages(normalized);

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
  }, [conversationId, user, refreshUnread, normalizeMessage]);

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

  // Typing indicator: broadcast when user types, listen for other user
  const broadcastTyping = useCallback((typing) => {
    const ch = presenceChannelRef.current;
    if (ch && user) {
      ch.track({ user_id: user.id, typing });
    }
  }, [user]);

  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [broadcastTyping]);

  // Set up real-time subscription for new messages + presence for typing
  useEffect(() => {
    if (!conversationId || !user) return;

    // Initial fetch
    fetchMessages();
    checkAvailability();

    // Set user as online
    updatePresence(true);

    // Presence channel for typing indicator
    const presenceChannel = supabase.channel(`chat-presence:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const others = Object.values(state).flat().filter((p) => p.user_id !== user.id);
        const someoneTyping = others.some((p) => p.typing === true);
        setIsOtherTyping(someoneTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await presenceChannel.track({ user_id: user.id, typing: false });
        }
      });
    presenceChannelRef.current = presenceChannel;

    // Messages channel
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
          const newMsg = normalizeMessage(payload.new);
          if (!newMsg?.id) return;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Check availability periodically (fallback)
    const availabilityInterval = setInterval(checkAvailability, 30000);

    // Cleanup on unmount
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      presenceChannel.track({ user_id: user.id, typing: false });
      presenceChannel.unsubscribe();
      channel.unsubscribe();
      clearInterval(availabilityInterval);
      updatePresence(false);
    };
  }, [conversationId, user, fetchMessages, checkAvailability, updatePresence, normalizeMessage]);

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

    broadcastTyping(false);
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

      // Optimistic append; realtime INSERT may also fire — dedupe by id in subscription + here
      const normalized = normalizeMessage(data);
      if (normalized?.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized]
        );
      }

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
        {showBackButton && (
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
        )}
        {otherUserPhotoUrl ? (
          <img src={otherUserPhotoUrl} alt="" className={userRole === 'therapist' ? 'student-avatar' : 'therapist-avatar'} />
        ) : userRole === 'therapist' ? (
          <div className="student-avatar">
            {otherUserName?.charAt(0)?.toUpperCase() || '?'}
          </div>
        ) : (
          <div className="therapist-avatar therapist-avatar-placeholder">
            <DefaultAvatar size={40} />
          </div>
        )}
        <div className="chat-header-info">
          <h2 className={userRole === 'therapist' ? 'student-name therapist-name' : 'therapist-name'}>{otherUserName}</h2>
          <div className="student-status therapist-status availability-status">
            <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="warning-banner">
        ⚠️ <strong>Important:</strong> Messaging is not for emergencies.{' '}
        {userRole === 'therapist' ? 'Use Crisis Management for immediate help.' : 'Use Crisis Support for immediate help.'}
      </div>

      {/* Messages Area */}
      <div className="messages-area messages-container">
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
        {isOtherTyping && (
          <div className="typing-indicator">
            <div className="typing-bubble">
              <span></span><span></span><span></span>
            </div>
            <p>{otherUserName} is typing...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Message Input Bar */}
      <form className="chat-input-bar message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="message-input"
          placeholder="Type your message..."
          value={newMessage}
          onChange={handleInputChange}
          disabled={sending}
        />
        <button
          type="submit"
          className="send-btn send-button"
          disabled={!newMessage.trim() || sending}
          title="Send"
        >
          {sending ? '…' : '➤'}
        </button>
      </form>
    </div>
  );
};

export default ChatScreen;

