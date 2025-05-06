// crimeService.js
import api from './api'; // Adjust import path as needed

// Helper function to extract coordinates from various formats
const extractCoordinates = (crime) => {
  let latitude, longitude;
  
  // Detailed logging to understand structure
  if (process.env.NODE_ENV === 'development') {
    console.debug('Extracting coordinates from crime:', crime.id, crime.case_number);
    if (crime.location) {
      console.debug('Location object:', crime.location);
    }
  }
  
  if (crime.location) {
    // Check if location has GIS x/y coordinates (standard in GIS: y=latitude, x=longitude)
    if (typeof crime.location.y === 'number' && typeof crime.location.x === 'number') {
      latitude = crime.location.y;
      longitude = crime.location.x;
      console.debug(`Found x/y coordinates for ${crime.id}: [${latitude}, ${longitude}]`);
    }
    // Check for explicit lat/lng properties
    else if (crime.location.latitude !== undefined && crime.location.longitude !== undefined) {
      latitude = crime.location.latitude;
      longitude = crime.location.longitude;
    }
    // Check if location might be a GeoJSON Point format
    else if (crime.location.coordinates && Array.isArray(crime.location.coordinates)) {
      // GeoJSON format is [longitude, latitude]
      longitude = crime.location.coordinates[0];
      latitude = crime.location.coordinates[1];
    }
  }
  
  // Fallback to direct properties if available
  if (latitude === undefined && crime.latitude !== undefined) {
    latitude = crime.latitude;
  }
  if (longitude === undefined && crime.longitude !== undefined) {
    longitude = crime.longitude;
  }
  
  return { latitude, longitude };
};

// Function to transform crime objects from API format to frontend format
const transformCrime = (crime) => {
  const { latitude, longitude } = extractCoordinates(crime);
  
  // Log missing coordinates for debugging
  if (latitude === undefined || longitude === undefined) {
    console.warn(`Missing coordinates for crime ID ${crime.id}, case ${crime.case_number}`);
  }

  return {
    id: crime.id,
    case_number: crime.case_number,
    type: crime.category?.name?.toUpperCase() || 'OTHER',
    latitude: latitude,
    longitude: longitude,
    date: crime.date,
    time: crime.time,
    description: crime.description,
    block_address: crime.block_address,
    district: crime.district?.name || '',
    is_violent: crime.is_violent,
    property_loss: crime.property_loss,
  };
};

// Fetch all crimes with pagination handling
export const getCrimes = async (params = {}) => {
  try {
    const requestParams = {};
    const allCrimes = [];
    let page = 1;
    let hasNextPage = true;
    
    // Map frontend parameter names to backend parameter names
    if (params.lat) requestParams.lat = params.lat;
    if (params.lng) requestParams.lng = params.lng;
    if (params.radius) requestParams.radius = params.radius;
    if (params.startDate) requestParams.date_from = params.startDate;
    if (params.endDate) requestParams.date_to = params.endDate;
    
    // Handle crime types - convert to backend format
    if (params.crimeTypes) {
      requestParams.category = params.crimeTypes
        .split(',')
        .map(type => type.toLowerCase())
        .join(',');
      console.log('Sent crime categories:', requestParams.category);
    }
    
    console.log('Initial request params:', requestParams);
    
    // First page request
    const initialResponse = await api.get('/crimes/crimes/', { params: requestParams });
    console.log(`Page ${page} response:`, {
      count: initialResponse.data.count,
      resultsLength: initialResponse.data.results?.length || 0,
      hasNextPage: !!initialResponse.data.next
    });
    
    // Process first page results
    if (initialResponse.data.results && Array.isArray(initialResponse.data.results)) {
      const firstPageCrimes = initialResponse.data.results.map(transformCrime);
      allCrimes.push(...firstPageCrimes);
    }
    
    // Store if there's a next page
    hasNextPage = !!initialResponse.data.next;
    const totalPages = Math.ceil(initialResponse.data.count / initialResponse.data.results.length);
    
    // Handle pagination - fetch all subsequent pages
    while (hasNextPage && page < totalPages) {
      page++;
      
      try {
        // Directly use the endpoint with page parameter instead of parsing next URL
        const pageParams = { ...requestParams, page: page };
        const pageResponse = await api.get('/crimes/crimes/', { params: pageParams });
        
        console.log(`Page ${page} response:`, {
          resultsLength: pageResponse.data.results?.length || 0,
          hasNextPage: !!pageResponse.data.next
        });
        
        if (pageResponse.data.results && Array.isArray(pageResponse.data.results)) {
          const pageCrimes = pageResponse.data.results.map(transformCrime);
          allCrimes.push(...pageCrimes);
        }
        
        hasNextPage = !!pageResponse.data.next;
      } catch (pageError) {
        console.error(`Error fetching page ${page}:`, pageError);
        break; // Stop pagination on error but return what we have so far
      }
    }
    
    console.log(`Fetched all crimes across ${page} pages. Total count: ${allCrimes.length}`);
    
    // Log sample data for debugging
    if (allCrimes.length > 0) {
      console.log('Sample crime after processing:', allCrimes[0]);
      
      // Log coordinate stats
      const withCoordinates = allCrimes.filter(c => 
        c.latitude !== undefined && c.longitude !== undefined);
      console.log(`Crimes with coordinates: ${withCoordinates.length}/${allCrimes.length} (${
        (withCoordinates.length / allCrimes.length * 100).toFixed(1)
      }%)`);
    }
    
    return allCrimes;
  } catch (error) {
    console.error('Crime fetch error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(
      error.response?.data?.detail || error.message || 'Failed to fetch crime data'
    );
  }
};

