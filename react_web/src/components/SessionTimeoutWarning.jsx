import { LogOut, Clock } from 'lucide-react';
import '../styles/SessionTimeoutWarning.css';

export default function SessionTimeoutWarning({ show, timeRemaining, onContinue }) {
  if (!show) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <div className="session-timeout-header">
          <Clock size={32} className="session-timeout-icon" />
          <h2>Session Inactivity</h2>
        </div>

        <div className="session-timeout-content">
          <p className="session-timeout-message">
            You've been inactive for a while. Your session will expire in:
          </p>
          <div className="session-timeout-timer">
            <span className="timer-value">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
            <span className="timer-label">minutes remaining</span>
          </div>
          <p className="session-timeout-info">
            For security, we'll redirect you to the login page if you remain inactive.
          </p>
        </div>

        <div className="session-timeout-actions">
          <button
            className="btn-continue-session"
            onClick={onContinue}
          >
            <span>Continue Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
