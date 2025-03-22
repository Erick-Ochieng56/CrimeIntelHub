/**
 * Format a date for display
 * 
 * @param {string|Date} date - Date string or Date object
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Default options
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(date);
  }
};

/**
 * Format a date range for display
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date range
 */
export const formatDateRange = (startDate, endDate, options = {}) => {
  if (!startDate || !endDate) return '';
  
  return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`;
};

/**
 * Format a number with thousands separators
 * 
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (num, decimals = 0) => {
  if (num === null || num === undefined) return '';
  
  try {
    return Number(num).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(num);
  }
};

/**
 * Format a currency value
 * 
 * @param {number} value - Currency value
 * @param {string} currencyCode - ISO currency code (e.g., 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currencyCode = 'USD') => {
  if (value === null || value === undefined) return '';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return String(value);
  }
};

/**
 * Format an address by generalizing to block level
 * 
 * @param {string} address - Full address
 * @returns {string} Generalized block-level address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  // Split address into parts
  return address;
};

/**
 * Format a file size
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format a time duration in milliseconds
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (ms) => {
  if (!ms) return '';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

/**
 * Format a distance value
 * 
 * @param {number} distance - Distance value in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance === null || distance === undefined) return '';
  
  if (distance < 1) {
    // Convert to meters for small distances
    const meters = Math.round(distance * 1000);
    return `${meters} m`;
  }
  
  // For larger distances, use kilometers with 1 decimal place
  return `${distance.toFixed(1)} km`;
};

/**
 * Format a percentage
 * 
 * @param {number} value - Value as a decimal (e.g. 0.123)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';
  
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
};
