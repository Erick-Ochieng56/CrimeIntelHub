/**
 * Map colour scales and county name matching for choropleth / clusters.
 */

const COUNT_STOPS = [
  { t: 0, color: '#fef9c3' },   // pale yellow
  { t: 0.25, color: '#fde047' },
  { t: 0.5, color: '#fb923c' },
  { t: 0.75, color: '#ef4444' },
  { t: 1, color: '#991b1b' },   // deep red
];

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

const rgbToHex = ([r, g, b]) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/** Interpolate sequential yellow→red by normalised count [0,1]. */
export const colorForRatio = (ratio) => {
  const t = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  let i = 0;
  while (i < COUNT_STOPS.length - 1 && t > COUNT_STOPS[i + 1].t) i += 1;
  const a = COUNT_STOPS[i];
  const b = COUNT_STOPS[Math.min(i + 1, COUNT_STOPS.length - 1)];
  const span = b.t - a.t || 1;
  const local = (t - a.t) / span;
  const ca = hexToRgb(a.color);
  const cb = hexToRgb(b.color);
  return rgbToHex([
    ca[0] + (cb[0] - ca[0]) * local,
    ca[1] + (cb[1] - ca[1]) * local,
    ca[2] + (cb[2] - ca[2]) * local,
  ]);
};

export const colorForCount = (count, maxCount) => {
  if (!maxCount || maxCount <= 0) return COUNT_STOPS[0].color;
  return colorForRatio(count / maxCount);
};

/** Legend swatches (low → high). */
export const COUNT_LEGEND_COLORS = COUNT_STOPS.map((s) => s.color);

/**
 * Normalise county / district names for joining GeoJSON ↔ API aggregates.
 */
export const normalizeCountyName = (name) => {
  let s = String(name || '')
    .toUpperCase()
    .replace(/['’]/g, '')
    .replace(/ELEGEYO/g, 'ELGEYO')
    .replace(/THARAKA\s*-?\s*NITHI/g, 'THARAKANITHI')
    .replace(/TAITA\s*TAVETA/g, 'TAITATAVETA')
    .replace(/TANA\s*RIVER/g, 'TANARIVER')
    .replace(/HOMA\s*BAY/g, 'HOMABAY')
    .replace(/TRANS\s*NZOIA/g, 'TRANSNZOIA')
    .replace(/UASIN\s*GISHU/g, 'UASINGISHU')
    .replace(/WEST\s*POKOT/g, 'WESTPOKOT')
    .replace(/ELGEYO\s*-?\s*MARAKWET/g, 'ELGEYOMARAKWET');
  return s.replace(/[^A-Z0-9]/g, '');
};

/**
 * Mid-zoom cluster bubble radius in metres (shrinks as you zoom in).
 */
export const clusterRadiusMeters = (count, zoom) => {
  const z = typeof zoom === 'number' ? zoom : 9;
  const zoomScale = Math.pow(2, Math.max(0, 10 - z));
  const size = 3500 + Math.sqrt(Math.max(count || 1, 1)) * 900;
  return Math.min(55000, size * zoomScale * 0.45);
};
