import React, { useState, useEffect } from 'react';
import SearchFilters from './SearchFilters';
import SearchResults from './SearchResults';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { searchCrimes } from '../../services/crimeService';
import { useGeolocation } from '../../hooks/useGeolocation';

const AdvancedSearch = () => {
  const [searchParams, setSearchParams] = useState({
    query: '',
    crimeTypes: [],
    startDate: null,
    endDate: new Date(),
    latitude: null,
    longitude: null,
    radius: 5,
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });
  
  const [results, setResults] = useState({
    crimes: [],
    total: 0,
    loading: false,
    error: null
  });
  
  const { position } = useGeolocation();
  
  // Set user's location as search center if available
  useEffect(() => {
    if (position && !searchParams.latitude && !searchParams.longitude) {
      setSearchParams({
        ...searchParams,
        latitude: position.latitude,
        longitude: position.longitude
      });
    }
  }, [position, searchParams]);
  
  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setSearchParams({
      ...searchParams,
      ...newFilters,
      page: 1 // Reset to first page on filter change
    });
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setSearchParams({
      ...searchParams,
      page: newPage
    });
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle search submission
  const handleSearch = async (resetPage = true) => {
    try {
      setResults({
        ...results,
        loading: true,
        error: null
      });
      
      const searchFilters = {
        ...searchParams,
        page: resetPage ? 1 : searchParams.page
      };
      
      // Reset page to 1 if filters change
      if (resetPage) {
        setSearchParams({
          ...searchParams,
          page: 1
        });
      }
      
      const data = await searchCrimes(searchFilters);
      
      setResults({
        crimes: data.results,
        total: data.total,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error searching crimes:', err);
      setResults({
        ...results,
        loading: false,
        error: err.message || 'Failed to search crimes. Please try again.'
      });
    }
  };
  
  // Perform search when filters or pagination changes
  useEffect(() => {
    // Only search if we have a location or query
    if (
      (searchParams.latitude && searchParams.longitude) || 
      searchParams.query
    ) {
      handleSearch(false);
    }
  }, [searchParams.page, searchParams.limit]);
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Advanced Crime Search</h2>
          <SearchFilters 
            filters={searchParams} 
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />
        </div>
      </Card>
      
      {results.loading && (
        <div className="flex justify-center py-12">
          <Loader size="lg" />
        </div>
      )}
      
      {results.error && (
        <Card>
          <div className="p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{results.error}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {!results.loading && !results.error && (
        <SearchResults 
          results={results.crimes}
          total={results.total}
          currentPage={searchParams.page}
          limit={searchParams.limit}
          onPageChange={handlePageChange}
          searchLocation={{
            latitude: searchParams.latitude,
            longitude: searchParams.longitude,
            radius: searchParams.radius
          }}
        />
      )}
    </div>
  );
};

export default AdvancedSearch;
