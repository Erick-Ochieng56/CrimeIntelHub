import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for accessing and watching the user's geolocation
 * 
 * @param {Object} options - Geolocation API options
 * @param {boolean} options.enableHighAccuracy - Enables high accuracy mode
 * @param {number} options.timeout - Maximum time (ms) to wait for a position
 * @param {number} options.maximumAge - Maximum age (ms) of a cached position
 * @param {boolean} options.watchPosition - Whether to watch position continuously
 * @returns {Object} Geolocation state and functions
 */
export const useGeolocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 5000,
    maximumAge = 0,
    watchPosition = false,
  } = options;
  
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Success handler for geolocation API
  const handleSuccess = useCallback((pos) => {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = pos.coords;
    
    setPosition({
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      timestamp: pos.timestamp,
    });
    
    setLoading(false);
    setError(null);
  }, []);
  
  // Error handler for geolocation API
  const handleError = useCallback((err) => {
    setError({
      code: err.code,
      message: err.message || 'Failed to get your location',
    });
    
    setLoading(false);
  }, []);
  
  // Get current position
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      return;
    }
    
    setLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);
  
  // Set up position watching or get position once
  useEffect(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      return;
    }
    
    setLoading(true);
    
    let watchId;
    
    if (watchPosition) {
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy,
          timeout,
          maximumAge,
        }
      );
    }
    
    return () => {
      if (watchPosition && watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchPosition, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);
  
  return { position, error, loading, getCurrentPosition };
};
