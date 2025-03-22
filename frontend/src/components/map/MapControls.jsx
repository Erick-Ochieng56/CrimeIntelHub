import React, { useState, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import LocationSearch from './LocationSearch';

const CRIME_TYPES = [
  { value: 'THEFT', label: 'Theft' },
  { value: 'ASSAULT', label: 'Assault' },
  { value: 'BURGLARY', label: 'Burglary' },
  { value: 'ROBBERY', label: 'Robbery' },
  { value: 'VANDALISM', label: 'Vandalism' },
  { value: 'DRUG', label: 'Drug Offenses' },
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'OTHER', label: 'Other' },
];

const MapControls = ({ onFilterChange, onLocationChange, filters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchRadius, setSearchRadius] = useState(filters.searchRadius || 5);
  const [dateRange, setDateRange] = useState({
    startDate: filters.dateRange?.start || null,
    endDate: filters.dateRange?.end || null,
  });
  const [selectedCrimeTypes, setSelectedCrimeTypes] = useState(filters.crimeTypes || []);
  
  const controlsRef = useRef(null);
  
  const handleToggleControls = () => {
    setIsOpen(!isOpen);
  };
  
  const handleRadiusChange = (e) => {
    setSearchRadius(Number(e.target.value));
  };
  
  const handleCrimeTypeToggle = (type) => {
    if (selectedCrimeTypes.includes(type)) {
      setSelectedCrimeTypes(selectedCrimeTypes.filter(t => t !== type));
    } else {
      setSelectedCrimeTypes([...selectedCrimeTypes, type]);
    }
  };
  
  const handleApplyFilters = () => {
    onFilterChange({
      crimeTypes: selectedCrimeTypes,
      dateRange: {
        start: dateRange.startDate,
        end: dateRange.endDate,
      },
      searchRadius,
    });
  };
  
  const handleResetFilters = () => {
    setSearchRadius(5);
    setDateRange({ startDate: null, endDate: null });
    setSelectedCrimeTypes([]);
    
    onFilterChange({
      crimeTypes: [],
      dateRange: { start: null, end: null },
      searchRadius: 5,
    });
  };
  
  return (
    <div className="absolute top-4 left-4 z-[500]">
      <div className="bg-white rounded-lg shadow-lg">
        <button
          onClick={handleToggleControls}
          className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center hover:bg-blue-700 focus:outline-none"
          aria-label="Toggle map controls"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          )}
        </button>
        
        {isOpen && (
          <div ref={controlsRef} className="mt-2 p-4 bg-white rounded-lg shadow-lg w-72">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Map Controls</h3>
              
              {/* Location Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Location
                </label>
                <LocationSearch onLocationSelect={onLocationChange} />
              </div>
              
              {/* Search Radius */}
              <div>
                <label htmlFor="radius" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Radius: {searchRadius} km
                </label>
                <input
                  id="radius"
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={searchRadius}
                  onChange={handleRadiusChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <div className="flex items-center space-x-2">
                  <DatePicker
                    selected={dateRange.startDate}
                    onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                    selectsStart
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholderText="Start Date"
                  />
                  <span className="text-gray-500">to</span>
                  <DatePicker
                    selected={dateRange.endDate}
                    onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                    selectsEnd
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    minDate={dateRange.startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholderText="End Date"
                  />
                </div>
              </div>
              
              {/* Crime Types */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">
                  Crime Types
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {CRIME_TYPES.map((crime) => (
                    <div key={crime.value} className="flex items-center">
                      <input
                        id={`crime-${crime.value}`}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedCrimeTypes.includes(crime.value)}
                        onChange={() => handleCrimeTypeToggle(crime.value)}
                      />
                      <label htmlFor={`crime-${crime.value}`} className="ml-2 block text-sm text-gray-700">
                        {crime.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={handleApplyFilters}
                  className="w-full btn btn-primary"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="btn btn-secondary"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapControls;
