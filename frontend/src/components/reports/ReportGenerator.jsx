import React, { useState } from 'react';
import { generateReport } from '../../services/reportService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useGeolocation } from '../../hooks/useGeolocation';
import { MapContainer, TileLayer, Circle, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { searchLocation } from '../../services/mapService';

// Default icon for markers
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map click events
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} icon={defaultIcon} /> : null;
};

const ReportGenerator = () => {
  const [reportParams, setReportParams] = useState({
    title: '',
    description: '',
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
    crimeTypes: [],
    latitude: null,
    longitude: null,
    radius: 5,
    includeCharts: true,
    includeMap: true,
    format: 'pdf'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default: NYC
  const [generatedReport, setGeneratedReport] = useState(null);
  
  const { position: userPosition } = useGeolocation();
  
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
  
  const reportFormats = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'csv', label: 'CSV File' },
    { value: 'json', label: 'JSON Data' },
  ];
  
  // If user position is available and we don't have a position set, use the user's position
  React.useEffect(() => {
    if (userPosition && !position) {
      setMapCenter([userPosition.latitude, userPosition.longitude]);
    }
  }, [userPosition, position]);
  
  // Update reportParams with position changes
  React.useEffect(() => {
    if (position) {
      setReportParams({
        ...reportParams,
        latitude: position[0],
        longitude: position[1]
      });
    }
  }, [position]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setReportParams({
      ...reportParams,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleCrimeTypeToggle = (type) => {
    if (reportParams.crimeTypes.includes(type)) {
      setReportParams({
        ...reportParams,
        crimeTypes: reportParams.crimeTypes.filter(t => t !== type)
      });
    } else {
      setReportParams({
        ...reportParams,
        crimeTypes: [...reportParams.crimeTypes, type]
      });
    }
  };
  
  // Handle search for locations
  const handleSearch = async () => {
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
      handleSearch();
    }
  };
  
  // Handle location selection from search results
  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    
    setPosition([lat, lon]);
    setMapCenter([lat, lon]);
    setReportParams({
      ...reportParams,
      latitude: lat,
      longitude: lon,
      address: result.display_name
    });
    
    setSearchQuery(result.display_name);
    setShowResults(false);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!reportParams.title.trim()) {
      setError('Report title is required');
      return;
    }
    
    if (!reportParams.latitude || !reportParams.longitude) {
      setError('Please select a location on the map');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setGeneratedReport(null);
      
      const result = await generateReport(reportParams);
      setGeneratedReport(result);
      setSuccess('Report generated successfully');
      
      // Additional actions like download would be here
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedReport?.downloadUrl) return;
    
    // Create a link element and trigger download
    const link = document.createElement('a');
    link.href = generatedReport.downloadUrl;
    link.download = generatedReport.filename || `crime_report_${new Date().toISOString().split('T')[0]}.${reportParams.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Crime Report</h2>
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
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
          
          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="report-title" className="block text-sm font-medium text-gray-700">
                  Report Title *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="report-title"
                    name="title"
                    value={reportParams.title}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g., Crime Analysis Report - Downtown Area"
                    required
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="report-description" className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="report-description"
                    name="description"
                    value={reportParams.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add any additional information or context for this report"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <div className="mt-1">
                  <DatePicker
                    selected={reportParams.startDate}
                    onChange={(date) => setReportParams({ ...reportParams, startDate: date })}
                    selectsStart
                    startDate={reportParams.startDate}
                    endDate={reportParams.endDate}
                    maxDate={new Date()}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <div className="mt-1">
                  <DatePicker
                    selected={reportParams.endDate}
                    onChange={(date) => setReportParams({ ...reportParams, endDate: date })}
                    selectsEnd
                    startDate={reportParams.startDate}
                    endDate={reportParams.endDate}
                    minDate={reportParams.startDate}
                    maxDate={new Date()}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700">
                    Crime Types (Optional)
                  </legend>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    {crimeTypes.map((type) => (
                      <div key={type.value} className="flex items-center">
                        <input
                          id={`crime-type-${type.value}`}
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={reportParams.crimeTypes.includes(type.value)}
                          onChange={() => handleCrimeTypeToggle(type.value)}
                        />
                        <label htmlFor={`crime-type-${type.value}`} className="ml-2 block text-sm text-gray-700">
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Leave all unchecked to include all crime types
                  </p>
                </fieldset>
              </div>
              
              <div className="sm:col-span-6">
                <div>
                  <label htmlFor="location-search" className="block text-sm font-medium text-gray-700">
                    Search Location
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      id="location-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Enter an address or location"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="absolute inset-y-0 right-0 px-3 py-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                  
                  {showResults && (
                    <div className="absolute z-10 mt-1 bg-white shadow-lg rounded-md overflow-auto max-h-60 w-full">
                      {isSearching ? (
                        <div className="p-4 text-center">
                          <Loader size="sm" />
                          <p className="mt-2 text-sm text-gray-500">Searching...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                          {searchResults.map((result) => (
                            <li key={result.place_id}>
                              <button
                                type="button"
                                className="w-full text-left p-4 hover:bg-gray-50 transition duration-150 text-sm"
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-sm text-gray-500">
                  {reportParams.address ? (
                    <p>Selected address: {reportParams.address}</p>
                  ) : position ? (
                    <p>Selected coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
                  ) : (
                    <p>Click on the map to select a location or search for an address</p>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="report-radius" className="block text-sm font-medium text-gray-700">
                  Report Radius: {reportParams.radius} km
                </label>
                <div className="mt-1">
                  <input
                    type="range"
                    id="report-radius"
                    name="radius"
                    min="1"
                    max="50"
                    step="1"
                    value={reportParams.radius}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  The report will include crimes within this radius from the selected location.
                </p>
              </div>
              
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Map Location *
                </label>
                <div className="mt-1 h-96 rounded-md overflow-hidden border border-gray-300">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                    
                    {position && reportParams.radius && (
                      <Circle
                        center={position}
                        pathOptions={{
                          fillColor: 'blue',
                          fillOpacity: 0.2,
                          weight: 2,
                          color: 'blue',
                          dashArray: '5, 5',
                          opacity: 0.7,
                        }}
                        radius={reportParams.radius * 1000} // Convert km to meters
                      />
                    )}
                  </MapContainer>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Click on the map to select a location or use the search box above.
                </p>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="report-format" className="block text-sm font-medium text-gray-700">
                  Report Format
                </label>
                <div className="mt-1">
                  <select
                    id="report-format"
                    name="format"
                    value={reportParams.format}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    {reportFormats.map(format => (
                      <option key={format.value} value={format.value}>{format.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <fieldset className="space-y-2">
                  <legend className="block text-sm font-medium text-gray-700">
                    Report Options
                  </legend>
                  <div className="flex items-center">
                    <input
                      id="include-charts"
                      name="includeCharts"
                      type="checkbox"
                      checked={reportParams.includeCharts}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="include-charts" className="ml-2 block text-sm text-gray-700">
                      Include charts and graphs
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="include-map"
                      name="includeMap"
                      type="checkbox"
                      checked={reportParams.includeMap}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="include-map" className="ml-2 block text-sm text-gray-700">
                      Include map visualization
                    </label>
                  </div>
                </fieldset>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setReportParams({
                    title: '',
                    description: '',
                    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
                    endDate: new Date(),
                    crimeTypes: [],
                    latitude: null,
                    longitude: null,
                    radius: 5,
                    includeCharts: true,
                    includeMap: true,
                    format: 'pdf'
                  });
                  setPosition(null);
                  setSearchQuery('');
                  setGeneratedReport(null);
                }}
                className="btn btn-secondary"
              >
                Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader size="sm" className="mr-2" />
                    Generating...
                  </span>
                ) : 'Generate Report'}
              </button>
            </div>
          </form>
        </div>
      </Card>
      
      {generatedReport && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Report</h3>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-base font-medium text-gray-900">{generatedReport.title}</h4>
                  <p className="mt-1 text-sm text-gray-500">{generatedReport.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {reportParams.format.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {generatedReport.totalCrimes} crimes
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {reportParams.radius}km radius
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary flex items-center"
                >
                  <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
              
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Report Preview</h5>
                {reportParams.format === 'pdf' ? (
                  <div className="aspect-[8.5/11] bg-white border border-gray-300 rounded-md flex items-center justify-center">
                    <p className="text-gray-400">PDF preview not available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crime Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {/* Report data would be rendered here - showing placeholder message */}
                        <tr>
                          <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                            Preview available on download
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportGenerator;
