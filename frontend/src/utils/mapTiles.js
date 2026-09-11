/**
 * Google Maps–style viewport tiling helpers.
 * Stable keys + zoom tiers so pan/zoom does not thrash the API.
 */

/** @typedef {'districts' | 'clusters' | 'points'} MapTier */

/**
 * Zoom → data mode (far = aggregates, near = individual crimes).
 * @param {number} zoom
 * @returns {MapTier}
 */
export const getMapTier = (zoom) => {
  if (zoom < 8) return 'districts';
  if (zoom < 12) return 'clusters';
  return 'points';
};

/**
 * Rounding precision for stable React Query / tile keys by zoom.
 * @param {number} zoom
 * @returns {number}
 */
export const getTilePrecision = (zoom) => {
  if (zoom < 8) return 0;
  if (zoom < 10) return 1;
  if (zoom < 12) return 2;
  if (zoom < 14) return 2;
  return 3;
};

/**
 * Grid cell size (degrees) for server-side clustering at mid zoom.
 * @param {number} zoom
 * @returns {number}
 */
export const getClusterGridSize = (zoom) => {
  if (zoom < 9) return 0.5;
  if (zoom < 11) return 0.2;
  return 0.08;
};

/**
 * @param {import('leaflet').LatLngBounds} bounds
 * @param {number} zoom
 */
export const boundsToTileParams = (bounds, zoom) => {
  const precision = getTilePrecision(zoom);
  const round = (n) => Number(n.toFixed(precision));
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  return {
    northEastLat: round(ne.lat),
    northEastLng: round(ne.lng),
    southWestLat: round(sw.lat),
    southWestLng: round(sw.lng),
    zoom: Math.round(zoom),
    tier: getMapTier(zoom),
  };
};

/**
 * Stable string key for a viewport tile (React Query).
 */
export const viewportTileKey = (params) => {
  if (!params) return null;
  // National overview shares one cache entry (ignore exact bbox)
  if (params.national || params.tier === 'districts' || (params.zoom != null && params.zoom < 9)) {
    return [
      'national',
      params.tier,
      Math.round(params.zoom ?? 0),
      (params.crimeTypes || []).join(',') || '-',
      params.startDate || '-',
      params.endDate || '-',
    ].join('|');
  }
  return [
    params.tier,
    params.zoom,
    params.northEastLat,
    params.northEastLng,
    params.southWestLat,
    params.southWestLng,
    (params.crimeTypes || []).join(',') || '-',
    params.startDate || '-',
    params.endDate || '-',
  ].join('|');
};

/**
 * Expand bounds by a fraction for soft edge prefetch (like Maps overscan).
 * @param {import('leaflet').LatLngBounds} bounds
 * @param {number} [pad=0.35]
 */
export const padBoundsFraction = (bounds, pad = 0.35) => {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  const latPad = (ne.lat - sw.lat) * pad;
  const lngPad = (ne.lng - sw.lng) * pad;
  return {
    northEastLat: ne.lat + latPad,
    northEastLng: ne.lng + lngPad,
    southWestLat: sw.lat - latPad,
    southWestLng: sw.lng - lngPad,
  };
};

/**
 * Neighbor viewports to prefetch (N/S/E/W shifts by ~70% of current span).
 * @param {object} tileParams - from boundsToTileParams
 */
export const neighborTileParams = (tileParams) => {
  if (!tileParams) return [];
  const latSpan = tileParams.northEastLat - tileParams.southWestLat;
  const lngSpan = tileParams.northEastLng - tileParams.southWestLng;
  const shift = 0.7;

  const shifts = [
    { dLat: latSpan * shift, dLng: 0 },
    { dLat: -latSpan * shift, dLng: 0 },
    { dLat: 0, dLng: lngSpan * shift },
    { dLat: 0, dLng: -lngSpan * shift },
  ];

  return shifts.map(({ dLat, dLng }) => ({
    ...tileParams,
    northEastLat: Number((tileParams.northEastLat + dLat).toFixed(getTilePrecision(tileParams.zoom))),
    northEastLng: Number((tileParams.northEastLng + dLng).toFixed(getTilePrecision(tileParams.zoom))),
    southWestLat: Number((tileParams.southWestLat + dLat).toFixed(getTilePrecision(tileParams.zoom))),
    southWestLng: Number((tileParams.southWestLng + dLng).toFixed(getTilePrecision(tileParams.zoom))),
  }));
};
