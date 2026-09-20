import api from './api';

/**
 * Get all alerts for current user
 *
 * @returns {Promise<Array>} Array of alert objects
 */

export const getAlerts = async () => {
  try {
    const response = await api.get('/alerts/alerts/');
    const data = response.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    return [];
  } catch (error) {
    console.error('Detailed error in getAlerts:', error);
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
    const response = await api.get(`/alerts/alerts/${alertId}/`);
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
    const response = await api.post('/alerts/alerts/', alertData);
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
    const response = await api.put(`/alerts/alerts/${alertId}/`, alertData);
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
    await api.delete(`/alerts/alerts/${alertId}/`);
    return true;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to delete alert');
  }
};

/**
 * Toggle alert active status via backend action
 *
 * @param {string|number} alertId - The alert ID
 * @param {boolean} [_isActive] - Ignored; backend toggles current state
 * @returns {Promise<Object>} Updated alert
 */
export const toggleAlertStatus = async (alertId, _isActive) => {
  try {
    const response = await api.post(`/alerts/alerts/${alertId}/toggle_active/`);
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
    const response = await api.post(
      `/alerts/notifications/${notificationId}/mark_as_read/`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to mark notification as read');
  }
};

/**
 * Get all active public safety alerts
 *
 * @returns {Promise<Array>} Array of public safety alert objects
 */
export const getPublicSafetyAlerts = async () => {
  try {
    const response = await api.get('/alerts/public-alerts/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch public safety alerts');
  }
};

/**
 * Get public safety alerts for a specific location
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in km
 * @returns {Promise<Array>} Array of public safety alert objects
 */
export const getAlertsByLocation = async (lat, lng, radius = 5) => {
  try {
    const response = await api.get('/alerts/public-alerts/by_location/', {
      params: { lat, lng, radius }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch alerts by location');
  }
};
