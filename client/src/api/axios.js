import axios from 'axios';

// Create an axios instance with base URL and default headers
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach JWT token to headers if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally (optional)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API response error:', error && (error.message || error))
    // If unauthorized error, optionally clear local storage and redirect to login
    if (error.response && error.response.status === 419) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
