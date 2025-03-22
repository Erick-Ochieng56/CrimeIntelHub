import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../../hooks/useGeolocation';
import { createAlert, updateAlert } from '../../services/alertService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { MapContainer, TileLayer, Circle, useMapEvents, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { searchLocation } from '../../services/mapService';

// Icon for the marker
const markerIcon = L.icon({
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

  return position ? <Marker position={position} icon={markerIcon} /> : null;
};

const AlertForm = ({ existingAlert = null }) => {
  const [alert, setAlert] = useState({
    name: '',
    crimeTypes: [],
    latitude: null,
    longitude: null,
    radius: 1,
    address: '',
    description: '',
    isActive: true
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default: NYC
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const navigate = useNavigate();
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
  
  // If we have an existing alert, populate the form
  useEffect(() => {
    if (existingAlert) {
      setAlert({
        name: existingAlert.name || '',
        crimeTypes: existingAlert.crimeTypes || [],
        latitude: existingAlert.latitude || null,
        longitude: existingAlert.longitude || null,
        radius: existingAlert.radius || 1,
        address: existingAlert.address || '',
        description: existingAlert.description || '',
        isActive: existingAlert.isActive !== undefined ? existingAlert.isActive : true
      });
      
      if (existingAlert.latitude && existingAlert.longitude) {
        setPosition([existingAlert.latitude, existingAlert.longitude]);
        setMapCenter([existingAlert.latitude, existingAlert.longitude]);
      }
    }
  }, [existingAlert]);
  
  // If user position is available and we don't have a position set, use the user's position
  useEffect(() => {
    if (userPosition && !position) {
      setMapCenter([userPosition.latitude, userPosition.longitude]);
    }
  }, [userPosition, position]);
  
  // Update alert with position changes
  useEffect(() => {
    if (position) {
      setAlert({
        ...alert,
        latitude: position[0],
        longitude: position[1]
      });
    }
  }, [position]);
  
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
    setAlert({
      ...alert,
      latitude: lat,
      longitude: lon,
      address: result.display_name
    });
    
    setSearchQuery(result.display_name);
    setShowResults(false);
  };
  
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!alert.name.trim()) {
      setError('Alert name is required');
      return;
    }
    
    if (alert.crimeTypes.length === 0) {
      setError('Please select at least one crime type');
      return;
    }
    
    if (!alert.latitude || !alert.longitude) {
      setError('Please select a location on the map');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      if (existingAlert) {
        await updateAlert(existingAlert.id, alert);
        setSuccess('Alert updated successfully');
      } else {
        await createAlert(alert);
        setSuccess('Alert created successfully');
        // Reset form after successful creation
        setAlert({
          name: '',
          crimeTypes: [],
          latitude: null,
          longitude: null,
          radius: 1,
          address: '',
          description: '',
          isActive: true
        });
        setPosition(null);
      }
      
      // Navigate back to alerts list after a delay
      setTimeout(() => {
        navigate('/alerts');
      }, 2000);
    } catch (err) {
      console.error('Error saving alert:', err);
      setError(err.message || 'Failed to save alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle crime type toggle
  const handleCrimeTypeToggle = (type) => {
    if (alert.crimeTypes.includes(type)) {
      setAlert({
        ...alert,
        crimeTypes: alert.crimeTypes.filter(t => t !== type)
      });
    } else {
      setAlert({
        ...alert,
        crimeTypes: [...alert.crimeTypes, type]
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {existingAlert ? 'Edit Alert' : 'Create New Alert'}
          </h2>
          
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
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="alert-name" className="block text-sm font-medium text-gray-700">
                  Alert Name *
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="alert-name"
                    value={alert.name}
                    onChange={(e) => setAlert({ ...alert, name: e.target.value })}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g., Neighborhood Theft Alert"
                    required
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="alert-description" className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <div className="mt-1">
                  <textarea
                    id="alert-description"
                    value={alert.description}
                    onChange={(e) => setAlert({ ...alert, description: e.target.value })}
                    rows={3}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add any additional information about this alert"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="block text-sm font-medium text-gray-700">
                    Crime Types *
                  </legend>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    {crimeTypes.map((type) => (
                      <div key={type.value} className="flex items-center">
                        <input
                          id={`crime-type-${type.value}`}
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={alert.crimeTypes.includes(type.value)}
                          onChange={() => handleCrimeTypeToggle(type.value)}
                        />
                        <label htmlFor={`crime-type-${type.value}`} className="ml-2 block text-sm text-gray-700">
                          {type.label}
                        </label>
                      </div>
                    ))}
                  </div>
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
                  {alert.address ? (
                    <p>Selected address: {alert.address}</p>
                  ) : position ? (
                    <p>Selected coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}</p>
                  ) : (
                    <p>Click on the map to select a location or search for an address</p>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="alert-radius" className="block text-sm font-medium text-gray-700">
                  Alert Radius: {alert.radius} km
                </label>
                <div className="mt-1">
                  <input
                    type="range"
                    id="alert-radius"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={alert.radius}
                    onChange={(e) => setAlert({ ...alert, radius: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  You will receive alerts for crimes within this radius from the selected location.
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
                    
                    {position && alert.radius && (
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
                        radius={alert.radius * 1000} // Convert km to meters
                      />
                    )}
                  </MapContainer>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Click on the map to select a location or use the search box above.
                </p>
              </div>
              
              {existingAlert && (
                <div className="sm:col-span-3">
                  <div className="flex items-center">
                    <input
                      id="is-active"
                      type="checkbox"
                      checked={alert.isActive}
                      onChange={(e) => setAlert({ ...alert, isActive: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is-active" className="ml-2 block text-sm text-gray-700">
                      Alert Active
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Uncheck to temporarily disable this alert without deleting it.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/alerts')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader size="sm" className="mr-2" />
                    Saving...
                  </span>
                ) : existingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AlertForm;
