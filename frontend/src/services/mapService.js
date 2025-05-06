import api from './api';

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
    
    const response = await api.get('crimes/heatmap/', { params: apiParams });
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch crime clusters');
  }
};
