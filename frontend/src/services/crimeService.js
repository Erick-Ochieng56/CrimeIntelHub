import api from './api';

/**
 * Fetch crimes based on criteria
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} params.radius - Search radius in km
 * @param {string} params.crimeTypes - Comma-separated crime types
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of crime objects
 */
export const getCrimes = async (params = {}) => {
  try {
    const response = await api.get('/crimes/', { params });
    // Ensure response.data is an array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Crime fetch error:', error);
    throw new Error(error.formattedMessage || 'Failed to fetch crime data');
  }
};

/**
 * Search crimes with pagination
 * 
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query
 * @param {Array} params.crimeTypes - Array of crime types
 * @param {Date} params.startDate - Start date
 * @param {Date} params.endDate - End date
 * @param {number} params.latitude - Latitude
 * @param {number} params.longitude - Longitude
 * @param {number} params.radius - Search radius in km
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - Sort order ('asc' or 'desc')
 * @param {number} params.page - Page number
 * @param {number} params.limit - Results per page
 * @returns {Promise<Object>} Object with results array and total count
 */
export const searchCrimes = async (params = {}) => {
  // Format parameters for API
  const apiParams = {
    q: params.query,
    crime_types: params.crimeTypes?.join(','),
    start_date: params.startDate ? params.startDate.toISOString().split('T')[0] : undefined,
    end_date: params.endDate ? params.endDate.toISOString().split('T')[0] : undefined,
    lat: params.latitude,
    lng: params.longitude,
    radius: params.radius,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    page: params.page,
    limit: params.limit,
  };
  
  try {
    const response = await api.get('/crimes/search/', { params: apiParams });
    return {
      results: response.data.results,
      total: response.data.count,
    };
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to search crime data');
  }
};

/**
 * Get crime statistics
 * 
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Crime statistics
 */
export const getCrimeStats = async (params = {}) => {
  // Format parameters
  const apiParams = {
    time_frame: params.timeFrame,
    crime_types: params.crimeTypes?.join(','),
    start_date: params.startDate ? params.startDate.toISOString().split('T')[0] : undefined,
    end_date: params.endDate ? params.endDate.toISOString().split('T')[0] : undefined,
    lat: params.location?.latitude,
    lng: params.location?.longitude,
    radius: params.radius,
  };
  
  try {
    const response = await api.get('/crimes/statistics/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Crime stats error:', error);
    throw new Error(error.formattedMessage || 'Failed to fetch crime statistics');
  }
};

/**
 * Get crime trends over time
 * 
 * @param {Object} params - Filter parameters
 * @param {number} params.months - Number of months to look back (default is 12)
 * @param {Object} params.location - Contains latitude and longitude
 * @param {number} params.location.latitude - Latitude value
 * @param {number} params.location.longitude - Longitude value
 * @param {number} params.radius - Search radius in km
 * @returns {Promise<Object>} Crime trends data
 */
export const getCrimeTrends = async (params = {}) => {
  // Ensure all parameters are converted to strings
  const apiParams = {
    months: params.months ? params.months.toString() : '12', // default to 12 months
    lat: params.location?.latitude ? params.location.latitude.toString() : undefined,
    lng: params.location?.longitude ? params.location.longitude.toString() : undefined,
    radius: params.radius ? params.radius.toString() : undefined,
  };
  
  // Remove undefined parameters
  Object.keys(apiParams).forEach(key => apiParams[key] === undefined && delete apiParams[key]);
  
  try {
    // Use verbose error logging
    console.log('Fetching crime trends with params:', apiParams);
    
    const response = await api.get('/crimes/trends/', { params: apiParams });
    
    console.log('Crime trends response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Detailed crime trends error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      params: apiParams
    });
    
    throw new Error(
      error.response?.data?.detail || 
      error.message || 
      'Failed to fetch crime trends'
    );
  }
};

/**
 * Get crime heatmap data
 * 
 * @param {Object} params - Filter parameters
 * @returns {Promise<Array>} Heatmap data points
 */
export const getCrimeHeatmapData = async (params = {}) => {
  // Format parameters
  const apiParams = {
    start_date: params.startDate,
    end_date: params.endDate,
    crime_types: params.crimeTypes?.join(','),
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
  };
  
  try {
    const response = await api.get('/analytics/hotspots/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Heatmap error:', error);
    throw new Error(error.formattedMessage || 'Failed to fetch heatmap data');
  }
};

/**
 * Get time series analysis data
 * 
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Object>} Time series data
 */
export const getTimeSeriesData = async (params = {}) => {
  // Format parameters
  const apiParams = {
    start_date: params.startDate,
    end_date: params.endDate,
    crime_types: params.crimeTypes?.join(','),
    aggregation: params.aggregation,
    location: params.location,
  };
  
  try {
    const response = await api.get('/analytics/patterns/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Time series error:', error);
    throw new Error(error.formattedMessage || 'Failed to fetch time series data');
  }
};
/**
 * Get predictive analysis
 * 
 * @param {Object} params - Analysis parameters
 * @returns {Promise<Array>} Prediction data
 */
export const getPredictiveAnalysis = async (params = {}) => {
  // Format parameters
  const apiParams = {
    date: params.date,
    crime_type: params.crimeType,
    lat: params.lat,
    lng: params.lng,
  };
  
  try {
    const response = await api.get('/analytics/predictions/', { params: apiParams });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch predictive analysis');
  }
};
