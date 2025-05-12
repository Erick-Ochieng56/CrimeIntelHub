import api from './api';

// Helper function to extract coordinates from various formats
const extractCoordinates = (crime) => {
  let latitude, longitude;
  
  if (process.env.NODE_ENV === 'development') {
    console.debug('Extracting coordinates from crime:', crime.id, crime.case_number);
    if (crime.location) {
      console.debug('Location object:', crime.location);
    }
  }
  
  if (crime.location) {
    if (typeof crime.location.y === 'number' && typeof crime.location.x === 'number') {
      latitude = crime.location.y;
      longitude = crime.location.x;
      console.debug(`Found x/y coordinates for ${crime.id}: [${latitude}, ${longitude}]`);
    } else if (crime.location.latitude !== undefined && crime.location.longitude !== undefined) {
      latitude = crime.location.latitude;
      longitude = crime.location.longitude;
    } else if (crime.location.coordinates && Array.isArray(crime.location.coordinates)) {
      longitude = crime.location.coordinates[0];
      latitude = crime.location.coordinates[1];
    }
  }
  
  if (latitude === undefined && crime.latitude !== undefined) {
    latitude = crime.latitude;
  }
  if (longitude === undefined && crime.longitude !== undefined) {
    longitude = crime.longitude;
  }
  
  return { latitude, longitude };
};

// Helper function to infer category from description
const inferCategoryFromDescription = (description) => {
  if (!description) return 'OTHER';
  const desc = description.toLowerCase();
  if (desc.includes('homicide') || desc.includes('murder')) return 'HOMICIDE';
  if (desc.includes('robbery')) return 'ROBBERY';
  if (desc.includes('theft') || desc.includes('stealing')) return 'STEALING';
  if (desc.includes('breaking') || desc.includes('burglary')) return 'BREAKINGS';
  if (desc.includes('drug') || desc.includes('narcotic')) return 'DANGEROUS_DRUGS';
  if (desc.includes('traffic')) return 'TRAFFIC';
  if (desc.includes('corruption')) return 'CORRUPTION';
  if (desc.includes('damage')) return 'CRIMINAL_DAMAGE';
  if (desc.includes('economic')) return 'ECONOMIC';
  if (desc.includes('violent')) return 'VIOLENT';
  return 'OTHER';
};

