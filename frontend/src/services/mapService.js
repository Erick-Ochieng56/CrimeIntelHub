import api from './api';

const NOMINATIM_HEADERS = {
  'User-Agent': 'CrimeIntelHub/1.0',
  Accept: 'application/json',
};

/**
 * Format a Nominatim result into primary + secondary suggestion lines.
 */
export const formatPlaceSuggestion = (result) => {
  const address = result.address || {};
  const primary =
    address.name ||
    address.road ||
    address.neighbourhood ||
    address.suburb ||
    address.city ||
    address.town ||
    address.village ||
    result.display_name?.split(',')[0] ||
    'Unknown place';

  const secondaryParts = [
    address.suburb || address.neighbourhood,
    address.city || address.town || address.village || address.county,
    address.state,
    address.country,
  ].filter(Boolean);

  // Avoid duplicating the primary label in the secondary line
  const secondary = secondaryParts
    .filter((part) => part.toLowerCase() !== String(primary).toLowerCase())
    .join(', ');

  return { primary, secondary: secondary || result.display_name };
};

/**
 * Parse Nominatim boundingbox [south, north, west, east] into Leaflet LatLngBounds corners.
 */
export const parseNominatimBoundingBox = (boundingbox) => {
  if (!Array.isArray(boundingbox) || boundingbox.length < 4) return null;
  const [south, north, west, east] = boundingbox.map(Number);
  if ([south, north, west, east].some((n) => Number.isNaN(n))) return null;
  return [
    [south, west],
    [north, east],
  ];
};

/**
 * Search for a location by query string (Kenya-biased Nominatim).
 *
 * @param {string} query - Location search query
 * @param {Object} [options]
 * @param {{ west: number, south: number, east: number, north: number }} [options.viewbox]
 * @param {number} [options.limit]
 * @returns {Promise<Array>} Array of location results
 */
export const searchLocation = async (query, options = {}) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query.trim(),
      limit: String(options.limit ?? 8),
      addressdetails: '1',
      countrycodes: 'ke',
    });

    if (options.viewbox) {
      const { west, south, east, north } = options.viewbox;
      params.set('viewbox', `${west},${north},${east},${south}`);
      // Prefer nearby results but still allow Kenya-wide matches
      params.set('bounded', '0');
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: NOMINATIM_HEADERS }
    );

    if (!response.ok) {
      throw new Error('Location search failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error searching location:', error);
    throw new Error('Failed to search location');
  }
};

/**
 * Get reverse geocoding information for a location
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: NOMINATIM_HEADERS }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw new Error('Failed to get location information');
  }
};

/**
 * Get map layers information
 */
export const getMapLayers = async () => {
  try {
    const response = await api.get('/maps/layers/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch map layers');
  }
};

const parseOsrmRoute = (data) => {
  const leg = data?.routes?.[0];
  if (!leg?.geometry?.coordinates?.length) {
    throw new Error('No route found');
  }
  // GeoJSON [lng, lat] → Leaflet [lat, lng]
  const coordinates = leg.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return {
    coordinates,
    distanceM: leg.distance,
    durationS: leg.duration,
  };
};

/**
 * Driving route via Django → OSRM proxy (avoids CORS).
 * Falls back to VITE_OSRM_URL / localhost:5000 if the proxy is unreachable.
 *
 * @param {{ lat: number, lng: number }} from
 * @param {{ lat: number, lng: number }} to
 * @returns {Promise<{ coordinates: number[][], distanceM: number, durationS: number }>}
 */
export const getDrivingRoute = async (from, to) => {
  if (
    from?.lat == null ||
    from?.lng == null ||
    to?.lat == null ||
    to?.lng == null
  ) {
    throw new Error('Origin and destination are required');
  }

  const params = {
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
  };

  try {
    const response = await api.get('/maps/route/', { params, timeout: 20000 });
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    return parseOsrmRoute(response.data);
  } catch (proxyError) {
    const status = proxyError?.response?.status;
    const msg =
      proxyError?.response?.data?.error ||
      proxyError?.formattedMessage ||
      proxyError?.message;

    const osrmBase =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OSRM_URL) ||
      'http://localhost:5000';

    // On proxy 503 / unavailable, still try direct OSRM when VITE_OSRM_URL is set
    const shouldTryDirect =
      status === 503 ||
      /routing unavailable/i.test(String(msg)) ||
      !proxyError?.response;

    if (shouldTryDirect && osrmBase) {
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      try {
        const url = `${osrmBase.replace(/\/$/, '')}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Routing unavailable');
        const data = await res.json();
        if (data.code && data.code !== 'Ok') throw new Error('Routing unavailable');
        return parseOsrmRoute(data);
      } catch {
        throw new Error(
          msg && !/network|timeout|ECONNREFUSED/i.test(msg)
            ? msg
            : 'Routing unavailable'
        );
      }
    }

    throw new Error(msg || 'Routing unavailable');
  }
};

/**
 * Get crime clusters for map display
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
