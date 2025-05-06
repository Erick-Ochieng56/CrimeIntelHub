import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000/api' 
    : '/api'.replace(/\/$/, ''),
    withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling CORS and cookies
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage or sessionStorage
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // If token exists, add it to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      // Clear the token
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    
    // Format error message
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    
    // Enhance error object with formatted message
    error.formattedMessage = errorMessage;
    
    return Promise.reject(error);
  }
);

export default api;
