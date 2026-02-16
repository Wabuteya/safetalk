import React, { createContext, useContext, useState, useCallback } from 'react';

const PostCrisisContext = createContext(null);

export const POST_CRISIS_REMINDER_MINUTES = 5;

export function PostCrisisProvider({ children }) {
  const [state, setState] = useState({
    active: false,
    triggeredAt: null,
    therapistId: null,
    therapistResponded: false,
  });

  const activatePostCrisis = useCallback((therapistId) => {
    setState({
      active: true,
      triggeredAt: Date.now(),
      therapistId,
      therapistResponded: false,
    });
  }, []);

  const setTherapistResponded = useCallback(() => {
    setState((prev) => (prev.active ? { ...prev, therapistResponded: true } : prev));
  }, []);

  const dismissPostCrisis = useCallback(() => {
    setState({ active: false, triggeredAt: null, therapistId: null, therapistResponded: false });
  }, []);

  return (
    <PostCrisisContext.Provider
      value={{
        postCrisis: state,
        activatePostCrisis,
        setTherapistResponded,
        dismissPostCrisis,
      }}
    >
      {children}
    </PostCrisisContext.Provider>
  );
}

export function usePostCrisis() {
  const ctx = useContext(PostCrisisContext);
  if (!ctx) throw new Error('usePostCrisis must be used within PostCrisisProvider');
  return ctx;
}
