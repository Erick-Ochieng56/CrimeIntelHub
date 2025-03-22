import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for accessing authentication context
 * 
 * @returns {Object} Authentication context containing user data, auth state and functions
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
