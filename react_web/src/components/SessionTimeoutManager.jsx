import { useNavigate, useLocation } from 'react-router-dom';
import SessionTimeoutWarning from './SessionTimeoutWarning';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

export default function SessionTimeoutManager() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show timeout on landing page
  const isOnLanding = location.pathname === '/';
  
  const handleTimeout = () => {
    navigate('/');
  };

  const { showWarning, timeRemaining, handleContinue } = useSessionTimeout(
    handleTimeout,
    !isOnLanding // Only enable timeout when not on landing page
  );

  return (
    <SessionTimeoutWarning 
      show={showWarning} 
      timeRemaining={timeRemaining} 
      onContinue={handleContinue}
    />
  );
}
