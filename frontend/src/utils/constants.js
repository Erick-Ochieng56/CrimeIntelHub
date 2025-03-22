/**
 * API endpoint URLs
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    LOGOUT: '/auth/logout/',
    ME: '/auth/me/',
    PASSWORD_RESET: '/auth/password-reset/',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset/confirm/',
    CHANGE_PASSWORD: '/auth/change-password/',
  },
  CRIMES: {
    LIST: '/crimes/',
    DETAIL: (id) => `/crimes/${id}/`,
    SEARCH: '/crimes/search/',
    STATS: '/crimes/stats/',
    TRENDS: '/crimes/trends/',
    RECENT: '/crimes/recent/',
  },
  ALERTS: {
    LIST: '/alerts/',
    DETAIL: (id) => `/alerts/${id}/`,
    NOTIFICATIONS: '/alerts/notifications/',
    NOTIFICATION_DETAIL: (id) => `/alerts/notifications/${id}/`,
  },
  REPORTS: {
    GENERATE: '/reports/generate/',
    HISTORY: '/reports/history/',
    DETAIL: (id) => `/reports/${id}/`,
    TEMPLATES: '/reports/templates/',
    TEMPLATE_DETAIL: (id) => `/reports/templates/${id}/`,
  },
  ANALYTICS: {
    PREDICT: '/analytics/predict/',
    HEATMAP: '/analytics/heatmap/',
    TIMESERIES: '/analytics/timeseries/',
  },
  MAPS: {
    LAYERS: '/maps/layers/',
    CLUSTERS: '/maps/clusters/',
  },
};

/**
 * Crime types with labels and colors
 */
export const CRIME_TYPES = {
  THEFT: {
    label: 'Theft',
    color: '#e53e3e', // Red
    icon: 'theft',
  },
  ASSAULT: {
    label: 'Assault',
    color: '#dd6b20', // Orange
    icon: 'assault',
  },
  BURGLARY: {
    label: 'Burglary',
    color: '#d69e2e', // Yellow
    icon: 'burglary',
  },
  ROBBERY: {
    label: 'Robbery',
    color: '#805ad5', // Purple
    icon: 'robbery',
  },
  VANDALISM: {
    label: 'Vandalism',
    color: '#3182ce', // Blue
    icon: 'vandalism',
  },
  DRUG: {
    label: 'Drug Offenses',
    color: '#38a169', // Green
    icon: 'drug',
  },
  FRAUD: {
    label: 'Fraud',
    color: '#6b46c1', // Indigo
    icon: 'fraud',
  },
  OTHER: {
    label: 'Other',
    color: '#718096', // Gray
    icon: 'other',
  },
};

/**
 * Map settings
 */
export const MAP_SETTINGS = {
  DEFAULT_CENTER: [40.7128, -74.0060], // Default center (New York City)
  DEFAULT_ZOOM: 13,
  MIN_ZOOM: 4,
  MAX_ZOOM: 18,
  CLUSTER_THRESHOLD: 100, // Number of points to start clustering
};

/**
 * Date range presets
 */
export const DATE_RANGES = {
  LAST_24_HOURS: {
    label: 'Last 24 Hours',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 1);
      return { start, end };
    },
  },
  LAST_7_DAYS: {
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      return { start, end };
    },
  },
  LAST_30_DAYS: {
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start, end };
    },
  },
  LAST_90_DAYS: {
    label: 'Last 90 Days',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      return { start, end };
    },
  },
  LAST_YEAR: {
    label: 'Last Year',
    getRange: () => {
      const end = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    },
  },
  THIS_MONTH: {
    label: 'This Month',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      return { start, end };
    },
  },
  THIS_YEAR: {
    label: 'This Year',
    getRange: () => {
      const end = new Date();
      const start = new Date(end.getFullYear(), 0, 1);
      return { start, end };
    },
  },
};

/**
 * Report formats
 */
export const REPORT_FORMATS = {
  PDF: {
    value: 'pdf',
    label: 'PDF Document',
    mimeType: 'application/pdf',
  },
  EXCEL: {
    value: 'excel',
    label: 'Excel Spreadsheet',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  CSV: {
    value: 'csv',
    label: 'CSV File',
    mimeType: 'text/csv',
  },
  JSON: {
    value: 'json',
    label: 'JSON Data',
    mimeType: 'application/json',
  },
};

/**
 * Application routes
 */
export const ROUTES = {
  HOME: '/',
  MAP: '/map',
  DASHBOARD: '/dashboard',
  ANALYTICS: '/analytics',
  ALERTS: '/alerts',
  REPORTS: '/reports',
  SEARCH: '/search',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
  PASSWORD_RESET: '/reset-password',
};

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'token',
  USER_INFO: 'user_info',
  THEME: 'theme',
  MAP_PREFERENCES: 'map_preferences',
  SEARCH_HISTORY: 'search_history',
  LAST_LOCATION: 'last_location',
};

/**
 * Pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};
