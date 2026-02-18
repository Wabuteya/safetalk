import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { hasMoodLoggedToday, upsertMoodLog } from '../../utils/moodTracking';
import MoodPrompt from './MoodPrompt';

const getSkipKey = (userId) => `moodPromptSkipped_${userId}_${new Date().toDateString()}`;

/** Routes where the optional mood prompt is allowed (never on login, chat, or crisis). */
const MoodPromptGate = () => {
  const location = useLocation();
  const { user } = useUser();
  const [showPrompt, setShowPrompt] = useState(false);
  const [checking, setChecking] = useState(false);

  const isStudent = user?.user_metadata?.role === 'student';
  const pathname = location.pathname;
  const allowedPath =
    pathname.startsWith('/student-dashboard') &&
    !pathname.startsWith('/student-dashboard/chat/');

  const checkAndMaybeShow = useCallback(async () => {
    if (!isStudent || !user?.id || !allowedPath) {
      setShowPrompt(false);
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      const skipKey = getSkipKey(user.id);
      if (sessionStorage.getItem(skipKey)) {
        setShowPrompt(false);
        return;
      }
    }
    setChecking(true);
    try {
      const hasMood = await hasMoodLoggedToday(user.id);
      setShowPrompt(!hasMood);
    } catch (err) {
      console.error('MoodPromptGate check error:', err);
      setShowPrompt(false);
    } finally {
      setChecking(false);
    }
  }, [isStudent, user?.id, allowedPath]);

  useEffect(() => {
    checkAndMaybeShow();
  }, [checkAndMaybeShow]);

  const handleClose = (saved) => {
    setShowPrompt(false);
    if (!saved && typeof sessionStorage !== 'undefined' && user?.id) {
      sessionStorage.setItem(getSkipKey(user.id), '1');
    }
  };

  const handleSave = useCallback(
    async (mood, note) => {
      if (!user?.id) return;
      const { error } = await upsertMoodLog(user.id, mood, note);
      if (error) throw error;
      try {
        window.dispatchEvent(new CustomEvent('safetalk:moodLogged'));
      } catch (_) {}
    },
    [user?.id]
  );

  if (!showPrompt) return null;

  return (
    <MoodPrompt
      onClose={handleClose}
      onSave={handleSave}
    />
  );
};

export default MoodPromptGate;
