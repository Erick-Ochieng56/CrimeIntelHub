import { useState, useEffect } from 'react';

/**
 * Custom hook for managing state with localStorage persistence
 * 
 * @param {string} key - The localStorage key
 * @param {*} initialValue - The initial value (used if localStorage has no value)
 * @returns {Array} [storedValue, setValue] - State getter and setter
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use provided initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      // Parse stored json or return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  // Update localStorage when storedValue changes
  useEffect(() => {
    try {
      // Allow value to be a function so it's consistent with useState
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setStoredValue];
};
