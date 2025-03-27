import api from './api';

/**
 * Get all alerts for current user
 * 
 * @returns {Promise<Array>} Array of alert objects
 */

export const getAlerts = async () => {
  try {
    console.log('Attempting to fetch alerts');
    const response = await api.get('/alerts/');
    
    console.log('Full response:', response);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);
    
    // If the alerts are at a different endpoint, fetch them directly
    if (response.data.alerts && typeof response.data.alerts === 'string') {
      const alertsResponse = await api.get(response.data.alerts);
      return alertsResponse.data;
    }
    
    // Fallback to handling different response structures
    const data = response.data;
    
    if (!data) {
      console.error('No data received from API');
      return [];
    }
    
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Detailed error in getAlerts:', error);
    console.error('Error response:', error.response);
    throw new Error(error.formattedMessage || 'Failed to fetch alerts');
  }
};


/**
 * Get a single alert by ID
 * 
 * @param {string|number} alertId - The alert ID
 * @returns {Promise<Object>} Alert object
 */
export const getAlert = async (alertId) => {
  try {
    const response = await api.get(`/alerts/${alertId}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch alert');
  }
};

/**
 * Create a new alert
 * 
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Created alert
 */
export const createAlert = async (alertData) => {
  try {
    const response = await api.post('/alerts/', alertData);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to create alert');
  }
};

/**
 * Update an existing alert
 * 
 * @param {string|number} alertId - The alert ID
 * @param {Object} alertData - Updated alert data
 * @returns {Promise<Object>} Updated alert
 */
export const updateAlert = async (alertId, alertData) => {
  try {
    const response = await api.put(`/alerts/${alertId}/`, alertData);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to update alert');
  }
};

/**
 * Delete an alert
 * 
 * @param {string|number} alertId - The alert ID
 * @returns {Promise<void>}
 */
export const deleteAlert = async (alertId) => {
  try {
    await api.delete(`/alerts/${alertId}/`);
    return true;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to delete alert');
  }
};

/**
 * Toggle alert active status
 * 
 * @param {string|number} alertId - The alert ID
 * @param {boolean} isActive - New active status
 * @returns {Promise<Object>} Updated alert
 */
export const toggleAlertStatus = async (alertId, isActive) => {
  try {
    const response = await api.patch(`/alerts/${alertId}/`, {
      isActive: isActive
    });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to update alert status');
  }
};

/**
 * Get recent alert notifications
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.limit - Maximum number of notifications to return
 * @param {boolean} params.unreadOnly - Whether to only return unread notifications
 * @returns {Promise<Array>} Array of alert notifications
 */
export const getAlertNotifications = async (params = {}) => {
  try {
    const response = await api.get('/alerts/notifications/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch alert notifications');
  }
};

/**
 * Mark alert notification as read
 * 
 * @param {string|number} notificationId - The notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const response = await api.patch(`/alerts/notifications/${notificationId}/`, {
      read: true
    });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to mark notification as read');
  }
};
