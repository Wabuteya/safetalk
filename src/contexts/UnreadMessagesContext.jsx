import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from './UserContext';

const UnreadMessagesContext = createContext(null);

/**
 * Fetches total unread message count for the current user.
 * - Students: unread from their linked therapist
 * - Therapists: unread from all linked students
 * - Admins: no messaging (returns 0)
 */
async function fetchUnreadCount(userId, role) {
  if (!userId) return 0;

  if (role === 'admin') return 0;

  if (role === 'therapist') {
    const { data: rels } = await supabase
      .from('therapist_student_relations')
      .select('student_id')
      .eq('therapist_id', userId);

    if (!rels?.length) return 0;

    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .eq('therapist_id', userId)
      .in('student_id', rels.map((r) => r.student_id));

    if (!convs?.length) return 0;

    let total = 0;
    for (const conv of convs) {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read_status', false)
        .neq('sender_id', userId);
      total += count || 0;
    }
    return total;
  }

  if (role === 'student') {
    const { data: rel } = await supabase
      .from('therapist_student_relations')
      .select('therapist_id')
      .eq('student_id', userId)
      .maybeSingle();

    if (!rel?.therapist_id) return 0;

    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('student_id', userId)
      .eq('therapist_id', rel.therapist_id)
      .maybeSingle();

    if (!conv) return 0;

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('read_status', false)
      .neq('sender_id', userId);

    return count || 0;
  }

  return 0;
}

export function UnreadMessagesProvider({ children }) {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [linkedTherapistId, setLinkedTherapistId] = useState(null);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUnreadCount(0);
      setLinkedTherapistId(null);
      return;
    }

    const role = user.user_metadata?.role || 'student';
    const count = await fetchUnreadCount(user.id, role);
    setUnreadCount(count);

    if (role === 'student') {
      const { data: rel } = await supabase
        .from('therapist_student_relations')
        .select('therapist_id')
        .eq('student_id', user.id)
        .maybeSingle();
      setLinkedTherapistId(rel?.therapist_id || null);
    } else {
      setLinkedTherapistId(null);
    }
  }, []);

  // Refresh when user logs in/out or changes (e.g. student opens app after therapist sent message)
  useEffect(() => {
    refresh();
  }, [user?.id, refresh]);

  // Realtime subscription when user is student or therapist
  useEffect(() => {
    if (!user?.id) return;

    const role = user?.user_metadata?.role;
    if (role !== 'student' && role !== 'therapist') return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => refresh()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, refresh]);

  return (
    <UnreadMessagesContext.Provider value={{ unreadCount, linkedTherapistId, refresh }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  return useContext(UnreadMessagesContext) || { unreadCount: 0, linkedTherapistId: null, refresh: () => {} };
}
