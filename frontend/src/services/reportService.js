import api from './api';

/**
 * Fetch crime categories and resolve UI labels / names to category PKs.
 */
export const resolveCrimeTypeIds = async (rawTypes = []) => {
  const values = (Array.isArray(rawTypes) ? rawTypes : [rawTypes]).filter(
    (v) => v !== null && v !== undefined && v !== ''
  );
  if (values.length === 0) return [];

  const numeric = [];
  const labels = [];
  for (const value of values) {
    if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
      numeric.push(Number(value));
    } else {
      labels.push(String(value));
    }
  }

  if (labels.length === 0) {
    return [...new Set(numeric)];
  }

  try {
    const response = await api.get('/crimes/categories/', { params: { page_size: 200 } });
    const categories = Array.isArray(response.data)
      ? response.data
      : response.data?.results || [];

    const normalize = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const keysMatch = (a, b) => a === b || a.replace(/s$/, '') === b.replace(/s$/, '');

    const aliases = {
      theft: 'stealing',
      assault: 'offenses',
      burglary: 'breakings',
      vandalism: 'criminal damage',
      drug: 'dangerous drugs',
      'drug offenses': 'dangerous drugs',
      fraud: 'economic crimes',
      other: 'other offenses',
      traffic: 'traffic offenses',
      economic: 'economic crimes',
    };

    const resolved = new Set(numeric);
    for (const label of labels) {
      const key = normalize(label);
      const aliasKey = aliases[key] || key;
      const match = categories.find((cat) => {
        const nameKey = normalize(cat.name);
        return (
          keysMatch(nameKey, key) ||
          keysMatch(nameKey, aliasKey) ||
          String(cat.id) === String(label)
        );
      });
      if (match) resolved.add(match.id);
    }
    return [...resolved];
  } catch (error) {
    console.warn('Could not resolve crime category IDs; sending labels to backend', error);
    // Backend also accepts names — keep labels so filters still apply
    return [...new Set([...numeric, ...labels])];
  }
};

/**
 * Generate a crime report
 *
 * @param {Object} reportParams - Report parameters
 * @returns {Promise<Object>} Generated report data
 */
export const generateReport = async (reportParams) => {
  try {
    const rawTypes = reportParams.crimeTypes || reportParams.crime_types || [];
    const crimeTypeIds = await resolveCrimeTypeIds(rawTypes);

    const formattedParams = {
      title: reportParams.title,
      description: reportParams.description || '',
      report_type: reportParams.reportType || reportParams.report_type || 'crime_summary',
      start_date: reportParams.startDate
        ? reportParams.startDate.toISOString().split('T')[0]
        : reportParams.start_date,
      end_date: reportParams.endDate
        ? reportParams.endDate.toISOString().split('T')[0]
        : reportParams.end_date,
      crime_types: crimeTypeIds,
      include_charts: reportParams.includeCharts ?? reportParams.include_charts ?? true,
      include_map: reportParams.includeMap ?? reportParams.include_map ?? true,
      format: reportParams.format || 'pdf',
      radius: reportParams.radius,
    };

    if (reportParams.latitude != null && reportParams.longitude != null) {
      // Optional geo hint stored on report when serializer/model support radius
      formattedParams.radius = reportParams.radius ?? formattedParams.radius;
    }

    const response = await api.post('/reports/reports/', formattedParams);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to generate report');
  }
};

/**
 * Download a report file with auth headers (blob).
 */
export const downloadReportFile = async (report) => {
  const reportId = report?.id;
  if (!reportId) throw new Error('Report id is required');

  const response = await api.get(`/reports/reports/${reportId}/download/`, {
    responseType: 'blob',
  });

  const fmt = (report.format || 'pdf').toLowerCase();
  const ext = fmt === 'excel' ? 'xlsx' : fmt;
  const filename =
    report.filename ||
    `crime_report_${reportId}.${ext}`;

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
};

/**
 * Get report history
 *
 * @returns {Promise<Array>} Array of report objects
 */
export const getReportHistory = async () => {
  try {
    const response = await api.get('/reports/reports/');
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch report history');
  }
};

/**
 * Get a specific report by ID
 *
 * @param {string|number} reportId - The report ID
 * @returns {Promise<Object>} Report object
 */
export const getReport = async (reportId) => {
  try {
    const response = await api.get(`/reports/reports/${reportId}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch report');
  }
};

/**
 * Delete a report
 *
 * @param {string|number} reportId - The report ID
 * @returns {Promise<void>}
 */
export const deleteReport = async (reportId) => {
  try {
    await api.delete(`/reports/reports/${reportId}/`);
    return true;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to delete report');
  }
};

/**
 * Get report templates
 *
 * @returns {Promise<Array>} Array of report template objects
 */
export const getReportTemplates = async () => {
  try {
    const response = await api.get('/reports/templates/');
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch report templates');
  }
};

/**
 * Get a specific report template by ID
 *
 * @param {string|number} templateId - The template ID
 * @returns {Promise<Object>} Template object
 */
export const getReportTemplate = async (templateId) => {
  try {
    const response = await api.get(`/reports/templates/${templateId}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to fetch report template');
  }
};

/**
 * Save a report template
 *
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Saved template
 */
export const saveReportTemplate = async (templateData) => {
  try {
    if (templateData.id) {
      const response = await api.put(`/reports/templates/${templateData.id}/`, templateData);
      return response.data;
    } else {
      const response = await api.post('/reports/templates/', templateData);
      return response.data;
    }
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to save report template');
  }
};

/**
 * Delete a report template
 *
 * @param {string|number} templateId - The template ID
 * @returns {Promise<void>}
 */
export const deleteReportTemplate = async (templateId) => {
  try {
    await api.delete(`/reports/templates/${templateId}/`);
    return true;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to delete report template');
  }
};

/**
 * Generate a report using a template
 *
 * @param {string|number} templateId - The template ID
 * @param {Object} overrideParams - Parameters to override template defaults
 * @returns {Promise<Object>} Generated report data
 */
export const generateReportFromTemplate = async (templateId, overrideParams = {}) => {
  try {
    const rawTypes = overrideParams.crimeTypes || overrideParams.crime_types || [];
    const payload = { ...overrideParams };
    if (rawTypes.length) {
      payload.crime_types = await resolveCrimeTypeIds(rawTypes);
      delete payload.crimeTypes;
    }
    const response = await api.post(`/reports/templates/${templateId}/generate/`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to generate report from template');
  }
};
