import { useState, useEffect, useCallback } from 'react';

export const useOfflineDetection = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);
  const [backOnlineNotification, setBackOnlineNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      if (wasOffline) {
        // Show notification only if we were offline before
        setBackOnlineNotification(true);
        setWasOffline(false);
      }
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const dismissNotification = useCallback(() => {
    setBackOnlineNotification(false);
  }, []);

  return { isOnline, backOnlineNotification, dismissNotification };
};

export const useLocalCache = (key, fetchFn, cacheDuration = 1 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // Try to load from cache first
      const cached = localStorage.getItem(`cache_${key}`);
      const cacheTime = localStorage.getItem(`cache_${key}_time`);
      const now = Date.now();

      if (cached && cacheTime && now - parseInt(cacheTime) < cacheDuration) {
        try {
          setData(JSON.parse(cached));
          return;
        } catch (err) {
          console.error('Cache parse error:', err);
        }
      }

      // Fetch fresh data if cache is expired
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn();
        setData(result);
        localStorage.setItem(`cache_${key}`, JSON.stringify(result));
        localStorage.setItem(`cache_${key}_time`, now.toString());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Listen for visibility changes - clear cache when tab comes back into focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        localStorage.removeItem(`cache_${key}_time`);
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [key, fetchFn, cacheDuration]);

  const clearCache = () => {
    localStorage.removeItem(`cache_${key}`);
    localStorage.removeItem(`cache_${key}_time`);
  };

  return { data, loading, error, clearCache };
};