/**
 * Search for a location by query string
 * 
 * @param {string} query - Location search query
 * @returns {Promise<Array>} Array of location results
 */
export const searchLocation = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    // Use a geocoding service - this example uses Nominatim (OpenStreetMap's geocoder)
    // In a production app, you might want to use a commercial service like Google Maps, Mapbox, etc.
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
    
    if (!response.ok) {
      throw new Error('Location search failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching location:', error);
    throw new Error('Failed to search location');
  }
};

/**
 * Get reverse geocoding information for a location
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Location information
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    // Use a geocoding service
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    
    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw new Error('Failed to get location information');
  }
};

/**
 * Get map layers information
 * 
 * @returns {Promise<Array>} Array of map layer options
 */
export const getMapLayers = async () => {
  try {
    const response = await api.get('/maps/layers/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch map layers');
  }
};

/**
 * Get crime clusters for map display
 * 
 * @param {Object} params - Query parameters
 * @param {number} params.zoom - Map zoom level
 * @param {Array} params.bounds - Map bounds [west, south, east, north]
 * @param {Array} params.crimeTypes - Crime types to include
 * @param {string} params.startDate - Start date in YYYY-MM-DD format
 * @param {string} params.endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Clustered crime data
 */
export const getCrimeClusters = async (params = {}) => {
  try {
    const apiParams = {
      zoom: params.zoom,
      bounds: params.bounds?.join(','),
      crime_types: params.crimeTypes?.join(','),
      start_date: params.startDate,
      end_date: params.endDate,
    };
    
    const response = await api.get('/maps/clusters/', { params: apiParams });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch crime clusters');
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
    const response = await api.get('/crimes/crimes/search/', { params: apiParams });
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
// Fetch crime statistics - FIXED VERSION
export const getCrimeStats = async (params = {}) => {
  const apiParams = {
    time_frame: params.time_frame,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    date_from: params.date_from,
    date_to: params.date_to,
    category: params.crimeTypes?.join(','),
  };

  try {
    const response = await api.get('/crimes/stats/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Crime stats error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime statistics');
  }
};

// Fetch crime trends - FIXED VERSION
export const getCrimeTrends = async (params = {}) => {
  const apiParams = {
    time_frame: params.time_frame,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  try {
    console.log('Fetching crime trends with params:', apiParams);
    const response = await api.get('/crimes/trends/', { params: apiParams });
    console.log('Crime trends response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Crime trends error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime trends');
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