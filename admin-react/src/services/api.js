import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/teacher-eval/admin-react/';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  logout: () => api.post('/auth/logout')
};

// Users
export const usersAPI = {
  getAll: (page = 1, limit = 10) => api.get(`/users?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// Teachers
export const teachersAPI = {
  getAll: (page = 1, limit = 10) => api.get(`/teachers?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post('/teachers', data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`)
};

// Questions
export const questionsAPI = {
  getAll: (page = 1, limit = 50) => api.get(`/questions?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`)
};

// Evaluations
export const evaluationsAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/evaluations?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/evaluations/${id}`),
  updateStatus: (id, status) => api.patch(`/evaluations/${id}`, { status })
};

// Analytics
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getTeacherStats: () => api.get('/analytics/teachers'),
  getEvaluationStats: () => api.get('/analytics/evaluations'),
  getDetailedStats: () => api.get('/analytics/detailed')
};

// Departments
export const departmentsAPI = {
  getAll: () => api.get('/departments')
};

// Surveys
export const surveysAPI = {
  getAll: () => api.get('/surveys'),
  getResults: () => api.get('/surveys/results')
};

export default api;
