import api from './api';

/**
 * Login user with username and password
 * 
 * @param {string} username - User username
 * @param {string} password - User password
 * @returns {Promise<Object>} User data and token
 */
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login/', { username, password });
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = error.response.data?.detail || 
                           error.response.data?.message || 
                           'Login failed. Please check your credentials.';
      throw new Error(errorMessage);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('No response from server. Please try again later.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(error.message || 'Login failed');
    }
  }
};

/**
 * Register new user
 * 
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} User data and token
 */
export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data?.detail || 
                          error.response.data?.message || 
                          'Registration failed';
      throw new Error(errorMessage);
    } else if (error.request) {
      throw new Error('No response from server. Please try again later.');
    } else {
      throw new Error(error.message || 'Registration failed');
    }
  }
};

/**
 * Logout user
 * 
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await api.post('/auth/logout/');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    // Just log error but don't throw since we want to clear local state anyway
  }
};

/**
 * Get current user profile
 * 
 * @returns {Promise<Object>} User data
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me/');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Failed to get user profile');
    } else if (error.request) {
      throw new Error('No response from server. Please try again later.');
    } else {
      throw new Error(error.message || 'Failed to get user profile');
    }
  }
};

/**
 * Update user profile
 * 
 * @param {Object} userData - User profile data to update
 * @returns {Promise<Object>} Updated user data
 */
export const updateUserProfile = async (userData) => {
  try {
    const response = await api.patch('/auth/profile/', userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Failed to update profile');
    } else {
      throw new Error(error.message || 'Failed to update profile');
    }
  }
};

/**
 * Change user password
 * 
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Success message
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/auth/change-password/', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Failed to change password');
    } else {
      throw new Error(error.message || 'Failed to change password');
    }
  }
};

/**
 * Request password reset
 * 
 * @param {string} username - User username
 * @returns {Promise<Object>} Success message
 */
export const requestPasswordReset = async (username) => {
  try {
    const response = await api.post('/auth/password-reset/', { username });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Failed to request password reset');
    } else {
      throw new Error(error.message || 'Failed to request password reset');
    }
  }
};

/**
 * Confirm password reset
 * 
 * @param {string} token - Reset token
 * @param {string} username - User username
 * @param {string} password - New password
 * @returns {Promise<Object>} Success message
 */
export const confirmPasswordReset = async (token, username, password) => {
  try {
    const response = await api.post('/auth/password-reset/confirm/', {
      token,
      username,
      password,
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.detail || 'Failed to reset password');
    } else {
      throw new Error(error.message || 'Failed to reset password');
    }
  }
};