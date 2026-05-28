import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Teachers from './pages/Teachers';
import Questions from './pages/Questions';
import Results from './pages/Results';
import Settings from './pages/Settings';

// Components
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import ToastContainer from './components/ToastContainer';

// Contexts
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';

// Hooks
import { useAuth } from './hooks/useAuth';
import useToast from './hooks/useToast';
import { useAuthContext } from './hooks/useAuthContext';

// Protected Route Component
function ProtectedRoute({ element, requiredRole }) {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  if (requiredRole && user.role !== 'super_admin' && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }
  
  return element;
}

function AppContent() {
  const { isAuthenticated, user, login, logout } = useAuthContext();
  const location = useLocation();
  const { canAccessUsers, canAccessSettings } = useAuth();

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="admin-layout">
      <Sidebar user={user} onLogout={logout} />
      <div className="main-content md:ml-64">
        <TopBar user={user} onLogout={logout} />
        <main className="page-container">
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route 
                path="/users" 
                element={<ProtectedRoute element={<Users />} requiredRole="super_admin" />} 
              />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/questions" element={<Questions />} />
              <Route path="/results" element={<Results />} />
              <Route 
                path="/settings" 
                element={<ProtectedRoute element={<Settings />} />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppWithToasts() {
  const { toasts, removeToast } = useToast();
  
  return (
    <>
      <AppContent />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppWithToasts />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

function App() {
  return <AppWithProviders />;
}

export default App;
