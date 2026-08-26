import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('eventblast_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor to handle unauthenticated 401s
api.interceptors.response.use(
  (response) => {
    // Unwrap standard ApiResponse
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return response.data.data !== undefined ? response.data.data : response.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/rsvp')) {
        localStorage.removeItem('eventblast_token');
        localStorage.removeItem('eventblast_user');
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export default api as any;
