import axios from 'axios';

// Determine API base URL based on environment
const getAPIBaseURL = () => {
  // For development (localhost)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    if (window.location.port === '5173' || window.location.port === '5174') {
      // Vite dev server
      return `http://${window.location.hostname}:80/teacher-eval/api/`;
    }
    // Apache/XAMPP
    return '/teacher-eval/api/';
  }
  
  // For production (Vercel) - use Render backend
  return 'https://fullbright.onrender.com/api/';
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
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
