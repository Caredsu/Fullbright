import { useState, useCallback } from 'react';

const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    
    setToasts(prev => [...prev, { id, message, type, duration }]);

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message) => addToast(message, 'success', 3000), [addToast]);
  const error = useCallback((message) => addToast(message, 'error', 5000), [addToast]);
  const warning = useCallback((message) => addToast(message, 'warning', 4000), [addToast]);
  const info = useCallback((message) => addToast(message, 'info', 3000), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  };
};

export default useToast;
