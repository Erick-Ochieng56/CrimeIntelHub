import React, { useState, useEffect, useRef } from 'react';
import { searchLocation } from '../../services/mapService';
import { useGeolocation } from '../../hooks/useGeolocation';

const LocationSearch = ({ onLocationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const { position, getCurrentPosition } = useGeolocation();
  
  // Handle click outside to close results dropdown
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
  
  // Handle search term changes with debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);
  
  const performSearch = async (term) => {
    try {
      setIsSearching(true);
      const results = await searchLocation(term);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching for locations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleLocationClick = (location) => {
    setSearchTerm(location.display_name);
    setShowResults(false);
    onLocationSelect({
      lat: parseFloat(location.lat),
      lng: parseFloat(location.lon),
      name: location.display_name
    });
  };
  
  const handleUseCurrentLocation = () => {
    getCurrentPosition();
    if (position) {
      setSearchTerm('Current Location');
      setShowResults(false);
      onLocationSelect({
        lat: position.latitude,
        lng: position.longitude,
        name: 'Current Location'
      });
    }
  };
  
  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for a location..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          onFocus={() => searchTerm && setShowResults(true)}
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {showResults && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-sm">
          {isSearching ? (
            <div className="px-4 py-2 text-gray-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            <>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center text-blue-600"
                onClick={handleUseCurrentLocation}
              >
                <svg 
                  className="mr-2 h-5 w-5" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use current location
              </button>
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                  onClick={() => handleLocationClick(result)}
                >
                  {result.display_name}
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-2 text-gray-500">No results found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
