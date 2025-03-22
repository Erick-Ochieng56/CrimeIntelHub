import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/api',  // Relative URL that will be handled by Vite's proxy
  headers: {
    'Content-Type': 'application/json',
  },
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
