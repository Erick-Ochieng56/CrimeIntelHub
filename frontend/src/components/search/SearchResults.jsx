import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDate, formatAddress, formatDistance } from '../../utils/formatters';

// Fix for marker icons in Leaflet with webpack
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Define crime type colors
const CRIME_COLORS = {
  'THEFT': '#e53e3e',        // Red
  'ASSAULT': '#dd6b20',      // Orange
  'BURGLARY': '#d69e2e',     // Yellow
  'ROBBERY': '#805ad5',      // Purple
  'VANDALISM': '#3182ce',    // Blue
  'DRUG': '#38a169',         // Green
  'FRAUD': '#6b46c1',        // Indigo
  'OTHER': '#718096',        // Gray
};

// Custom icon factory
const createCrimeIcon = (type) => {
  const color = CRIME_COLORS[type] || CRIME_COLORS.OTHER;
  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const SearchResults = ({ results, total, currentPage, limit, onPageChange, searchLocation }) => {
  const totalPages = Math.ceil(total / limit);
  
  // Generate pagination range
  const getPaginationRange = () => {
    const delta = 2; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];
    let l;
    
    range.push(1);
    
    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i > 1 && i < totalPages) {
        range.push(i);
      }
    }
    
    if (totalPages > 1) {
      range.push(totalPages);
    }
    
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    
    return rangeWithDots;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Search Results</h2>
            <div className="text-sm text-gray-500">
              {total > 0 ? (
                <span>
                  Showing {(currentPage - 1) * limit + 1}-{Math.min(currentPage * limit, total)} of {total} results
                </span>
              ) : (
                <span>No results found</span>
              )}
            </div>
          </div>
          
          {searchLocation.latitude && searchLocation.longitude && (
            <div className="mb-6 h-60 rounded-lg overflow-hidden border border-gray-200">
              <MapContainer
                center={[searchLocation.latitude, searchLocation.longitude]}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Search area circle */}
                <Circle
                  center={[searchLocation.latitude, searchLocation.longitude]}
                  pathOptions={{
                    fillColor: 'blue',
                    fillOpacity: 0.1,
                    weight: 2,
                    color: 'blue',
                    dashArray: '5, 5',
                    opacity: 0.7,
                  }}
                  radius={searchLocation.radius * 1000} // Convert km to meters
                />
                
                {/* Marker for search center */}
                <Marker
                  position={[searchLocation.latitude, searchLocation.longitude]}
                  icon={defaultIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <h3 className="font-semibold text-gray-900">Search Center</h3>
                      <p className="text-gray-600">{formatDistance(searchLocation.radius)} radius</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Crime markers */}
                {results.map((crime) => (
                  <Marker
                    key={crime.id}
                    position={[crime.latitude, crime.longitude]}
                    icon={createCrimeIcon(crime.type)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <h3 className="font-semibold text-gray-900">{crime.type}</h3>
                        <p className="text-gray-600">{formatAddress(crime.block_address)}</p>
                        <p className="text-gray-500">{formatDate(crime.date)}</p>
                        {crime.description && (
                          <p className="mt-1 text-gray-700">{crime.description}</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
          
          {results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crime Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((crime) => (
                    <tr key={crime.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(crime.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full"
                          style={{
                            backgroundColor: `${CRIME_COLORS[crime.type] || CRIME_COLORS.OTHER}20`,
                            color: CRIME_COLORS[crime.type] || CRIME_COLORS.OTHER
                          }}
                        >
                          {crime.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatAddress(crime.block_address)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          crime.status === 'OPEN' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : crime.status === 'UNDER_INVESTIGATION' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {crime.status === 'OPEN' 
                            ? 'Open' 
                            : crime.status === 'UNDER_INVESTIGATION' 
                            ? 'Under Investigation' 
                            : 'Closed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/map?lat=${crime.latitude}&lng=${crime.longitude}&id=${crime.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View on Map
                        </Link>
                        <Link
                          to={`/reports/generate?crimeId=${crime.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Generate Report
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search filters or search for a different location.
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                    currentPage === 1 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                    currentPage === totalPages 
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{Math.min((currentPage - 1) * limit + 1, total)}</span> to <span className="font-medium">{Math.min(currentPage * limit, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center rounded-l-md px-2 py-2 ${
                        currentPage === 1 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {getPaginationRange().map((page, index) => (
                      page === '...' ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => onPageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                            page === currentPage
                              ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                    
                    <button
                      onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center rounded-r-md px-2 py-2 ${
                        currentPage === totalPages 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SearchResults;
