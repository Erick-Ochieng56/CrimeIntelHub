import api from './api';

/**
 * Generate a crime report
 * 
 * @param {Object} reportParams - Report parameters
 * @returns {Promise<Object>} Generated report data
 */
export const generateReport = async (reportParams) => {
  try {
    const formattedParams = {
      title: reportParams.title,
      description: reportParams.description,
      start_date: reportParams.startDate ? reportParams.startDate.toISOString().split('T')[0] : null,
      end_date: reportParams.endDate ? reportParams.endDate.toISOString().split('T')[0] : null,
      crime_types: reportParams.crimeTypes,
      latitude: reportParams.latitude,
      longitude: reportParams.longitude,
      radius: reportParams.radius,
      include_charts: reportParams.includeCharts,
      include_map: reportParams.includeMap,
      format: reportParams.format
    };
    
    const response = await api.post('/reports/analyses/', formattedParams);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to generate report');
  }
};

/**
 * Get report history
 * 
 * @returns {Promise<Array>} Array of report objects
 */
export const getReportHistory = async () => {
  try {
    const response = await api.get('/reports/reports/');
    return response.data;
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
    const response = await api.get(`/reports/${reportId}/`);
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
    await api.delete(`/reports/${reportId}/`);
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
    // If template has ID, update it, otherwise create new
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
    const response = await api.post(`/reports/templates/${templateId}/generate/`, overrideParams);
    return response.data;
  } catch (error) {
    throw new Error(error.formattedMessage || 'Failed to generate report from template');
  }
};
