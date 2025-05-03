// This file contains the Admin Dashboard page component for the application.

import React, { useState, useEffect, Component } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { fetchAgencies, approveAgency, rejectAgency, getSystemStats } from '../services/adminService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Error Boundary Component
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminDashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState(null);
  const [pendingAgencies, setPendingAgencies] = useState([]);
  const [activeTab, setActiveTab] = useState('agencies'); // Changed default tab to agencies

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        console.log('Fetching admin data...');
        setIsLoading(true);
        setError(null);

        // Fetch system stats and pending agencies concurrently
        const [statsResponse, agenciesResponse] = await Promise.all([
          getSystemStats(),
          fetchAgencies(),
        ]);

        console.log('System stats:', statsResponse);
        console.log('Pending agencies:', agenciesResponse);

        // Validate agencies response
        if (!Array.isArray(agenciesResponse)) {
          console.error('Expected an array for pending agencies, got:', agenciesResponse);
          throw new Error('Invalid pending agencies response format');
        }

        console.log('Number of pending agencies:', agenciesResponse.length);

        setSystemStats(statsResponse || {
          total_agencies: 0,
          approved_agencies: 0,
          pending_agencies: 0,
          disabled_agencies: 0,
          total_api_keys: 0,
          total_imports: 0,
          successful_imports: 0,
          latest_registrations: [],
        });

        setPendingAgencies(agenciesResponse);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
        setError(err.message || 'Failed to load dashboard data. Please try again.');
        setSystemStats({
          total_agencies: 0,
          approved_agencies: 0,
          pending_agencies: 0,
          disabled_agencies: 0,
          total_api_keys: 0,
          total_imports: 0,
          successful_imports: 0,
          latest_registrations: [],
        });
        setPendingAgencies([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleAgencyAction = async (agencyId, action) => {
    try {
      console.log(`Performing ${action} on agency ${agencyId}`);
      if (action === 'approve') {
        await approveAgency(agencyId);
      } else if (action === 'reject') {
        await rejectAgency(agencyId);
      }
      // Refresh data
      const [statsResponse, agenciesResponse] = await Promise.all([
        getSystemStats(),
        fetchAgencies(),
      ]);
      setSystemStats(statsResponse);

      // Validate agencies response
      if (!Array.isArray(agenciesResponse)) {
        console.error('Expected an array for pending agencies after action, got:', agenciesResponse);
        setPendingAgencies([]);
      } else {
        setPendingAgencies(agenciesResponse);
      }

      // Show success message
      setError(`Successfully ${action === 'approve' ? 'approved' : 'rejected'} the agency`);
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error(`Failed to ${action} agency:`, err);
      setError(`Failed to ${action} agency. Please try again.`);
    }
  };

  // Prepare chart data
  const agencyStatusData = {
    labels: ['Approved', 'Pending', 'Disabled'],
    datasets: [
      {
        label: 'Agency Status',
        data: [
          systemStats?.approved_agencies || 0,
          systemStats?.pending_agencies || 0,
          systemStats?.disabled_agencies || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Placeholder for API usage data
  const apiUsageData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'API Requests',
        data: [1200, 1900, 3000, 5400, 4800, 6300],
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Placeholder for analytics charts
  const apiUsageByAgencyData = {
    labels: ['Agency A', 'Agency B', 'Agency C', 'Agency D', 'Agency E'],
    datasets: [
      {
        label: 'API Requests (Last 30 Days)',
        data: [4500, 3200, 2800, 1900, 1200],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
    ],
  };

  const importVolumesData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Successful Imports',
        data: systemStats?.successful_imports ? [65, 59, 80, 81, 56, systemStats.successful_imports] : [65, 59, 80, 81, 56, 55],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
      {
        label: 'Failed Imports',
        data: systemStats?.failed_imports ? [12, 9, 3, 5, 2, systemStats.failed_imports] : [12, 9, 3, 5, 2, 3],
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className={`mb-6 p-4 ${error.includes('Failed') ? 'bg-red-50' : 'bg-green-50'} rounded-lg`}>
            <p className={error.includes('Failed') ? 'text-red-600' : 'text-green-600'}>{error}</p>
          </div>
        )}
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600">System overview and management</p>
          </div>

          {/* Admin Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="flex space-x-8">
              {['overview', 'agencies', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Agencies', value: systemStats?.total_agencies || 0, color: 'blue' },
                  { label: 'Approved Agencies', value: systemStats?.approved_agencies || 0, color: 'green' },
                  { label: 'Pending Approvals', value: systemStats?.pending_agencies || 0, color: 'yellow' },
                  { label: 'Disabled Agencies', value: systemStats?.disabled_agencies || 0, color: 'red' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 p-4 rounded-md shadow border border-gray-200">
                    <div className="text-gray-800 text-xl font-semibold">{stat.value}</div>
                    <div className="text-gray-600 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Quick Stats Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total API Keys', value: systemStats?.total_api_keys || 0, color: 'purple' },
                  { label: 'Data Imports', value: systemStats?.total_imports || 0, color: 'indigo' },
                  { label: 'Successful Imports', value: systemStats?.successful_imports || 0, color: 'green' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gray-50 p-4 rounded-md shadow border border-gray-200">
                    <div className="text-gray-800 text-xl font-semibold">{stat.value}</div>
                    <div className="text-gray-600 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-4 rounded-lg shadow border">
                  <h3 className="text-lg font-medium mb-2">Agency Status</h3>
                  <div className="h-64">
                    <Doughnut data={agencyStatusData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border">
                  <h3 className="text-lg font-medium mb-2">API Usage Trends</h3>
                  <div className="h-64">
                    <Bar data={apiUsageData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <div className="bg-white rounded-lg shadow border overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Agency
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {systemStats?.latest_registrations?.length ? (
                        systemStats.latest_registrations.map((agency, index) => (
                          <tr key={agency.id || index}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                              <div className="text-sm text-gray-500">{agency.agency_type}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Registration
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(agency.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                            No recent activity
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agencies Tab */}
          {activeTab === 'agencies' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Pending Approval Requests</h2>
                <p className="text-gray-600 text-sm">
                  Review and approve agency registration requests
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Pending agencies data loaded: {pendingAgencies ? pendingAgencies.length : 0} agencies
                </p>
              </div>
              <div className="bg-white rounded-lg shadow border overflow-hidden mb-8">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Agency Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingAgencies && pendingAgencies.length > 0 ? (
                      pendingAgencies.map((agency) => (
                        <tr key={agency.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                            <div className="text-sm text-gray-500">{agency.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{agency.agency_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{agency.city}</div>
                            <div className="text-sm text-gray-500">{agency.state}, {agency.country}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {agency.created_at ? new Date(agency.created_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleAgencyAction(agency.id, 'approve')}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 mr-2"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAgencyAction(agency.id, 'reject')}
                              className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                          No pending agencies found. {pendingAgencies === null ? 'Data not loaded correctly.' : ''}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Manual refresh button */}
              <div className="mb-6">
                <button
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      const agenciesResponse = await fetchAgencies();
                      console.log('Manually refreshed agencies:', agenciesResponse);
                      if (!Array.isArray(agenciesResponse)) {
                        console.error('Expected an array for refreshed agencies, got:', agenciesResponse);
                        setPendingAgencies([]);
                      } else {
                        setPendingAgencies(agenciesResponse);
                      }
                    } catch (err) {
                      console.error('Error refreshing agencies:', err);
                      setError('Failed to refresh agencies list. Please try again.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Refresh Pending Agencies
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { to: '/admin/agencies?status=approved', label: 'View Approved Agencies', desc: 'Manage active agencies in the system', color: 'green' },
                  { to: '/admin/agencies?status=disabled', label: 'View Disabled Agencies', desc: 'Check agencies with suspended access', color: 'red' },
                  { to: '/admin/system', label: 'System Settings', desc: 'Configure system-wide settings', color: 'blue' },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 border border-gray-200"
                  >
                    <div className="font-medium">{link.label}</div>
                    <p className="text-sm text-gray-600">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">System Analytics</h2>
                <p className="text-gray-600 text-sm">Monitor system performance and usage</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-lg font-medium mb-4">API Usage by Agency</h3>
                  <div className="h-80">
                    <Bar data={apiUsageByAgencyData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border">
                  <h3 className="text-lg font-medium mb-4">Data Import Volumes</h3>
                  <div className="h-80">
                    <Bar data={importVolumesData} options={{ maintainAspectRatio: false }} />
                  </div>
                </div>
              </div>
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">System Health</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-800 mb-3">API Response Time</h4>
                    {[
                      { label: 'Current', value: '120ms', status: 'Good', color: 'green', width: '15%' },
                      { label: '24h Average', value: '145ms', status: 'Good', color: 'green', width: '18%' },
                      { label: '7d Average', value: '160ms', status: 'Good', color: 'green', width: '20%' },
                    ].map((metric) => (
                      <div key={metric.label} className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{metric.label}: {metric.value}</span>
                          <span className="text-sm font-medium text-green-600">{metric.status}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: metric.width }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow border">
                    <h4 className="font-medium text-gray-800 mb-3">System Usage</h4>
                    {[
                      { label: 'Database', value: '65%', status: 'Moderate', color: 'yellow', width: '65%' },
                      { label: 'CPU+.js', value: '30%', status: 'Low', color: 'green', width: '30%' },
                      { label: 'Memory', value: '45%', status: 'Low', color: 'green', width: '45%' },
                    ].map((metric) => (
                      <div key={metric.label} className="mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                          <span className="text-sm font-medium text-yellow-600">{metric.status} ({metric.value})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className={`bg-${metric.color === 'yellow' ? 'yellow' : 'green'}-500 h-2 rounded-full`} style={{ width: metric.width }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('agencies')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Review Pending ({systemStats?.pending_agencies || 0})
              </button>
              <Link
                to="/admin/system/logs"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                System Logs
              </Link>
              <Link
                to="/admin/system/backup"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Database Backup
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AdminDashboardPage;