import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import '../styles/SessionWarning.css';

export default function SessionWarningComponent() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const handleWarning = () => {
      console.log('⚠️ Session warning: about to expire');
      setShowWarning(true);
      
      // Auto-close warning after 30 seconds
      const timeout = setTimeout(() => {
        setShowWarning(false);
      }, 30000);

      return () => clearTimeout(timeout);
    };

    window.addEventListener('sessionWarning', handleWarning);
    return () => window.removeEventListener('sessionWarning', handleWarning);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="session-warning-banner">
      <div className="warning-content">
        <AlertTriangle size={20} className="warning-icon" />
        <div className="warning-text">
          <strong>Session Timeout Warning</strong>
          <p>Your session will expire in 1 minute due to inactivity. Move your mouse or type to stay logged in.</p>
        </div>
      </div>
    </div>
  );
}
