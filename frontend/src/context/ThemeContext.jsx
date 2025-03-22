import React, { createContext, useState, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Create context
export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [storedTheme, setStoredTheme] = useLocalStorage('theme', 'light');
  const [theme, setTheme] = useState(storedTheme);
  
  // Update body class when theme changes
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update stored theme
    setStoredTheme(theme);
  }, [theme, setStoredTheme]);
  
  // Initialize theme based on user's system preference on initial load
  useEffect(() => {
    // Check if user has already set a preference
    if (storedTheme) return;
    
    // Check for system preference
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [storedTheme]);
  
  // Toggle theme function
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  // Set specific theme
  const setThemeMode = (mode) => {
    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
    }
  };
  
  // Context value
  const contextValue = {
    theme,
    toggleTheme,
    setTheme: setThemeMode,
    isDark: theme === 'dark'
  };
  
  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};
