import { useContext } from 'react';
import { CrimeDataContext } from '../context/CrimeDataContext';

/**
 * Custom hook for accessing crime data context
 * 
 * @returns {Object} Crime data context containing statistics, trends, and related functions
 */
export const useCrimeData = () => {
  const context = useContext(CrimeDataContext);
  
  if (!context) {
    throw new Error('useCrimeData must be used within a CrimeDataProvider');
  }
  
  return context;
};
