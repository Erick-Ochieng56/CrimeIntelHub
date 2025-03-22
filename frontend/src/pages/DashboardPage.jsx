import React, { useEffect } from 'react';
import Dashboard from '../components/dashboard/Dashboard';
import Loader from '../components/common/Loader';
import { useCrimeData } from '../hooks/useCrimeData';

const DashboardPage = () => {
  const { fetchCrimeData, loading, error } = useCrimeData();
  
  useEffect(() => {
    // Fetch crime data when the dashboard page loads
    fetchCrimeData();
  }, [fetchCrimeData]);
  
  if (loading && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {error}
            </p>
            <button 
              onClick={fetchCrimeData} 
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
