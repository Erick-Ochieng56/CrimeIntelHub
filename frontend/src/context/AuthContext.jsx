// AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser, logoutUser } from '../services/auth';

// Create and export the context separately
export const AuthContext = createContext(null);

// Export the provider as a named export, not default
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize auth state by checking for existing token/session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const userData = await getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Authentication initialization error:', error);
        // Clear invalid token/session
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (username, password, rememberMe = false) => {
    setError(null);
    try {
      const { user, token } = await loginUser(username, password);
      
      // Store token based on remember me option
      if (rememberMe) {
        localStorage.setItem('token', token);
        sessionStorage.removeItem('token'); // Clear session storage if exists
      } else {
        sessionStorage.setItem('token', token);
        localStorage.removeItem('token'); // Clear local storage if exists
      }
      
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid username or password');
      throw error;
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const { user, token } = await registerUser(userData);
      
      // Store token in local storage
      localStorage.setItem('token', token);
      
      setUser(user);
      setIsAuthenticated(true);
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token regardless of API success/failure
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  // Auth context value
  const value = {
    user,
    loading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}