import axios from 'axios';

// Determine API base URL based on environment
const getAPIBaseURL = () => {
  // For development (localhost or local network)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168')) {
    if (window.location.port === '5173' || window.location.port === '5174') {
      // Vite dev server - connect to Node.js backend
      const url = `http://${window.location.hostname}:3001/api/`;
      console.log('🚀 Using Node.js backend:', url);
      return url;
    }
    // Apache/XAMPP
    console.log('🚀 Using Apache/XAMPP backend: /teacher-eval/api/');
    return '/teacher-eval/api/';
  }
  
  // For production (Vercel) - use dedicated Render API service
  console.log('🚀 Using Production backend: https://teacher-eval-api.onrender.com/api/');
  return 'https://teacher-eval-api.onrender.com/api/';
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

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
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
