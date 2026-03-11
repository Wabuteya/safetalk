import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import './Chat.css';

/**
 * ChatActivityHub Component
 * Activity and availability hub for therapists
 * Shows students online, unread messages, last message timestamps, and priority indicators
 * Routes to chat when a student is selected
 */
const ChatActivityHub = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all students with their conversation activity
  const fetchActivity = useCallback(async (isInitialLoad = false) => {
    if (!user || user.user_metadata?.role !== 'therapist') {
      setLoading(false);
      return;
    }

    try {
      // Only show loading state on initial load, not on periodic refreshes
      if (isInitialLoad) {
        setLoading(true);
      }
      setError('');

      // Get all students linked to this therapist
      const { data: relationships, error: relError } = await supabase
        .from('therapist_student_relations')
        .select('student_id')
        .eq('therapist_id', user.id);

      if (relError) throw relError;

      if (!relationships || relationships.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = relationships.map(rel => rel.student_id);

      // Fetch student profiles, conversations, and activity in parallel
      const [profilesResult, conversationsResult] = await Promise.all([
        supabase
          .from('student_profiles')
          .select('user_id, alias')
          .in('user_id', studentIds),
        supabase
          .from('conversations')
          .select('id, student_id, updated_at')
          .eq('therapist_id', user.id)
          .in('student_id', studentIds)
      ]);

      const { data: profiles, error: profilesError } = profilesResult;
      const { data: conversations, error: convError } = conversationsResult;

      if (profilesError) throw profilesError;
      if (convError) throw convError;

      // Create conversation map
      const conversationMap = {};
      (conversations || []).forEach(conv => {
        conversationMap[conv.student_id] = conv;
      });

      // For each student, get last message, unread count, and online status
      const studentsWithActivity = await Promise.all(
        (profiles || []).map(async (profile) => {
          const conv = conversationMap[profile.user_id];
          
          let lastMessage = null;
          let unreadCount = 0;
          let isOnline = false;

          if (conv) {
            // Get last message
            const { data: lastMsg } = await supabase
              .from('messages')
              .select('content, created_at, sender_role')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            lastMessage = lastMsg;

            // Get unread count
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('read_status', false)
              .neq('sender_id', user.id);

            unreadCount = count || 0;
          }

          // Check online status (optional - gracefully handle if table doesn't exist)
          try {
            const { data: presence } = await supabase
              .from('user_presence')
              .select('is_online, last_seen')
              .eq('user_id', profile.user_id)
              .maybeSingle();

            if (presence) {
              const lastSeen = new Date(presence.last_seen);
              const now = new Date();
              const diffMinutes = (now - lastSeen) / 60000;
              isOnline = presence.is_online && diffMinutes < 5;
            }
          } catch (err) {
            // Presence table might not exist - that's okay
            console.log('Presence check failed (non-critical):', err);
          }

          // Check for high-risk sentiment in recent messages (priority indicator)
          let hasHighRisk = false;
          if (conv && lastMessage) {
            const highRiskKeywords = ['suicide', 'kill myself', 'end my life', 'hopeless', 'self-harm'];
            const lowerContent = (lastMessage.content || '').toLowerCase();
            hasHighRisk = highRiskKeywords.some(keyword => lowerContent.includes(keyword));
          }

          return {
            id: profile.user_id,
            alias: profile.alias || 'Student',
            conversationId: conv?.id || null,
            lastMessage: lastMessage?.content || null,
            lastMessageTime: lastMessage?.created_at || conv?.updated_at || null,
            unreadCount,
            isOnline,
            hasHighRisk,
            hasMessages: !!lastMessage
          };
        })
      );

      // Sort: high-risk first, then unread, then by last message time
      studentsWithActivity.sort((a, b) => {
        if (a.hasHighRisk && !b.hasHighRisk) return -1;
        if (!a.hasHighRisk && b.hasHighRisk) return 1;
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
        }
        return 0;
      });

      setStudents(studentsWithActivity);
    } catch (err) {
      console.error('Error fetching activity:', err);
      setError('Failed to load activity. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Initial load with loading state
    fetchActivity(true);

    // Refresh activity periodically (without loading state)
    const interval = setInterval(() => fetchActivity(false), 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [fetchActivity]);

  const formatTime = (timestamp) => {
    if (!timestamp) return 'No messages';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleStudentClick = async (student) => {
    // Mark messages FROM STUDENT as read when therapist opens chat from activity hub
    // Only mark messages that were sent by the student (not by therapist)
    if (student.conversationId && user) {
      try {
        await supabase
          .from('messages')
          .update({ read_status: true })
          .eq('conversation_id', student.conversationId)
          .eq('read_status', false)
          .neq('sender_id', user.id); // Only mark messages FROM student as read
      } catch (err) {
        console.error('Error marking messages as read:', err);
        // Continue navigation even if marking as read fails
      }
    }
    
    // Route to student detail view with chat tab open
    navigate(`/therapist-dashboard/student/${student.id}`, {
      state: { openChatTab: true }
    });
  };

  if (loading) {
    return (
      <div className="activity-hub-container">
        <div className="chat-loading">Loading activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-hub-container">
        <div className="chat-error">{error}</div>
      </div>
    );
  }

  const onlineCount = students.filter(s => s.isOnline).length;
  const totalUnread = students.reduce((sum, s) => sum + s.unreadCount, 0);
  const highRiskCount = students.filter(s => s.hasHighRisk).length;

  return (
    <div className="activity-hub-container">
      <h1 className="page-title">Live Chat</h1>
      <p className="page-subtitle">Monitor student availability and message activity</p>

      {/* Stat Cards */}
      <div className="stat-cards-row">
        <div className="stat-card online">
          <div className="stat-icon">🟢</div>
          <div>
            <div className="stat-number">{onlineCount}</div>
            <div className="stat-label">Online Now</div>
          </div>
        </div>
        <div className="stat-card unread">
          <div className="stat-icon">📩</div>
          <div>
            <div className="stat-number">{totalUnread}</div>
            <div className="stat-label">Unread Messages</div>
          </div>
        </div>
        {highRiskCount > 0 && (
          <div className="stat-card" style={{ borderTopColor: '#DC2626' }}>
            <div className="stat-icon" style={{ background: '#FFF0F0' }}>⚠️</div>
            <div>
              <div className="stat-number">{highRiskCount}</div>
              <div className="stat-label">Priority Alerts</div>
            </div>
          </div>
        )}
      </div>

      {/* Conversation List */}
      {students.length === 0 ? (
        <div className="empty-activity">
          <p>No students assigned to your caseload yet.</p>
          <p>Students will appear here once they&apos;re linked to you.</p>
        </div>
      ) : (
        <div className="conversations-list">
          {students.map((student) => (
            <div
              key={student.id}
              className={`conversation-row ${student.unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => handleStudentClick(student)}
            >
              <div className="student-avatar">
                {student.alias?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="conversation-info">
                <div className="student-name">{student.alias}</div>
                <div className="last-message">
                  {student.lastMessage || 'No messages yet'}
                </div>
              </div>
              <div className="conversation-meta">
                <div className="status-indicator">
                  <span className={`status-dot ${student.isOnline ? 'online' : ''}`} />
                  {student.isOnline ? 'Online' : 'Offline'}
                </div>
                <div className="last-time">{formatTime(student.lastMessageTime)}</div>
                {student.unreadCount > 0 && (
                  <span className="unread-badge">{student.unreadCount}</span>
                )}
              </div>
              <span className="open-chat-arrow">→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatActivityHub;

