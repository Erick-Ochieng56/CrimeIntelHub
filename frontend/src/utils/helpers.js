/**
 * Throttle a function to prevent it from being called too often
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Debounce a function to delay its execution until after a waiting period
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to call the function immediately
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function(...args) {
    const context = this;
    
    const later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};

/**
 * Deep clone an object
 * 
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj);
  }
  
  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  // Handle Object
  if (obj instanceof Object) {
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = deepClone(obj[key]);
      }
    }
    return copy;
  }
  
  throw new Error('Unable to copy object! Its type is not supported.');
};

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point in degrees
 * @param {number} lon1 - Longitude of first point in degrees
 * @param {number} lat2 - Latitude of second point in degrees
 * @param {number} lon2 - Longitude of second point in degrees
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Convert to radians
  const toRad = (value) => (value * Math.PI) / 180;
  
  const R = 6371; // Radius of the earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Get a color based on a value within a range
 * 
 * @param {number} value - Value to get color for
 * @param {number} min - Minimum value in range
 * @param {number} max - Maximum value in range
 * @returns {string} Hex color string
 */
export const getColorForValue = (value, min, max) => {
  // Define color scale (green to yellow to red)
  const colors = [
    '#22c55e', // Green
    '#84cc16', // Lime
    '#eab308', // Yellow
    '#f97316', // Orange
    '#ef4444'  // Red
  ];
  
  // Normalize value to 0-1 range
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Calculate the index in the color array
  const index = Math.floor(normalized * (colors.length - 1));
  
  // Return the color at the calculated index
  return colors[index];
};

/**
 * Group an array of objects by a key
 * 
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by or function that returns a key
 * @returns {Object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    
    // Create group if it doesn't exist
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    
    // Add item to group
    result[groupKey].push(item);
    
    return result;
  }, {});
};

/**
 * Check if a feature is supported in the browser
 * 
 * @param {string} feature - Feature to check
 * @returns {boolean} True if feature is supported
 */
export const isSupported = (feature) => {
  switch (feature) {
    case 'geolocation':
      return 'geolocation' in navigator;
    case 'notifications':
      return 'Notification' in window;
    case 'serviceWorker':
      return 'serviceWorker' in navigator;
    case 'webshare':
      return 'share' in navigator;
    case 'webp':
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    case 'touch':
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    default:
      return false;
  }
};

/**
 * Format a URL with query parameters
 * 
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters
 * @returns {string} URL with query string
 */
export const formatUrlWithParams = (baseUrl, params = {}) => {
  const url = new URL(baseUrl, window.location.origin);
  
  // Add each parameter to the URL
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });
  
  return url.toString();
};

/**
 * Generate a unique ID
 * 
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export const generateId = (prefix = '') => {
  return prefix + Math.random().toString(36).substr(2, 9);
};