// Transform crime objects
const transformCrime = (crime) => {
  const { latitude, longitude } = extractCoordinates(crime);
  
  if (latitude === undefined || longitude === undefined) {
    console.warn(`Missing coordinates for crime ID ${crime.id}, case ${crime.case_number}`);
  }

  // Log category for debugging
  console.debug(`Crime ID ${crime.id} category:`, crime.category, 'name:', crime.category?.name);

  // Determine crime type
  let crimeType = 'OTHER';
  if (crime.category && crime.category.name) {
    crimeType = crime.category.name.toUpperCase();
  } else if (crime.description) {
    crimeType = inferCategoryFromDescription(crime.description);
    console.debug(`Inferred type for crime ID ${crime.id}: ${crimeType}`);
  }

  return {
    id: crime.id,
    case_number: crime.case_number,
    type: crimeType,
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

// Fetch individual crimes
export const getCrimes = async (params = {}) => {
  try {
    // Ensure unique and valid query parameters
    const requestParams = {
      lat: params.lat ? parseFloat(params.lat) : undefined,
      lng: params.lng ? parseFloat(params.lng) : undefined,
      radius: params.radius ? parseFloat(params.radius) || 5000 : 5000,
      date_from: params.startDate,
      date_to: params.endDate,
      category: Array.isArray(params.crimeTypes) && params.crimeTypes.length > 0
        ? params.crimeTypes.filter(type => type && typeof type === 'string').join(',')
        : undefined,
      page: params.page ? parseInt(params.page, 10) : undefined,
    };

    // Remove undefined or empty parameters
    Object.keys(requestParams).forEach(key => {
      if (requestParams[key] === undefined || requestParams[key] === '') {
        delete requestParams[key];
      }
    });

    console.log('Fetching crimes with params:', requestParams);

    let allResults = [];
    let nextPageUrl = 'crimes/crimes/';

    while (nextPageUrl) {
      const response = await api.get(nextPageUrl, {
        params: nextPageUrl === 'crimes/crimes/' ? requestParams : undefined,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      console.debug('Crime API response:', response.data);

      const results = Array.isArray(response.data.results) ? response.data.results : [];
      allResults = allResults.concat(results);
      nextPageUrl = response.data.next;
    }

    const transformedCrimes = allResults.map(transformCrime);
    console.log(`Fetched ${transformedCrimes.length} crimes:`, transformedCrimes);
    return transformedCrimes;
  } catch (error) {
    console.error('Error fetching crimes:', error, 'Response:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime data');
  }
};

// Fetch neighborhood summaries
export const getCrimeSummaries = async (params = {}) => {
  try {
    const requestParams = {
      start_date: params.start_date,
      end_date: params.end_date,
      crimeTypes: params.crimeTypes?.join(','),
      hierarchical: params.hierarchical ? 'true' : 'false',
      lat: params.lat,
      lng: params.lng,
      radius: params.radius || 5,
    };

    console.log('Fetching crime summaries with params:', requestParams);

    const response = await api.get('crimes/crimes/download_summary/', {
      params: requestParams,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
      responseType: 'json',
    });

    console.log(`Fetched crime summaries:`, response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching crime summaries:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime summaries');
  }
};

// Fetch crime summary for mapping (e.g., heatmap data)
export const getExportedCrimeSummary = async (params = {}) => {
  try {
    const apiParams = {
      start_date: params.startDate,
      end_date: params.endDate,
      crime_types: params.crimeTypes?.join(','),
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
      zoom: params.zoom,
      bounds: params.bounds?.join(','),
    };
    console.log('Fetching exported crime summary with params:', apiParams);
    const response = await api.get('crimes/crimes/heatmap/', { params: apiParams });
    return response.data.map(item => {
      const { latitude, longitude } = extractCoordinates(item);
      return {
        lat: latitude,
        lng: longitude,
        intensity: item.intensity || 1, // Default intensity if not provided
      };
    });
  } catch (error) {
    console.error('Error fetching exported crime summary:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch exported crime summary');
  }
};

// Other service functions remain unchanged
export const searchLocation = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  try {
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

export const reverseGeocode = async (lat, lng) => {
  try {
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

export const getMapLayers = async () => {
  try {
    const response = await api.get('/maps/layers/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch map layers');
  }
};

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
    const response = await api.get('crimes/crimes/stats/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Crime stats error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime statistics');
  }
};

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
    const response = await api.get('crimes/crimes/trends/', { params: apiParams });
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

export const searchCrimes = async (params = {}) => {
  const apiParams = {
    query: params.query,
    crime_types: params.crimeTypes,
    start_date: params.startDate ? params.startDate.toISOString().split('T')[0] : undefined,
    end_date: params.endDate ? params.endDate.toISOString().split('T')[0] : undefined,
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
    sort_by: params.sortBy,
    sort_order: params.sortOrder,
    page: params.page,
    limit: params.limit,
  };
  try {
    const response = await api.post('/crimes/crimes/search/', apiParams, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken')}`,
      },
    });
    return {
      results: response.data.results,
      total: response.data.count,
    };
  } catch (error) {
    console.error('Error searching crimes:', error);
    throw new Error(error.response?.data?.detail || 'Failed to search crime data');
  }
};

export const getTimeSeriesData = async (params = {}) => {
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

export const getPredictiveAnalysis = async (params = {}) => {
  try {
    const apiParams = {
      date: params.date,
      crime_type: params.crimeType,
      lat: params.lat,
      lng: params.lng,
    };
    console.log('Calling predictive API with params:', apiParams);
    const response = await api.get('/analytics/crime-predictions/predictions/', { params: apiParams });
    if (response.data && response.data.type === 'FeatureCollection') {
      const predictions = response.data.features.map(feature => ({
        latitude: feature.geometry?.coordinates?.[1] || 0,
        longitude: feature.geometry?.coordinates?.[0] || 0,
        probability: feature.properties?.probability || Math.random() * 0.8,
        crimeType: feature.properties?.crime_type || params.crimeType || 'ALL',
        date: params.date,
        radius: feature.properties?.radius || 300,
        factors: feature.properties?.factors || [],
        address: feature.properties?.address || null,
        timeOfDay: feature.properties?.time_of_day || 'All Day',
      }));
      return predictions;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && typeof response.data === 'object') {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    console.warn('Unexpected prediction API response format:', response.data);
    return [];
  } catch (error) {
    console.error('Predictive analysis error:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to fetch predictive analysis');
  }
};