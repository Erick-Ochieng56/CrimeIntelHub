import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { searchLocation } from '../../services/mapService';
import { useGeolocation } from '../../hooks/useGeolocation';
import Loader from '../common/Loader';

const SearchFilters = ({ filters, onFilterChange, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [address, setAddress] = useState('');
  const searchRef = useRef(null);
  
  const { position, getCurrentPosition } = useGeolocation();
  
  const crimeTypes = [
    { value: 'THEFT', label: 'Theft' },
    { value: 'ASSAULT', label: 'Assault' },
    { value: 'BURGLARY', label: 'Burglary' },
    { value: 'ROBBERY', label: 'Robbery' },
    { value: 'VANDALISM', label: 'Vandalism' },
    { value: 'DRUG', label: 'Drug Offenses' },
    { value: 'FRAUD', label: 'Fraud' },
    { value: 'OTHER', label: 'Other' },
  ];
  
  const sortOptions = [
    { value: 'date', label: 'Date (newest first)' },
    { value: 'date_asc', label: 'Date (oldest first)' },
    { value: 'type', label: 'Crime Type' },
    { value: 'distance', label: 'Distance (closest first)' },
  ];
  
  // Set initial address if coordinates are provided
  useEffect(() => {
    if (filters.latitude && filters.longitude && !address) {
      // We would normally use reverse geocoding here
      setAddress(`${filters.latitude.toFixed(6)}, ${filters.longitude.toFixed(6)}`);
    }
  }, [filters.latitude, filters.longitude, address]);
  
  // Handle click outside location search results to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSearch = () => {
    if (!filters.latitude && !filters.longitude && !filters.query) {
      // If no location or query, try to get current position
      getCurrentPosition();
    } else {
      onSearch(true);
    }
  };
  
  // Handle search for locations
  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      setShowResults(true);
      
      const results = await searchLocation(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching for location:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search on enter key
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLocationSearch();
    }
  };
  
  // Handle location selection from search results
  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    onFilterChange({
      latitude: lat,
      longitude: lon
    });
    
    setAddress(result.display_name);
    setSearchQuery('');
    setShowResults(false);
  };
  
  // Handle use current location
  const handleUseCurrentLocation = () => {
    if (position) {
      onFilterChange({
        latitude: position.latitude,
        longitude: position.longitude
      });
      setAddress('Current Location');
    } else {
      getCurrentPosition();
    }
    setShowResults(false);
  };
  
  // Handle crime type toggle
  const handleCrimeTypeToggle = (type) => {
    let newCrimeTypes;
    
    if (filters.crimeTypes.includes(type)) {
      newCrimeTypes = filters.crimeTypes.filter(t => t !== type);
    } else {
      newCrimeTypes = [...filters.crimeTypes, type];
    }
    
    onFilterChange({ crimeTypes: newCrimeTypes });
  };
  
  // Handle sort change
  const handleSortChange = (e) => {
    const value = e.target.value;
    
    if (value === 'date') {
      onFilterChange({ sortBy: 'date', sortOrder: 'desc' });
    } else if (value === 'date_asc') {
      onFilterChange({ sortBy: 'date', sortOrder: 'asc' });
    } else {
      onFilterChange({ sortBy: value, sortOrder: 'asc' });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="search-query" className="block text-sm font-medium text-gray-700">
            Search Terms
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="search-query"
              value={filters.query}
              onChange={(e) => onFilterChange({ query: e.target.value })}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter keywords to search"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Search by case number, description, or other details
          </p>
        </div>
        
        <div ref={searchRef}>
          <label htmlFor="location-search" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <div className="mt-1 relative">
            <input
              type="text"
              id="location-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Search for an address or location"
            />
            <button
              type="button"
              onClick={handleLocationSearch}
              className="absolute inset-y-0 right-0 px-3 py-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          
          {showResults && (
            <div className="absolute z-10 mt-1 w-full sm:w-96 bg-white shadow-lg rounded-md overflow-auto max-h-60">
              {isSearching ? (
                <div className="p-4 text-center">
                  <Loader size="sm" />
                  <p className="mt-2 text-sm text-gray-500">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  <li>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-blue-600 transition duration-150 text-sm"
                      onClick={handleUseCurrentLocation}
                    >
                      <div className="flex items-center">
                        <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use my current location
                      </div>
                    </button>
                  </li>
                  {searchResults.map((result) => (
                    <li key={result.place_id}>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition duration-150 text-sm"
                        onClick={() => handleSelectLocation(result)}
                      >
                        {result.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">No results found</p>
                  <button
                    type="button"
                    className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                    onClick={handleUseCurrentLocation}
                  >
                    Use my current location instead
                  </button>
                </div>
              )}
            </div>
          )}
          
          {address && (
            <div className="mt-1 text-sm text-gray-700 flex items-center">
              <svg className="h-4 w-4 text-gray-500 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {address}
              <button
                type="button"
                onClick={() => {
                  onFilterChange({ latitude: null, longitude: null });
                  setAddress('');
                }}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        <div>
          <label htmlFor="search-radius" className="block text-sm font-medium text-gray-700">
            Search Radius: {filters.radius} km
          </label>
          <div className="mt-1">
            <input
              type="range"
              id="search-radius"
              min="1"
              max="50"
              step="1"
              value={filters.radius}
              onChange={(e) => onFilterChange({ radius: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>1 km</span>
            <span>25 km</span>
            <span>50 km</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date Range
          </label>
          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => onFilterChange({ startDate: date })}
                selectsStart
                startDate={filters.startDate}
                endDate={filters.endDate}
                maxDate={filters.endDate || new Date()}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholderText="Start Date"
                isClearable
              />
            </div>
            <div>
              <DatePicker
                selected={filters.endDate}
                onChange={(date) => onFilterChange({ endDate: date })}
                selectsEnd
                startDate={filters.startDate}
                endDate={filters.endDate}
                minDate={filters.startDate}
                maxDate={new Date()}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholderText="End Date"
                isClearable
              />
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Crime Types
        </label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
          {crimeTypes.map((type) => (
            <div key={type.value} className="flex items-center">
              <input
                id={`crime-type-${type.value}`}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={filters.crimeTypes.includes(type.value)}
                onChange={() => handleCrimeTypeToggle(type.value)}
              />
              <label htmlFor={`crime-type-${type.value}`} className="ml-2 block text-sm text-gray-700">
                {type.label}
              </label>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Leave all unchecked to include all crime types
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="sort-option" className="block text-sm font-medium text-gray-700">
            Sort Results By
          </label>
          <select
            id="sort-option"
            value={
              filters.sortBy === 'date' && filters.sortOrder === 'asc' 
                ? 'date_asc' 
                : filters.sortBy
            }
            onChange={handleSortChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="results-per-page" className="block text-sm font-medium text-gray-700">
            Results Per Page
          </label>
          <select
            id="results-per-page"
            value={filters.limit}
            onChange={(e) => onFilterChange({ limit: Number(e.target.value) })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value={10}>10 results</option>
            <option value={20}>20 results</option>
            <option value={50}>50 results</option>
            <option value={100}>100 results</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
        <button
          type="button"
          onClick={() => {
            onFilterChange({
              query: '',
              crimeTypes: [],
              startDate: null,
              endDate: new Date(),
              radius: 5,
              sortBy: 'date',
              sortOrder: 'desc',
              limit: 20
            });
            setAddress('');
          }}
          className="btn btn-secondary"
        >
          Reset Filters
        </button>
        <button
          type="button"
          onClick={handleSearch}
          className="btn btn-primary"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default SearchFilters;
