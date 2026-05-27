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

// Hooks
import { useAuth } from './hooks/useAuth';

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

function AppContent({ isAuthenticated, user, onLogin, onLogout }) {
  const location = useLocation();
  const { canAccessUsers, canAccessSettings } = useAuth();

  if (!isAuthenticated) {
    return <Login onLogin={onLogin} />;
  }

  return (
    <div className="admin-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content md:ml-64">
        <TopBar user={user} onLogout={onLogout} />
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
                element={<ProtectedRoute element={<Settings />} requiredRole="super_admin" />} 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <AppContent 
        isAuthenticated={isAuthenticated} 
        user={user} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
      />
    </Router>
  );
}

export default App;
