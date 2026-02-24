import React from 'react';
import CrimeMap from '../components/map/CrimeMap';
import ErrorBoundary from '../components/common/ErrorBoundary';

const MapPage = () => {
  return (
    <div className="h-full w-full">
      <ErrorBoundary>
        <CrimeMap />
      </ErrorBoundary>
    </div>
  );
};

export default MapPage;
