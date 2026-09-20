import { useState, useEffect } from 'react';

/**
 * Custom hook for managing state with localStorage persistence
 * 
 * @param {string} key - The localStorage key
 * @param {*} initialValue - The initial value (used if localStorage has no value)
 * @returns {Array} [storedValue, setValue] - State getter and setter
 */
const readStoredValue = (key, initialValue) => {
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return initialValue;
    try {
      return JSON.parse(item);
    } catch {
      // Legacy plain strings (e.g. theme=auto from Django admin / older writes)
      return item;
    }
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
};

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() =>
    readStoredValue(key, initialValue)
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
};
