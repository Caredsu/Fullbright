import { useEffect, useRef, useState } from 'react';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes (reduced from 30 for shared devices)
const WARNING_DURATION = 1 * 60 * 1000; // 1 minute warning (reduced from 2)
const STORAGE_EVENT_KEY = 'auth_session_event';

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

    console.log('🔄 Activity detected - resetting 15 minute inactivity timer');

    // Set new warning timeout (show warning 1 min before logout)
    warningTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Showing session timeout warning');
      setShowWarning(true);
    }, INACTIVITY_TIMEOUT);

    // Set new timeout for actual session end
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Session timeout - logging out due to inactivity');
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

    // 🔄 Multi-tab sync: Detect logout in other tabs
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_EVENT_KEY) {
        const data = JSON.parse(event.newValue || '{}');
        
        if (data.action === 'logout' && data.timestamp) {
          console.log('🔄 Logout detected in another tab - triggering logout here');
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
          setShowWarning(false);
          if (onTimeout) onTimeout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
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
