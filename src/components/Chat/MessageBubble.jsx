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

  return (
    <div className={`message-bubble ${isCurrentUser ? 'message-sent' : 'message-received'} ${isTherapist ? 'therapist-message' : 'student-message'}`}>
      <div className="message-content">
        <p className="message-text">{message.content}</p>
        <span className="message-time">{formatTime(message.created_at)}</span>
      </div>
    </div>
  );
};

export default MessageBubble;

