import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for accessing and watching the user's geolocation
 *
 * @param {Object} options - Geolocation API options
 * @param {boolean} options.enableHighAccuracy - Enables high accuracy mode
 * @param {number} options.timeout - Maximum time (ms) to wait for a position
 * @param {number} options.maximumAge - Maximum age (ms) of a cached position
 * @param {boolean} options.watchPosition - Whether to watch position continuously
 * @param {boolean} options.requestOnMount - Request position when the hook mounts (default true)
 * @returns {Object} Geolocation state and functions
 */
export const useGeolocation = (options = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 8000,
    maximumAge = 60000,
    watchPosition = false,
    requestOnMount = true,
  } = options;

  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(requestOnMount));

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

  const handleError = useCallback((err) => {
    setError({
      code: err.code,
      message: err.message || 'Failed to get your location',
    });

    setLoading(false);
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    });
  }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  useEffect(() => {
    if (!requestOnMount) {
      return undefined;
    }

    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by your browser',
      });
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    let watchId;

    if (watchPosition) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
        enableHighAccuracy,
        timeout,
        maximumAge,
      });
    }

    return () => {
      if (watchPosition && watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [requestOnMount, watchPosition, enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

  return { position, error, loading, getCurrentPosition };
};
