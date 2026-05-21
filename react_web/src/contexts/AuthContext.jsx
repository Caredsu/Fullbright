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
      // Direct student access - no authentication required
      const studentData = {
        student_number: identifier,
        role: 'student'
      };
      
      const studentToken = 'student_' + identifier + '_' + Date.now();
      
      setToken(studentToken);
      setUser(studentData);
      setIsAuthenticated(true);
      
      localStorage.setItem('auth_token', studentToken);
      localStorage.setItem('user_data', JSON.stringify(studentData));
      localStorage.setItem('student_number', identifier);
      
      return { success: true };
    }
    
    // Admin login - authenticate with email/password
    try {
      const response = await api.post('login.php', { 
        username: identifier,
        password: password
      });
      
      if (response.data.success && response.data.token) {
        const { token: newToken, user: userData } = response.data;
        
        setToken(newToken);
        setUser(userData || { username: identifier });
        setIsAuthenticated(true);
        
        localStorage.setItem('auth_token', newToken);
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
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
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
