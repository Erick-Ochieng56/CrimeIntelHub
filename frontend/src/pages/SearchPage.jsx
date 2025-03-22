import React from 'react';
import AdvancedSearch from '../components/search/AdvancedSearch';

const SearchPage = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Crime Search</h1>
        <p className="mt-2 text-sm text-gray-600">
          Search for crime incidents based on location, type, and date range.
        </p>
      </div>
      
      <AdvancedSearch />
    </div>
  );
};

export default SearchPage;
