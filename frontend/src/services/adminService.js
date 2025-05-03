// adminService.js
// This file contains functions to interact with the backend API for admin-related operations.
import api from './api';

export const getSystemStats = async () => {
  try {
    console.log('Fetching system stats from /agencies/admin-agencies/system_stats/');
    const response = await api.get('/agencies/admin-agencies/system_stats/');
    console.log('System stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching system stats:', error.response?.data || error.message);
    throw new Error('Failed to fetch system stats');
  }
};

export const fetchAgencies = async () => {
  try {
    console.log('Fetching pending agencies from /agencies/admin-agencies/pending/');
    const response = await api.get('/agencies/admin-agencies/pending/');
    console.log('Pending agencies response:', response.data);
    if (!Array.isArray(response.data)) {
      console.error('Expected an array for pending agencies, got:', response.data);
      throw new Error('Invalid pending agencies response format');
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching agencies:', error.response?.data || error.message);
    throw new Error('Failed to fetch agencies');
  }
};

export const approveAgency = async (agencyId) => {
  try {
    console.log(`Approving agency ${agencyId}`);
    const response = await api.post(`/agencies/admin-agencies/${agencyId}/approve/`);
    console.log('Approve agency response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error approving agency:', error.response?.data || error.message);
    throw new Error('Failed to approve agency');
  }
};

export const rejectAgency = async (agencyId) => {
  try {
    console.log(`Rejecting agency ${agencyId}`);
    const response = await api.post(`/agencies/admin-agencies/${agencyId}/reject/`);
    console.log('Reject agency response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error rejecting agency:', error.response?.data || error.message);
    throw new Error('Failed to reject agency');
  }
};