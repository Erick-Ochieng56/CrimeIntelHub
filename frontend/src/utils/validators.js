/**
 * Validate an email address
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export const validateEmail = (email) => {
  if (!email) return false;
  
  // Simple regex for basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a password (at least 8 chars with at least one number, uppercase, lowercase, and special char)
 * 
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
export const validatePassword = (password) => {
  if (!password) return false;
  
  // Check minimum length
  if (password.length < 8) return false;
  
  // Check for at least one number
  if (!/\d/.test(password)) return false;
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Check for at least one special character
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  
  return true;
};

/**
 * Validate a name (non-empty with valid characters)
 * 
 * @param {string} name - Name to validate
 * @returns {boolean} True if name is valid
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') return false;
  
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[A-Za-z\s\-']+$/;
  return nameRegex.test(name);
};

/**
 * Validate a phone number (basic international format)
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid
 */
export const validatePhone = (phone) => {
  if (!phone) return false;
  
  // Basic international phone validation
  // Allows for various formats like +1234567890, 123-456-7890, (123) 456-7890
  const phoneRegex = /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate a URL
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export const validateUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Validate latitude and longitude coordinates
 * 
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if coordinates are valid
 */
export const validateCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  
  // Check latitude range (-90 to 90)
  if (latitude < -90 || latitude > 90) return false;
  
  // Check longitude range (-180 to 180)
  if (longitude < -180 || longitude > 180) return false;
  
  return true;
};

/**
 * Validate a date is in the past
 * 
 * @param {Date} date - Date to validate
 * @returns {boolean} True if date is in the past
 */
export const validatePastDate = (date) => {
  if (!date) return false;
  
  const now = new Date();
  const dateToCheck = new Date(date);
  
  return dateToCheck < now;
};

/**
 * Validate a date is in the future
 * 
 * @param {Date} date - Date to validate
 * @returns {boolean} True if date is in the future
 */
export const validateFutureDate = (date) => {
  if (!date) return false;
  
  const now = new Date();
  const dateToCheck = new Date(date);
  
  return dateToCheck > now;
};

/**
 * Validate a date range
 * 
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {boolean} True if range is valid (startDate <= endDate)
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return start <= end;
};


export const validateUsername = (username) => {
  // Username must be 150 characters or fewer and only contain letters, digits, and @/./+/-/_
  const regex = /^[\w.@+-]{1,150}$/;
  return regex.test(username);
};

export const validateOrganization = (organization) => {
  // Simple validation - organization must be at least 2 characters
  return organization.length >= 2;
};

// For isAgencyUser, it's a boolean so no validation needed beyond checking if it exists