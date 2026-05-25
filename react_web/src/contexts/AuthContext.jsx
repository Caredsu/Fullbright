import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user_data');
    
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password = null) => {
    // Student access - if only one parameter or password is null, treat as student number
    if (password === null) {
      // Direct student access using JWT
      try {
        const response = await api.post('auth/student-login', { 
          student_number: identifier
        });

        if (response.data.success) {
          const { token: accessToken, refreshToken, user: userData } = response.data;
          
          setToken(accessToken);
          setUser(userData || { student_number: identifier, role: 'student' });
          setIsAuthenticated(true);
          
          localStorage.setItem('auth_token', accessToken);
          if (refreshToken) {
            localStorage.setItem('refresh_token', refreshToken);
          }
          localStorage.setItem('user_data', JSON.stringify(userData || { student_number: identifier, role: 'student' }));
          localStorage.setItem('student_number', identifier);
          
          return { success: true };
        } else {
          throw new Error(response.data.message || 'Access denied');
        }
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Access failed';
        return { success: false, error: message };
      }
    }
    
    // Admin login - authenticate with email/password
    try {
      const response = await api.post('auth/login', { 
        username: identifier,
        password: password
      });
      
      if (response.data.success) {
        const { token: accessToken, refreshToken, user: userData } = response.data;
        
        setToken(accessToken);
        setUser(userData || { username: identifier });
        setIsAuthenticated(true);
        
        localStorage.setItem('auth_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem('user_data', JSON.stringify(userData || { username: identifier }));
        
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Access denied');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Access failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    if (user?.student_number) {
      sessionStorage.removeItem(`dashboard_welcome_shown_${user.student_number}`);
    }
    sessionStorage.removeItem('dashboard_welcome_shown');
    
    // 🔄 Notify other tabs of logout (multi-tab sync)
    try {
      localStorage.setItem('auth_session_event', JSON.stringify({
        action: 'logout',
        timestamp: Date.now(),
        student_number: user?.student_number
      }));
    } catch (err) {
      console.warn('Could not sync logout to other tabs:', err);
    }

    // Clear all sensitive authentication data
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token'); // Clear JWT refresh token
    localStorage.removeItem('user_data');
    localStorage.removeItem('student_number');
    localStorage.removeItem('evaluation_draft'); // Clear draft on logout
    
    // Clear any device ID if it's a logout (not just session expiry)
    // Keep device ID for new login: localStorage.removeItem('teacher_eval_device_id');
    
    console.log('✅ Logout complete - all sensitive data cleared');
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
