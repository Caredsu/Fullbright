import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import InstallPrompt from './components/InstallPrompt';
import SessionTimeoutManager from './components/SessionTimeoutManager';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import './styles/responsive.css';
import './styles/accessibility.css';
import './App.css';

// Get base path for routing
const getBasePath = () => {
  const pathname = window.location.pathname;
  
  // For Vercel production (root deployment)
  if (pathname === '/' || pathname.startsWith('/?') || !pathname.includes('teacher-eval')) {
    return '/';
  }
  
  // For local development with /teacher-eval/ path
  if (pathname.includes('/teacher-eval/')) {
    return '/teacher-eval/';
  }
  
  // For PWA installations (keep backward compatibility)
  if (pathname.includes('/pwa/')) {
    const pwaIndex = pathname.indexOf('/pwa/');
    return pathname.substring(0, pwaIndex + 5);
  }
  
  return '/';
};

const BASE_PATH = getBasePath();
window.PWA_BASE_PATH = BASE_PATH;

export default function App() {
  useEffect(() => {
    // Register service worker for PWA capabilities
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${BASE_PATH}service-worker.js`)
        .catch(err => {
          // SW registration failed
        });
    }

    // Detect if app is installed
    let displayMode = 'browser tab';
    if (navigator.standalone === true) {
      displayMode = 'standalone';
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router basename={BASE_PATH}>
          <InstallPrompt />
          <SessionTimeoutManager />
          <div className="app">
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/evaluate/:teacherId" 
                  element={
                    <ProtectedRoute>
                      <Evaluation />
                    </ProtectedRoute>
                  } 
                />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
