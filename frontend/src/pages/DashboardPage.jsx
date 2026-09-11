import React from 'react';
import Dashboard from '../components/dashboard/Dashboard';

/**
 * Dashboard owns its own data loading. Do not gate on CrimeDataContext.loading —
 * that caused a remount loop (cache updates → new fetchCrimes identity →
 * loading=true → Dashboard unmounted before slow stats/trends could settle).
 */
const DashboardPage = () => (
  <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <Dashboard />
  </div>
);

export default DashboardPage;
