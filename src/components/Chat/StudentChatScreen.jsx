import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../contexts/UserContext';
import ChatScreen from './ChatScreen';
import { getTherapistPhotoUrl } from '../../utils/defaultAvatar';

/**
 * StudentChatScreen Wrapper
 * Fetches conversation details and passes to ChatScreen
 */
const StudentChatScreen = () => {
  const { therapistId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrCreateConversation = async () => {
      if (!therapistId || !user) return;

      try {
        // First, check if conversation already exists
        let { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('student_id', user.id)
          .eq('therapist_id', therapistId)
          .maybeSingle();

        if (convError && convError.code !== 'PGRST116') {
          throw convError;
        }

        // Create conversation if it doesn't exist
        if (!convData) {
          try {
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert({
                student_id: user.id,
                therapist_id: therapistId
              })
              .select()
              .single();

            if (createError) {
              // Handle 409 conflict or unique constraint violation
              if (createError.code === '23505' || createError.status === 409 || createError.message?.includes('duplicate')) {
                // Conversation was created by another request (race condition), fetch it
                console.log('Conversation already exists (race condition), fetching...');
                const { data: existingConv, error: fetchError } = await supabase
                  .from('conversations')
                  .select('*')
                  .eq('student_id', user.id)
                  .eq('therapist_id', therapistId)
                  .single();

                if (fetchError) throw fetchError;
                convData = existingConv;
              } else {
                throw createError;
              }
            } else {
              convData = newConv;
            }
          } catch (insertErr) {
            // If insert fails with conflict, try fetching again
            if (insertErr.code === '23505' || insertErr.status === 409 || insertErr.message?.includes('duplicate')) {
              console.log('Insert conflict, fetching existing conversation...');
              const { data: existingConv, error: fetchError } = await supabase
                .from('conversations')
                .select('*')
                .eq('student_id', user.id)
                .eq('therapist_id', therapistId)
                .single();

              if (fetchError) throw fetchError;
              convData = existingConv;
            } else {
              throw insertErr;
            }
          }
        }

        // Get therapist profile (name + photo)
        const { data: therapistProfile } = await supabase
          .from('therapist_profiles')
          .select('full_name, profile_photo_url, image_url')
          .eq('user_id', therapistId)
          .single();

        const photoUrl = getTherapistPhotoUrl(therapistProfile?.profile_photo_url, therapistProfile?.image_url);
        setConversation({
          ...convData,
          therapistName: therapistProfile?.full_name || 'Therapist',
          otherUserPhotoUrl: photoUrl || null
        });
      } catch (err) {
        console.error('Error fetching/creating conversation:', err);
        // Provide more specific error message
        let errorMessage = 'Failed to load conversation. Please try again.';
        if (err.code === '23505' || err.status === 409) {
          errorMessage = 'Conversation already exists. Please refresh the page.';
        } else if (err.message) {
          errorMessage = `Error: ${err.message}`;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchOrCreateConversation();
  }, [therapistId, user]);

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
          <button onClick={() => navigate('/student-dashboard/therapists')}>
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <ChatScreen
      conversationId={conversation.id}
      otherUserId={conversation.therapist_id}
      otherUserName={conversation.therapistName}
      otherUserPhotoUrl={conversation.otherUserPhotoUrl}
      userRole="student"
    />
  );
};

export default StudentChatScreen;

