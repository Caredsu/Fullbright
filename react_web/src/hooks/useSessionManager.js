import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const INACTIVITY_WARNING = 14 * 60 * 1000; // 1 minute before timeout
const STORAGE_EVENT_KEY = 'auth_session_event';

export const useSessionManager = () => {
  const { logout, user } = useAuth();
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const hasLoggedOut = useRef(false);

  // Handle inactivity timeout
  const resetInactivityTimer = useCallback(() => {
    if (!user || hasLoggedOut.current) return;

    // Clear existing timers
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);

    // Set warning timer (1 min before logout)
    warningTimer.current = setTimeout(() => {
      // Dispatch warning event that can be listened by Toast component
      window.dispatchEvent(new CustomEvent('sessionWarning', {
        detail: { message: 'Your session will expire in 1 minute due to inactivity' }
      }));
    }, INACTIVITY_WARNING);

    // Set logout timer
    inactivityTimer.current = setTimeout(() => {
      console.log('⏰ Session expired due to inactivity');
      hasLoggedOut.current = true;
      logout();
      window.dispatchEvent(new CustomEvent('sessionTimeout'));
    }, INACTIVITY_TIMEOUT);
  }, [logout, user]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const resetTimer = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Initial timer setup
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [user, resetInactivityTimer]);

  // Multi-tab sync: Listen for logout events from other tabs
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === STORAGE_EVENT_KEY) {
        const data = JSON.parse(event.newValue || '{}');
        
        if (data.action === 'logout' && data.timestamp) {
          console.log('🔄 Detected logout in another tab, logging out here too');
          hasLoggedOut.current = true;
          logout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [logout]);

  return null;
};
