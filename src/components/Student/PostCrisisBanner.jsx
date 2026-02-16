import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { usePostCrisis, POST_CRISIS_REMINDER_MINUTES } from '../../contexts/PostCrisisContext';
import { EMERGENCY_CONTACTS } from '../../config/emergencyContacts';
import './PostCrisisBanner.css';

/**
 * Post-crisis banner: shows when therapist responds or after reminder window.
 * Calm, minimal, non-technical. No internal escalation states.
 */
const PostCrisisBanner = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { postCrisis, setTherapistResponded, dismissPostCrisis } = usePostCrisis();
  const [conversationId, setConversationId] = useState(null);
  const [showReminder, setShowReminder] = useState(false);

  // Fetch conversation ID when post-crisis activates
  useEffect(() => {
    if (!postCrisis.active || !postCrisis.therapistId || !user?.id) return;

    const fetchConversation = async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('student_id', user.id)
        .eq('therapist_id', postCrisis.therapistId)
        .maybeSingle();

      if (data) setConversationId(data.id);
    };

    fetchConversation();
  }, [postCrisis.active, postCrisis.therapistId, user?.id]);

  // Reminder timer: after X minutes, show reminder (without exposing escalation)
  useEffect(() => {
    if (!postCrisis.active || !postCrisis.triggeredAt || postCrisis.therapistResponded) return;

    const timeout = POST_CRISIS_REMINDER_MINUTES * 60 * 1000;
    const elapsed = Date.now() - postCrisis.triggeredAt;

    if (elapsed >= timeout) {
      setShowReminder(true);
      return;
    }

    const timer = setTimeout(() => setShowReminder(true), timeout - elapsed);
    return () => clearTimeout(timer);
  }, [postCrisis.active, postCrisis.triggeredAt, postCrisis.therapistResponded]);

  // Subscribe to messages from therapist
  useEffect(() => {
    if (!conversationId || !postCrisis.therapistId || postCrisis.therapistResponded) return;

    const channel = supabase
      .channel(`post-crisis-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.new?.sender_id === postCrisis.therapistId) {
            setTherapistResponded();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, postCrisis.therapistId, postCrisis.therapistResponded, setTherapistResponded]);

  const openChat = useCallback(() => {
    if (postCrisis.therapistId) {
      navigate(`/student-dashboard/chat/${postCrisis.therapistId}`);
      dismissPostCrisis();
    }
  }, [postCrisis.therapistId, navigate, dismissPostCrisis]);

  if (!postCrisis.active) return null;

  if (postCrisis.therapistResponded) {
    return (
      <div className="post-crisis-banner therapist-responded" role="status">
        <div className="post-crisis-banner-content">
          <span className="post-crisis-banner-message">Your therapist has responded.</span>
          <button type="button" className="post-crisis-banner-btn" onClick={openChat}>
            Open chat
          </button>
          <button type="button" className="post-crisis-banner-dismiss" onClick={dismissPostCrisis} aria-label="Dismiss">
            ×
          </button>
        </div>
      </div>
    );
  }

  if (showReminder) {
    return (
      <div className="post-crisis-banner reminder" role="status">
        <div className="post-crisis-banner-content">
          <p className="post-crisis-banner-message">
            If you have not heard back and need immediate help, please contact emergency services.
          </p>
          <div className="post-crisis-banner-contacts">
            {EMERGENCY_CONTACTS.map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number.replace(/\s/g, '')}`}
                className="post-crisis-banner-link"
              >
                {contact.label} — {contact.number}
              </a>
            ))}
          </div>
          <button type="button" className="post-crisis-banner-dismiss" onClick={dismissPostCrisis} aria-label="Dismiss">
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default PostCrisisBanner;
