import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Evaluation from './pages/Evaluation';
import InstallPrompt from './components/InstallPrompt';
import SessionTimeoutManager from './components/SessionTimeoutManager';
import './App.css';

// Get base path for routing
const getBasePath = () => {
  const pathname = window.location.pathname;
  const pwaIndex = pathname.indexOf('/pwa/');
  
  if (pwaIndex !== -1) {
    return pathname.substring(0, pwaIndex + 5);
  } else if (pathname.includes('/teacher-eval/')) {
    return '/teacher-eval/pwa/';
  }
  return '/pwa/';
};

const BASE_PATH = getBasePath();
window.PWA_BASE_PATH = BASE_PATH;

export default function App() {
  useEffect(() => {
    // Register service worker for PWA capabilities
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(`${BASE_PATH}service-worker.js`)
        .catch(err => console.log('SW registration failed:', err));
    }

    // Detect if app is installed
    let displayMode = 'browser tab';
    if (navigator.standalone === true) {
      displayMode = 'standalone';
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    }
    console.log('[PWA] Display mode:', displayMode);
  }, []);

  return (
    <Router basename={BASE_PATH}>
      <InstallPrompt />
      <SessionTimeoutManager />
      <div className="app">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/evaluate/:teacherId" element={<Evaluation />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
