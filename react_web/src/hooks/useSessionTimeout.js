import { useEffect, useRef, useState } from 'react';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION = 2 * 60 * 1000; // 2 minutes warning

export const useSessionTimeout = (onTimeout, enabled = true) => {
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(WARNING_DURATION / 1000);

  const resetActivity = () => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    // Hide warning
    setShowWarning(false);
    setTimeRemaining(WARNING_DURATION / 1000);

    if (!enabled) return;

    // Set new warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_TIMEOUT);

    // Set new timeout for actual session end
    timeoutRef.current = setTimeout(() => {
      setShowWarning(false);
      if (onTimeout) onTimeout();
    }, INACTIVITY_TIMEOUT + WARNING_DURATION);
  };

  useEffect(() => {
    if (!enabled) return;

    // Track activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetActivity();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timeout
    resetActivity();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [enabled, onTimeout]);

  // Update countdown timer
  useEffect(() => {
    if (!showWarning) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showWarning]);

  const handleContinue = () => {
    resetActivity();
  };

  return { showWarning, timeRemaining, handleContinue };
};
