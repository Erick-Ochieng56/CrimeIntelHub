import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerUser, getCurrentUser, logoutUser, adminLogin, agencyLogin, agencyRegister } from '../services/auth';

// Create and export the context
export const AuthContext = createContext(null);

// Auth provider
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [userType, setUserType] = useState(null);
  const navigate = useNavigate();

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const userData = await getCurrentUser();
          console.log('Initialized user:', userData);
          if (isMounted) {
            setUser(userData);
            setUserType(userData.user_type);
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('Authentication initialization error:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        if (isMounted) {
          setIsAuthenticated(false);
          setUser(null);
          setUserType(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Generic login function with user type
  const login = useCallback(async (username, password, rememberMe = false, type = 'user') => {
    setError(null);
    try {
      let response;
      if (type === 'admin') {
        response = await adminLogin(username, password);
      } else if (type === 'agency') {
        response = await agencyLogin(username, password);
      } else {
        response = await loginUser(username, password);
      }

      console.log(`${type} login response:`, response);

      const { user, access, refresh } = response;

      if (rememberMe) {
        localStorage.setItem('token', access);
        localStorage.setItem('refresh_token', refresh);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refresh_token');
      } else {
        sessionStorage.setItem('token', access);
        sessionStorage.setItem('refresh_token', refresh);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
      }

      setUser(user);
      setUserType(user.user_type || type);
      setIsAuthenticated(true);

      // Improved redirection logic with console log for debugging
      console.log('User data for redirection:', { user, user_type: user.user_type, login_type: type });

      // Redirect based on login type first, then user_type
      if (type === 'admin') {
        navigate('/admin/dashboard');
      } else if (type === 'agency') {
        navigate('/agency/dashboard');
      } else if (user.user_type?.toLowerCase() === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.user_type?.toLowerCase() === 'agency') {
        navigate('/agency/dashboard');
      } else {
        navigate('/dashboard');
      }

      return user;
    } catch (error) {
      console.error(`${type} login error:`, error);
      setError(error.message || `Invalid ${type} credentials`);
      throw error;
    }
  }, [navigate]);

  // Admin login wrapper
  const adminLoginHandler = useCallback(async (username, password, rememberMe = false) => {
    return login(username, password, rememberMe, 'admin');
  }, [login]);

  // Agency login wrapper
  const agencyLoginHandler = useCallback(async (username, password, rememberMe = false) => {
    return login(username, password, rememberMe, 'agency');
  }, [login]);

  // Register function for regular users
  const register = useCallback(async (userData) => {
    setError(null);
    try {
      const { user, access, refresh } = await registerUser(userData);
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(user);
      setUserType(user.user_type);
      setIsAuthenticated(true);
      navigate('/dashboard');
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
      throw error;
    }
  }, [navigate]);

  // Agency registration function
  const registerAgency = useCallback(async (agencyData) => {
    setError(null);
    try {
      const { user, access, refresh } = await agencyRegister(agencyData);
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);
      setUser(user);
      setUserType(user.user_type);
      setIsAuthenticated(true);
      navigate('/agency/dashboard');
      return user;
    } catch (error) {
      console.error('Agency registration error:', error);
      setError(error.message || 'Agency registration failed. Please try again.');
      throw error;
    }
  }, [navigate]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refresh_token');
      setUser(null);
      setUserType(null);
      setIsAuthenticated(false);
      navigate('/login');
    }
  }, [navigate]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      setUserType(userData.user_type);
      return userData;
    } catch (error) {
      console.error('Error refreshing user data:', error);
      throw error;
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData) => {
    setUser(userData);
    setUserType(userData.user_type);
  }, []);

  // Auth context value
  const value = {
    user,
    loading,
    isAuthenticated,
    error,
    userType,
    login,
    adminLogin: adminLoginHandler,
    agencyLogin: agencyLoginHandler,
    register,
    registerAgency,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}