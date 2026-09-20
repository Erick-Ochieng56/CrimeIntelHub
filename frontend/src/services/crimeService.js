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

  // Heatmap / exported points often use top-level lat/lng
  if (latitude === undefined && crime.lat !== undefined) {
    latitude = crime.lat;
  }
  if (longitude === undefined && crime.lng !== undefined) {
    longitude = crime.lng;
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

// Transform crime objects (list serializer or map_data light serializer)
const transformCrime = (crime) => {
  const { latitude, longitude } = extractCoordinates(crime);

  if (latitude === undefined || longitude === undefined) {
    console.warn(`Missing coordinates for crime ID ${crime.id}, case ${crime.case_number}`);
  }

  let crimeType = 'OTHER';
  if (typeof crime.category === 'string' && crime.category) {
    crimeType = crime.category.toUpperCase();
  } else if (crime.category && crime.category.name) {
    crimeType = crime.category.name.toUpperCase();
  } else if (crime.type) {
    crimeType = String(crime.type).toUpperCase();
  } else if (crime.description) {
    crimeType = inferCategoryFromDescription(crime.description);
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
    district: crime.district?.name || crime.district || '',
    is_violent: crime.is_violent,
    property_loss: crime.property_loss,
  };
};

// Fetch crimes for map / list. Viewport requests use lightweight map_data (no 25-cap).
export const getCrimes = async (params = {}) => {
  try {
    const hasBbox =
      params.northEastLat != null &&
      params.northEastLng != null &&
      params.southWestLat != null &&
      params.southWestLng != null;

    const requestParams = {
      lat: params.lat != null ? parseFloat(params.lat) : undefined,
      lng: params.lng != null ? parseFloat(params.lng) : undefined,
      radius: params.radius != null ? parseFloat(params.radius) : undefined,
      northEastLat: params.northEastLat != null ? parseFloat(params.northEastLat) : undefined,
      northEastLng: params.northEastLng != null ? parseFloat(params.northEastLng) : undefined,
      southWestLat: params.southWestLat != null ? parseFloat(params.southWestLat) : undefined,
      southWestLng: params.southWestLng != null ? parseFloat(params.southWestLng) : undefined,
      date_from: params.startDate || params.date_from,
      date_to: params.endDate || params.date_to,
      start_date: params.startDate || params.date_from,
      end_date: params.endDate || params.date_to,
      crimeTypes: Array.isArray(params.crimeTypes) && params.crimeTypes.length > 0
        ? params.crimeTypes.filter((type) => type && typeof type === 'string').join(',')
        : undefined,
      page: params.page ? parseInt(params.page, 10) : 1,
      // DRF FlexiblePageNumberPagination honors both; map_data uses limit
      limit: params.limit ? parseInt(params.limit, 10) : hasBbox ? 1500 : 100,
      page_size: params.limit ? parseInt(params.limit, 10) : hasBbox ? 1500 : 100,
      offset: params.offset != null ? parseInt(params.offset, 10) : undefined,
    };

    Object.keys(requestParams).forEach((key) => {
      if (requestParams[key] === undefined || requestParams[key] === '') {
        delete requestParams[key];
      }
    });

    const endpoint = hasBbox ? 'crimes/map_data/' : 'crimes/';
    // Bbox loads must never hit the paginated list (old clients used limit=200 there)
    const response = await api.get(endpoint, {
      params: requestParams,
    });

    const results = Array.isArray(response.data.results) ? response.data.results : [];
    const transformedCrimes = results.map(transformCrime);

    return {
      results: transformedCrimes,
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
    };
  } catch (error) {
    console.error('Error fetching crimes:', error, 'Response:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime data');
  }
};

/**
 * Zoom-aware viewport load (districts → clusters → points).
 */
export const getMapViewport = async (params = {}) => {
  try {
    const requestParams = {
      zoom: params.zoom != null ? Math.round(Number(params.zoom)) : 12,
      northEastLat: params.northEastLat != null ? parseFloat(params.northEastLat) : undefined,
      northEastLng: params.northEastLng != null ? parseFloat(params.northEastLng) : undefined,
      southWestLat: params.southWestLat != null ? parseFloat(params.southWestLat) : undefined,
      southWestLng: params.southWestLng != null ? parseFloat(params.southWestLng) : undefined,
      date_from: params.startDate || params.date_from,
      date_to: params.endDate || params.date_to,
      crimeTypes: Array.isArray(params.crimeTypes) && params.crimeTypes.length > 0
        ? params.crimeTypes.filter((type) => type && typeof type === 'string').join(',')
        : undefined,
      limit: params.limit ? parseInt(params.limit, 10) : 2500,
      national: params.national ? '1' : undefined,
    };

    Object.keys(requestParams).forEach((key) => {
      if (requestParams[key] === undefined || requestParams[key] === '') {
        delete requestParams[key];
      }
    });

    const response = await api.get('crimes/viewport/', { params: requestParams });
    const mode = response.data.mode || 'points';
    const raw = Array.isArray(response.data.results) ? response.data.results : [];

    if (mode === 'points') {
      return {
        mode,
        zoom: response.data.zoom,
        count: response.data.count,
        truncated: Boolean(response.data.truncated),
        results: raw.map(transformCrime),
      };
    }

    return {
      mode,
      zoom: response.data.zoom,
      count: response.data.count,
      truncated: Boolean(response.data.truncated),
      results: raw,
    };
  } catch (error) {
    console.error('Error fetching map viewport:', error, 'Response:', error.response?.data);
    throw new Error(error.response?.data?.detail || 'Failed to fetch map viewport data');
  }
};

// Fetch neighborhood summaries (hierarchical → flat markers)
export const getCrimeSummaries = async (params = {}) => {
  try {
    const requestParams = {
      start_date: params.start_date || params.startDate,
      end_date: params.end_date || params.endDate,
      crimeTypes: Array.isArray(params.crimeTypes)
        ? params.crimeTypes.join(',')
        : params.crimeTypes,
      hierarchical: 'true',
      lat: params.lat,
      lng: params.lng,
      radius: params.radius,
    };

    Object.keys(requestParams).forEach((key) => {
      if (requestParams[key] === undefined || requestParams[key] === '') {
        delete requestParams[key];
      }
    });

    const response = await api.get('crimes/download_summary/', {
      params: requestParams,
      responseType: 'json',
    });

    const data = response.data || {};
    const results = [];

    if (Array.isArray(data.districts)) {
      for (const district of data.districts) {
        for (const n of district.neighborhoods || []) {
          const summary = n.crime_summary || {};
          const centroid = summary.centroid || {};
          const lat = centroid.latitude;
          const lng = centroid.longitude;
          if (lat == null || lng == null) continue;

          results.push({
            neighborhood_id: n.neighborhood_id,
            neighborhood_name: n.neighborhood_name,
            district_name: district.district_name,
            total_count: summary.total_count || 0,
            violent_count: summary.violent_count || 0,
            property_damage: summary.property_damage || 0,
            categories: summary.categories || [],
            // GeoJSON-style for NeighborhoodSummaryMarker + lat/lng convenience
            centroid: {
              latitude: lat,
              longitude: lng,
              coordinates: [lng, lat],
            },
            latitude: lat,
            longitude: lng,
          });
        }
      }
    } else if (Array.isArray(data.results)) {
      results.push(...data.results);
    }

    return {
      results,
      date_range: data.date_range,
      hierarchical: true,
      count: results.length,
    };
  } catch (error) {
    console.error('Error fetching crime summaries:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime summaries');
  }
};

// Fetch crime heatmap data
export const getCrimeHeatmap = async (params = {}) => {
  try {
    const apiParams = {
      days: params.days || 30,
      crime_types: params.crimeTypes?.join(','),
      agency_id: params.agencyId,
    };

    const response = await api.get('crimes/heatmap/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Error fetching crime heatmap:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime heatmap data');
  }
};

// Fetch crime summary for mapping (prefer file-based export, fall back to live heatmap)
export const getExportedCrimeSummary = async (params = {}) => {
  const apiParams = {
    days: params.days || 30,
    start_date: params.startDate || params.start_date,
    end_date: params.endDate || params.end_date,
    crime_types: Array.isArray(params.crimeTypes)
      ? params.crimeTypes.join(',')
      : params.crimeTypes,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    zoom: params.zoom,
    bounds: params.bounds?.join(','),
  };

  Object.keys(apiParams).forEach((key) => {
    if (apiParams[key] === undefined || apiParams[key] === '') {
      delete apiParams[key];
    }
  });

  const toHeatPoints = (items) =>
    (items || [])
      .map((item) => {
        const { latitude, longitude } = extractCoordinates(item);
        const lat = latitude ?? item.lat;
        const lng = longitude ?? item.lng;
        if (lat == null || lng == null) return null;
        return {
          lat: Number(lat),
          lng: Number(lng),
          intensity: Number(item.intensity || item.count || item.total_count || 1),
        };
      })
      .filter(Boolean);

  const pointsFromHierarchical = (data) => {
    const points = [];
    const districts = data?.districts;
    if (!Array.isArray(districts)) return points;

    const wanted = Array.isArray(params.crimeTypes)
      ? new Set(params.crimeTypes.map((t) => String(t).toUpperCase().replace(/\s+/g, '_')))
      : null;

    for (const district of districts) {
      for (const neighborhood of district.neighborhoods || []) {
        const summary = neighborhood.crime_summary || neighborhood;
        const categories = summary.categories || [];
        let intensity = summary.total_count || 1;
        if (wanted && wanted.size > 0) {
          const matched = categories.filter((c) =>
            wanted.has(String(c.name || '').toUpperCase().replace(/\s+/g, '_'))
          );
          if (categories.length && matched.length === 0) continue;
          intensity = matched.reduce((sum, c) => sum + (c.count || 0), 0) || intensity;
        }
        const centroid = summary.centroid || {};
        let lat = centroid.latitude;
        let lng = centroid.longitude;
        if ((lat == null || lng == null) && Array.isArray(centroid.coordinates)) {
          lng = centroid.coordinates[0];
          lat = centroid.coordinates[1];
        }
        if (lat == null || lng == null) continue;
        points.push({ lat: Number(lat), lng: Number(lng), intensity: Number(intensity) || 1 });
      }
    }
    return points;
  };

  // Prefer file-based export when present
  try {
    const exported = await api.get('crimes/exported_summary/', { params: apiParams });
    const data = exported.data || {};
    if (Array.isArray(data.heat_points) && data.heat_points.length > 0) {
      return toHeatPoints(data.heat_points);
    }
    const hierarchical = pointsFromHierarchical(data);
    if (hierarchical.length > 0) return hierarchical;
    if (Array.isArray(data.results) && data.results.length > 0) {
      return toHeatPoints(data.results);
    }
    if (Array.isArray(data) && data.length > 0) {
      return toHeatPoints(data);
    }
  } catch (error) {
    // 404 = no export file yet — fall through to live heatmap
    if (error.response?.status && error.response.status !== 404) {
      console.warn('Exported summary unavailable, falling back to heatmap', error);
    }
  }

  try {
    const response = await api.get('crimes/heatmap/', { params: apiParams });
    const raw = Array.isArray(response.data)
      ? response.data
      : response.data?.results || [];
    return toHeatPoints(raw);
  } catch (error) {
    console.error('Error fetching exported crime summary:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch exported crime summary');
  }
};

// Search for a location by query string
export const searchLocation = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`, {
      headers: {
        'User-Agent': 'CrimeIntelHub/1.0'
      }
    });
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
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'CrimeIntelHub/1.0'
      }
    });
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
    agency_id: params.agencyId,
  };
  try {
    const response = await api.get('crimes/stats/', { params: apiParams });
    return response.data;
  } catch (error) {
    console.error('Crime stats error:', error);
    throw new Error(error.response?.data?.detail || 'Failed to fetch crime statistics');
  }
};

export const getCrimeTrends = async (params = {}) => {
  const apiParams = {
    time_frame: params.time_frame,
    months: params.months,
    lat: params.lat,
    lng: params.lng,
    radius: params.radius,
    date_from: params.date_from,
    date_to: params.date_to,
    agency_id: params.agencyId,
  };
  try {
    const response = await api.get('crimes/trends/', { params: apiParams });
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
    const response = await api.post('crimes/search/', apiParams);
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
    const payload = {
      date: params.date,
      crime_type: params.crimeType || 'ALL',
      lat: params.lat,
      lng: params.lng,
    };

    // Prefer live unified predictor
    try {
      const live = await api.post('/analytics/predict/', payload);
      if (live.data?.type === 'FeatureCollection') {
        return (live.data.features || []).map((feature) => ({
          latitude: feature.geometry?.coordinates?.[1] || 0,
          longitude: feature.geometry?.coordinates?.[0] || 0,
          probability: feature.properties?.probability ?? 0,
          crimeType: feature.properties?.crime_type || payload.crime_type,
          date: params.date,
          radius: feature.properties?.radius || 300,
          factors: feature.properties?.factors || [],
          address: feature.properties?.address || null,
          timeOfDay: feature.properties?.time_of_day || 'All Day',
        }));
      }
    } catch (liveError) {
      console.warn('Live predict failed, trying stored predictions', liveError);
    }

    const apiParams = {
      date: params.date,
      crime_type: params.crimeType,
      lat: params.lat,
      lng: params.lng,
    };
    const response = await api.get('/analytics/crime-predictions/predictions/', {
      params: apiParams,
    });

    if (response.data?.type === 'FeatureCollection') {
      return (response.data.features || []).map((feature) => ({
        latitude: feature.geometry?.coordinates?.[1] || 0,
        longitude: feature.geometry?.coordinates?.[0] || 0,
        probability: feature.properties?.probability ?? 0,
        crimeType: feature.properties?.crime_type || params.crimeType || 'ALL',
        date: params.date,
        radius: feature.properties?.radius || 300,
        factors: feature.properties?.factors || [],
        address: feature.properties?.address || null,
        timeOfDay: feature.properties?.time_of_day || 'All Day',
      }));
    }

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        latitude: item.location?.latitude ?? item.latitude ?? 0,
        longitude: item.location?.longitude ?? item.longitude ?? 0,
        probability: (item.confidence != null ? item.confidence / 100 : item.probability) || 0,
        crimeType: item.crime_type?.name || item.crimeType || params.crimeType || 'ALL',
        date: params.date,
        radius: item.features?.radius || 300,
        factors: item.features?.factors || [],
        address: null,
        timeOfDay: item.features?.time_of_day || 'All Day',
      }));
    }

    return [];
  } catch (error) {
    console.error('Predictive analysis error:', error);
    throw new Error(
      error.response?.data?.error || error.message || 'Failed to fetch predictive analysis'
    );
  }
};

/**
 * Get current active crime hotspots
 * 
 * @returns {Promise<Array>} Array of hotspot objects
 */
export const getCurrentHotspots = async () => {
  try {
    const response = await api.get('/analytics/hotspots/current/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch current hotspots');
  }
};