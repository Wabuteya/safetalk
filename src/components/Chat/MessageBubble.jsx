import React from 'react';
import './Chat.css';

/**
 * MessageBubble Component
 * Displays individual messages in the chat interface
 * Differentiates between student and therapist messages with styling
 */
const MessageBubble = ({ message, currentUserId }) => {
  const isCurrentUser = message.sender_id === currentUserId;
  const isTherapist = message.sender_role === 'therapist';
  
  // Format timestamp for display
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    // Show relative time for recent messages
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    // Show date for older messages
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Defensive: content may be missing due to fetch/realtime payload differences
  const content = message.content ?? message.Content ?? message.body ?? message.message ?? '';
  const displayContent = typeof content === 'string' && content.trim() ? content : null;

  const messageClass = isTherapist ? 'therapist' : 'student';
  return (
    <div className={`message message-bubble ${messageClass}`}>
      <div className="bubble message-content">
        <p className="message-text">
          {displayContent ?? <span className="message-empty">(Message could not be loaded)</span>}
        </p>
        <span className="timestamp message-time">{formatTime(message.created_at)}</span>
      </div>
    </div>
  );
};

export default MessageBubble;

