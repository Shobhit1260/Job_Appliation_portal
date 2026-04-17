// @ts-nocheck
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Add interceptor for JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const isAuthEndpoint = (url = '') => {
  return url.startsWith('/auth/login') ||
    url.startsWith('/auth/register') ||
    url.startsWith('/auth/verify-email') ||
    url.startsWith('/auth/forgot-password') ||
    url.startsWith('/auth/reset-password');
};

let hasForcedLogout = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    const reqUrl = error?.config?.url || '';
    const isTokenError =
      detail === 'Token expired' ||
      detail === 'Invalid token' ||
      detail === 'Invalid authentication credentials';

    if (status === 401 && isTokenError && !isAuthEndpoint(reqUrl)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (!hasForcedLogout && window.location.pathname !== '/login') {
        hasForcedLogout = true;
        window.location.replace('/login?session=expired');
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  login: (data) => api.post('/auth/login', data),
  verifyLogin: (data) => api.post('/auth/login/verify', data),
  getOAuthUrl: (provider) => api.get(`/auth/oauth/${provider}/login`),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const applicationApi = {
  getAll: (params) => api.get('/application/getallApplication', { params }),
  getById: (id) => api.get(`/application/getApplication/${id}`),
  create: (data) => api.post('/application/create_application', data),
  update: (id, data) => api.patch(`/application/update_application/${id}`, data),
  delete: (id) => api.delete(`/application/delete_application/${id}`),
  getTimeline: (id) => api.get(`/application/gettimeline/${id}`),
  addScreeningAnswer: (id, data) => api.post(`/application/applications/${id}/screening-answers`, data),
  saveScreeningAnswers: (id, data) => api.post(`/application/applications/${id}/screening-answers`, data),
};

export const resumeApi = {
  getAll: () => api.get('/resume/resumes'),
  uploadDirect: (formData) => api.post('/resume/resumes/upload-direct', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getUploadUrl: () => api.get('/resume/resumes/upload-url'),
  uploadToStorage: (uploadUrl, file) => axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': 'application/pdf',
    },
  }),
  confirmUpload: (data) => api.post('/resume/confirm_upload', data),
  getById: (id) => api.get(`/resume/get_resume/${id}`),
  delete: (id) => api.delete(`/resume/delete_resume/${id}`),
};

export const reminderApi = {
  getAll: (params) => api.get('/reminder/reminders', { params }),
  create: (data) => api.post('/reminder/create_reminder', data),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/get_dashboard'),
};

export const settingsApi = {
  getSettings: () => api.get('/settings/settings'),
  updateSettings: (data) => api.put('/settings/settings', data),
};

export const notificationApi = {
  getNotifications: (params) => api.get('/settings/notifications', { params }),
  markAsRead: (id) => api.patch(`/settings/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/settings/notifications/read-all'),
  delete: (id) => api.delete(`/settings/notifications/${id}`),
  deleteAll: () => api.delete('/settings/notifications'),
};

export default api;
