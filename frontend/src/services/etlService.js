// ETL Service for data import/export operations
import api from './api';

/**
 * Get all data sources for the current user/agency
 * @returns {Promise<Array>} List of data sources
 */
export const getDataSources = async () => {
  try {
    const response = await api.get('/etl/datasources/');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch data sources');
  }
};

/**
 * Create a new data source
 * @param {Object} dataSourceData - Data source configuration
 * @returns {Promise<Object>} Created data source
 */
export const createDataSource = async (dataSourceData) => {
  try {
    const response = await api.post('/etl/datasources/', dataSourceData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create data source');
  }
};

/**
 * Update a data source
 * @param {string} id - Data source ID
 * @param {Object} dataSourceData - Updated data source data
 * @returns {Promise<Object>} Updated data source
 */
export const updateDataSource = async (id, dataSourceData) => {
  try {
    const response = await api.patch(`/etl/datasources/${id}/`, dataSourceData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to update data source');
  }
};

/**
 * Delete a data source
 * @param {string} id - Data source ID
 * @returns {Promise<void>}
 */
export const deleteDataSource = async (id) => {
  try {
    await api.delete(`/etl/datasources/${id}/`);
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to delete data source');
  }
};

/**
 * Test connection to a data source
 * @param {string} id - Data source ID
 * @returns {Promise<Object>} Test result
 */
export const testDataSourceConnection = async (id) => {
  try {
    const response = await api.post(`/etl/datasources/${id}/test_connection/`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to test connection');
  }
};

/**
 * Get all import jobs
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Import jobs with pagination
 */
export const getImportJobs = async (params = {}) => {
  try {
    const response = await api.get('/etl/imports/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch import jobs');
  }
};

/**
 * Create a new import job
 * @param {Object} importJobData - Import job configuration
 * @returns {Promise<Object>} Created import job
 */
export const createImportJob = async (importJobData) => {
  try {
    const response = await api.post('/etl/imports/', importJobData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create import job');
  }
};

/**
 * Get import job details
 * @param {string} id - Import job ID
 * @returns {Promise<Object>} Import job details
 */
export const getImportJob = async (id) => {
  try {
    const response = await api.get(`/etl/imports/${id}/`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch import job');
  }
};

/**
 * Cancel an import job
 * @param {string} id - Import job ID
 * @returns {Promise<Object>} Updated import job
 */
export const cancelImportJob = async (id) => {
  try {
    const response = await api.post(`/etl/imports/${id}/cancel/`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to cancel import job');
  }
};

/**
 * Get all export jobs
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Export jobs with pagination
 */
export const getExportJobs = async (params = {}) => {
  try {
    const response = await api.get('/etl/exports/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch export jobs');
  }
};

/**
 * Create a new export job
 * @param {Object} exportJobData - Export job configuration
 * @returns {Promise<Object>} Created export job
 */
export const createExportJob = async (exportJobData) => {
  try {
    const response = await api.post('/etl/exports/', exportJobData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create export job');
  }
};

/**
 * Download export file
 * @param {string} id - Export job ID
 * @returns {Promise<Blob>} File blob
 */
export const downloadExportFile = async (id) => {
  try {
    const response = await api.get(`/etl/exports/${id}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to download file');
  }
};

/**
 * Get data transformation configurations
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Transformations with pagination
 */
export const getDataTransformations = async (params = {}) => {
  try {
    const response = await api.get('/etl/transformations/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch transformations');
  }
};

/**
 * Create a new data transformation
 * @param {Object} transformationData - Transformation configuration
 * @returns {Promise<Object>} Created transformation
 */
export const createDataTransformation = async (transformationData) => {
  try {
    const response = await api.post('/etl/transformations/', transformationData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create transformation');
  }
};

/**
 * Get import logs
 * @param {Object} params - Query parameters (job, status, etc.)
 * @returns {Promise<Object>} Import logs with pagination
 */
export const getImportLogs = async (params = {}) => {
  try {
    const response = await api.get('/etl/logs/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch import logs');
  }
};

/**
 * Get scheduled imports
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Scheduled imports with pagination
 */
export const getScheduledImports = async (params = {}) => {
  try {
    const response = await api.get('/etl/schedules/', { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to fetch scheduled imports');
  }
};

/**
 * Create a scheduled import
 * @param {Object} scheduleData - Schedule configuration
 * @returns {Promise<Object>} Created scheduled import
 */
export const createScheduledImport = async (scheduleData) => {
  try {
    const response = await api.post('/etl/schedules/', scheduleData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to create scheduled import');
  }
};

/**
 * Update a scheduled import
 * @param {string} id - Schedule ID
 * @param {Object} scheduleData - Updated schedule data
 * @returns {Promise<Object>} Updated scheduled import
 */
export const updateScheduledImport = async (id, scheduleData) => {
  try {
    const response = await api.patch(`/etl/schedules/${id}/`, scheduleData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to update scheduled import');
  }
};

/**
 * Delete a scheduled import
 * @param {string} id - Schedule ID
 * @returns {Promise<void>}
 */
export const deleteScheduledImport = async (id) => {
  try {
    await api.delete(`/etl/schedules/${id}/`);
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Failed to delete scheduled import');
  }
};
