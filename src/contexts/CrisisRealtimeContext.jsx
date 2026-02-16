import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { getCrisisEventsForTherapist } from '../utils/crisisEvents';

const CrisisRealtimeContext = createContext(null);

/** Play a short alert sound (Web Audio API, no file required) */
function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.frequency.value = 880;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0.15, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (_) {}
}

/** Show browser push notification; on click focus window and signal app to open Crisis Alerts */
function showCrisisPushNotification() {
  if (typeof window === 'undefined' || !window.Notification) return;
  if (Notification.permission !== 'granted') return;

  const n = new Notification('New crisis alert', {
    body: 'A new crisis alert requires your attention.',
    tag: 'crisis-alert',
    requireInteraction: true,
  });

  n.onclick = () => {
    window.focus();
    n.close();
    try {
      sessionStorage.setItem('crisisNotificationClick', 'true');
    } catch (_) {}
  };
}

export function CrisisRealtimeProvider({ children }) {
  const [crisisCount, setCrisisCount] = useState(0);
  const [newAlertReceived, setNewAlertReceived] = useState(false);
  const [therapistId, setTherapistId] = useState(null);
  const onRefreshRef = useRef(null);

  const refreshCount = useCallback(async (tid) => {
    if (!tid) return;
    const { events } = await getCrisisEventsForTherapist(tid);
    setCrisisCount(events.length);
    if (onRefreshRef.current) onRefreshRef.current(events.length);
  }, []);

  const clearNewAlert = useCallback(() => {
    setNewAlertReceived(false);
  }, []);

  useEffect(() => {
    let channel;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.user_metadata?.role !== 'therapist') {
        setTherapistId(null);
        return;
      }

      const tid = user.id;
      setTherapistId(tid);
      await refreshCount(tid);

      // Supabase Realtime: listen for INSERT on crisis_events where therapist_id matches
      channel = supabase
        .channel(`crisis-events-therapist-${tid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'crisis_events',
            filter: `therapist_id=eq.${tid}`,
          },
          () => {
            setNewAlertReceived(true);
            refreshCount(tid);
            playAlertSound();
            showCrisisPushNotification();
          }
        )
        .subscribe();

      if (typeof window !== 'undefined' && window.Notification?.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    };

    setup();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [refreshCount]);

  const registerRefresh = useCallback((fn) => {
    onRefreshRef.current = fn;
    return () => { onRefreshRef.current = null; };
  }, []);

  return (
    <CrisisRealtimeContext.Provider
      value={{
        crisisCount,
        newAlertReceived,
        clearNewAlert,
        refreshCount,
        therapistId,
        registerRefresh,
      }}
    >
      {children}
    </CrisisRealtimeContext.Provider>
  );
}

export function useCrisisRealtime() {
  return useContext(CrisisRealtimeContext);
}
