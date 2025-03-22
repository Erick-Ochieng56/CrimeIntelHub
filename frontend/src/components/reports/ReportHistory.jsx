import React, { useState, useEffect } from 'react';
import { getReportHistory, deleteReport } from '../../services/reportService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { formatDate, formatFileSize } from '../../utils/formatters';

const ReportHistory = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, reportId: null });
  const [viewReport, setViewReport] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'format'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
  const [filter, setFilter] = useState(''); // Search filter
  
  useEffect(() => {
    fetchReportHistory();
  }, []);
  
  const fetchReportHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReportHistory();
      setReports(data);
    } catch (err) {
      console.error('Error fetching report history:', err);
      setError('Failed to load report history. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteClick = (reportId) => {
    setDeleteConfirmation({ show: true, reportId });
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteReport(deleteConfirmation.reportId);
      
      // Remove deleted report from state
      setReports(reports.filter(report => report.id !== deleteConfirmation.reportId));
      
      setDeleteConfirmation({ show: false, reportId: null });
    } catch (err) {
      console.error('Error deleting report:', err);
      setError('Failed to delete report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewReport = (report) => {
    setViewReport(report);
  };
  
  const handleDownload = (url, filename) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Filter reports based on search text
  const filteredReports = reports.filter(report => {
    if (!filter) return true;
    
    const searchText = filter.toLowerCase();
    return (
      report.title.toLowerCase().includes(searchText) ||
      report.format.toLowerCase().includes(searchText) ||
      (report.description && report.description.toLowerCase().includes(searchText))
    );
  });
  
  // Sort reports
  const sortedReports = [...filteredReports].sort((a, b) => {
    let compareResult = 0;
    
    if (sortBy === 'date') {
      compareResult = new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'name') {
      compareResult = a.title.localeCompare(b.title);
    } else if (sortBy === 'format') {
      compareResult = a.format.localeCompare(b.format);
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
          <h2 className="text-xl font-semibold text-gray-900">Report History</h2>
          <p className="mt-1 text-sm text-gray-500">
            View, download, and manage your generated reports.
          </p>
        </div>
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
      
      <Card>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row justify-between mb-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="date">Date Created</option>
                  <option value="name">Report Name</option>
                  <option value="format">Format</option>
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
              {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'} found
            </div>
          </div>
          
          {loading && !reports.length ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : sortedReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedReports.map((report) => (
                    <tr key={report.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {report.title}
                        </div>
                        {report.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {report.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {report.format.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(report.fileSize)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleViewReport(report)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDownload(report.downloadUrl, report.filename)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteClick(report.id)}
                            className="text-red-600 hover:text-red-900"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
              {filter ? (
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Generate your first report to see it listed here.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation.show}
        onClose={() => setDeleteConfirmation({ show: false, reportId: null })}
        title="Delete Report"
      >
        <div className="p-6">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this report? This action cannot be undone.
          </p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmation({ show: false, reportId: null })}
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
              ) : 'Delete Report'}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* View Report Modal */}
      <Modal
        isOpen={viewReport !== null}
        onClose={() => setViewReport(null)}
        title={viewReport?.title || 'View Report'}
        size="lg"
      >
        <div className="p-6">
          {viewReport && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{viewReport.title}</h3>
                  {viewReport.description && (
                    <p className="mt-1 text-sm text-gray-500">{viewReport.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {viewReport.format.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Created: {formatDate(viewReport.createdAt)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Size: {formatFileSize(viewReport.fileSize)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(viewReport.downloadUrl, viewReport.filename)}
                  className="btn btn-primary flex items-center"
                >
                  <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                {viewReport.format === 'pdf' ? (
                  <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-md flex items-center justify-center">
                    <p className="text-gray-400">PDF preview not available</p>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-4 rounded-md">
                    <p className="text-sm text-gray-500">Report preview not available for {viewReport.format.toUpperCase()} format</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewReport(null)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ReportHistory;
