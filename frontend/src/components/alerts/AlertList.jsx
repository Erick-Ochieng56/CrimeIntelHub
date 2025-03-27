import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAlerts, deleteAlert, toggleAlertStatus } from '../../services/alertService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { formatDistance, formatDate } from '../../utils/formatters';

const AlertList = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, alertId: null });
  const [actionSuccess, setActionSuccess] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [sortBy, setSortBy] = useState('created'); // 'created', 'name', 'type'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAlerts();
      
      // Ensure data is an array before setting state
      if (Array.isArray(data)) {
        setAlerts(data);
      } else {
        setError('Received invalid data format');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (alert) => {
    try {
      setLoading(true);
      await toggleAlertStatus(alert.id, !alert.isActive);
      
      // Update alerts list
      setAlerts(alerts.map(a => 
        a.id === alert.id ? { ...a, isActive: !a.isActive } : a
      ));
      
      setActionSuccess(`Alert "${alert.name}" ${!alert.isActive ? 'activated' : 'deactivated'} successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error toggling alert status:', err);
      setError(`Failed to ${alert.isActive ? 'deactivate' : 'activate'} alert. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (alertId) => {
    setDeleteConfirmation({ show: true, alertId });
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteAlert(deleteConfirmation.alertId);
      
      // Remove deleted alert from state
      setAlerts(alerts.filter(alert => alert.id !== deleteConfirmation.alertId));
      
      setActionSuccess('Alert deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert. Please try again.');
    } finally {
      setLoading(false);
      setDeleteConfirmation({ show: false, alertId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmation({ show: false, alertId: null });
  };

  // Filter alerts based on active status
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'active') return alert.isActive;
    if (filter === 'inactive') return !alert.isActive;
    return true;
  });

  // Sort alerts
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    let compareResult = 0;

    if (sortBy === 'created') {
      compareResult = new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'name') {
      compareResult = a.name.localeCompare(b.name);
    } else if (sortBy === 'type') {
      // If multiple crime types, compare first one
      const aType = a.crimeTypes[0] || '';
      const bType = b.crimeTypes[0] || '';
      compareResult = aType.localeCompare(bType);
    }

    return sortOrder === 'asc' ? compareResult : -compareResult;
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Your Crime Alerts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Receive notifications when crimes matching your criteria occur in your selected areas.
          </p>
        </div>
        
        <Link to="/alerts/new" className="btn btn-primary">
          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Alert
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {actionSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{actionSuccess}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
              <div>
                <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Status
                </label>
                <select
                  id="filter-status"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="all">All Alerts</option>
                  <option value="active">Active Alerts</option>
                  <option value="inactive">Inactive Alerts</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-1">
                  Sort by
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="created">Date Created</option>
                  <option value="name">Alert Name</option>
                  <option value="type">Crime Type</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={toggleSortOrder}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {sortOrder === 'asc' ? (
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'} found
            </div>
          </div>
          
          {loading && !alerts.length ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : sortedAlerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Alert Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crime Types
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Radius
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          <Link to={`/alerts/${alert.id}`} className="hover:text-blue-600">
                            {alert.name}
                          </Link>
                        </div>
                        {alert.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {alert.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {alert.crimeTypes.map((type) => (
                            <span
                              key={type}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {alert.address ? (
                          <span title={alert.address}>
                            {alert.address.length > 30 ? `${alert.address.substring(0, 30)}...` : alert.address}
                          </span>
                        ) : (
                          <span>{alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistance(alert.radius)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          alert.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(alert.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link 
                            to={`/alerts/${alert.id}/edit`} 
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(alert)}
                            className={`${
                              alert.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'
                            }`}
                            disabled={loading}
                          >
                            {alert.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteClick(alert.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts found</h3>
              {filter !== 'all' ? (
                <p className="mt-1 text-sm text-gray-500">
                  Try changing your filter settings or 
                  <button 
                    className="ml-1 text-blue-600 hover:text-blue-500"
                    onClick={() => setFilter('all')}
                  >
                    view all alerts
                  </button>.
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first alert.
                </p>
              )}
              <div className="mt-6">
                <Link to="/alerts/new" className="btn btn-primary">
                  Create New Alert
                </Link>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation.show}
        onClose={handleDeleteCancel}
        title="Delete Alert"
      >
        <div className="p-6">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this alert? This action cannot be undone.
          </p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDeleteCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  Deleting...
                </span>
              ) : 'Delete Alert'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AlertList;
