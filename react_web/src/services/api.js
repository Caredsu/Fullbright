import axios from 'axios';

// Determine API base URL based on environment
const getAPIBaseURL = () => {
  // Use environment variable if available (Vite VITE_API_URL)
  if (import.meta.env.VITE_API_URL) {
    const url = `${import.meta.env.VITE_API_URL}/api`;
    console.log('🚀 Using environment-based backend:', url);
    return url;
  }
  
  // For development (localhost or local network)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168')) {
    // Always use the same hostname for the backend (just change port to 3001)
    const url = `http://${window.location.hostname}:3001/api`;
    console.log('🚀 Using Node.js backend:', url);
    return url;
  }
  
  // Default fallback to production Render backend
  console.log('🚀 Using Production backend: https://evaluation-backend-kaah.onrender.com/api');
  return 'https://evaluation-backend-kaah.onrender.com/api';
};

const API_BASE_URL = getAPIBaseURL();

// Create axios instance for API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Track if we're currently refreshing token (prevent multiple refresh attempts)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  isRefreshing = false;
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  response => response,
  error => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Try to refresh the token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        return api.post('/auth/refresh', { refreshToken })
          .then(res => {
            const { token: newAccessToken } = res.data;
            localStorage.setItem('auth_token', newAccessToken);
            
            // Update original request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            // Process queued requests with new token
            processQueue(null, newAccessToken);
            
            // Retry original request
            return api(originalRequest);
          })
          .catch(err => {
            console.log('🔴 Token refresh failed - logging out');
            processQueue(err, null);
            
            // Clear auth data and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
            localStorage.removeItem('student_number');
            
            window.location.href = '/';
            return Promise.reject(err);
          });
      } else {
        // No refresh token available - force logout
        console.log('🔴 No refresh token available - logging out');
        processQueue(new Error('No refresh token'), null);
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('student_number');
        
        window.location.href = '/';
        return Promise.reject(error);
      }
    }
    
    // Enhance error object with user-friendly message
    const errorData = error.response?.data || {};
    const statusCode = error.response?.status;
    
    let userMessage = error.message;
    
    if (errorData.message) {
      userMessage = errorData.message;
    } else if (statusCode === 400) {
      userMessage = 'Invalid request. Please check your input.';
    } else if (statusCode === 403) {
      userMessage = 'You do not have permission to perform this action.';
    } else if (statusCode === 404) {
      userMessage = 'The requested resource was not found.';
    } else if (statusCode === 500) {
      userMessage = 'Server error. Please try again later.';
    } else if (error.code === 'ECONNABORTED') {
      userMessage = 'Request timeout. Please check your connection.';
    } else if (error.message === 'Network Error') {
      userMessage = 'Network error. Please check your internet connection.';
    }
    
    error.userMessage = userMessage;
    return Promise.reject(error);
  }
);

/**
 * Helper to extract user-friendly error message
 * @param {Error} error - Error object from API call
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error) => {
  return error?.userMessage || error?.message || 'An unexpected error occurred';
};

export default api;
