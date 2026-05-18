import axios from 'axios';

// Detect base path dynamically
const getBasePath = () => {
  const pathname = window.location.pathname;
  const pwaIndex = pathname.indexOf('/pwa/');
  
  if (pwaIndex !== -1) {
    return pathname.substring(0, pwaIndex + 5); // e.g., "/teacher-eval/pwa/" or "/pwa/"
  } else if (pathname.includes('/teacher-eval/')) {
    return '/teacher-eval/pwa/';
  }
  return '/pwa/';
};

const BASE_PATH = getBasePath();

// Determine API base URL
const getAPIBaseURL = () => {
  // In development mode (on port 5175), bypass the /pwa/api/ proxy
  // and go directly to the real backend API
  if (window.location.port === '5175' || window.location.port === '5174' || window.location.port === '5173') {
    // Dev server: use the current host (works from phone too!)
    const host = window.location.hostname;
    return `http://${host}/teacher-eval/api/`;
  }
  // Production: use the real API endpoint, not the PWA proxy
  // The API is at /teacher-eval/api/, not /teacher-eval/pwa/api/
  return '/teacher-eval/api/';
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
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = `${BASE_PATH}`;
    }
    return Promise.reject(error);
  }
);

export default api;
