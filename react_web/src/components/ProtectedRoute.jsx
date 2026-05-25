import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute Component
 * Ensures user is authenticated with a valid student_number before accessing routes
 * Redirects to landing page if not authenticated
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  // Show nothing while loading auth state
  if (loading) {
    return <div className="loading" />;
  }

  // Check if user is authenticated AND has a valid student_number
  const hasValidStudentNumber = user?.student_number && user.student_number !== 'anonymous';

  if (!isAuthenticated || !hasValidStudentNumber) {
    // Redirect to landing page if not authenticated or no student number
    return <Navigate to="/" replace />;
  }

  // User is authenticated with valid credentials
  return children;
}
