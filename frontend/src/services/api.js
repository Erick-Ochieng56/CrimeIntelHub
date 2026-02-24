import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000/api'
    : '/api'.replace(/\/$/, ''),
  withCredentials: true, // Important for handling CORS and cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // If token exists and is not a "null" or "undefined" string, add it to request headers
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }

    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      console.warn('Token expired, redirecting to login');

      // Clear the token
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');

      // Redirect to login page
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 Forbidden errors
    if (error.response && error.response.status === 403) {
      console.warn('Access forbidden');
      // Could redirect to unauthorized page or show message
    }

    // Handle 500 Server errors
    if (error.response && error.response.status >= 500) {
      console.error('Server error:', error.response.data);
    }

    // Format error message
    const errorMessage = error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'An error occurred';

    // Enhance error object with formatted message
    error.formattedMessage = errorMessage;

    // Log error details
    console.error('API Error:', {
      status: error.response?.status,
      message: errorMessage,
      url: error.config?.url,
      data: error.response?.data
    });

    return Promise.reject(error);
  }
);

export default api;
