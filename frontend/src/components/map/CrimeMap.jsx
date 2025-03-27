import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCrimes } from '../../services/crimeService';
import ClusterMarker from './ClusterMarker';
import MapControls from './MapControls';
import Loader from '../common/Loader';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatDate, formatAddress } from '../../utils/formatters';

// Fix for marker icons in Leaflet with webpack
// This is needed because Leaflet expects the marker icons to be in the assets directory
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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

// Fix default icon
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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

// Map view controller component
const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  
  return null;
};

const CrimeMap = () => {
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    crimeTypes: [],
    dateRange: { start: null, end: null },
    searchRadius: 5, // km
  });
  
  const mapRef = useRef(null);
  const { position, error: geoError } = useGeolocation();
  
  // Initialize map center with user's location if available
  useEffect(() => {
    if (position && !mapCenter) {
      setMapCenter([position.latitude, position.longitude]);
    } else if (!mapCenter) {
      // Default center (example: New York City)
      setMapCenter([40.7128, -74.0060]);
    }
  }, [position, mapCenter]);
  
  // Fetch crime data
  useEffect(() => {
    const fetchCrimes = async () => {
      if (!mapCenter) return;
      
      try {
        setLoading(true);
        const params = {
          lat: mapCenter[0],
          lng: mapCenter[1],
          radius: selectedFilters.searchRadius,
        };
        
        if (selectedFilters.crimeTypes.length > 0) {
          params.crimeTypes = selectedFilters.crimeTypes.join(',');
        }
        
        if (selectedFilters.dateRange.start) {
          params.startDate = selectedFilters.dateRange.start.toISOString().split('T')[0];
        }
        
        if (selectedFilters.dateRange.end) {
          params.endDate = selectedFilters.dateRange.end.toISOString().split('T')[0];
        }
        
        const data = await getCrimes(params);

              // Add these debug logs
        console.log('Fetched crime data:', data);
        console.log('Type of data:', typeof data);
        console.log('Is array:', Array.isArray(data));
        console.log('Is empty:', data.length === 0);
        console.log('Is not empty:', data.length > 0);

        setCrimes(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching crime data:', err);
        setError('Failed to load crime data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCrimes();
  }, [mapCenter, selectedFilters]);
  
  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
  };
  
  const handleLocationChange = (location) => {
    setMapCenter([location.lat, location.lng]);
  };
  
  // If map center is not set yet, show loading
  if (!mapCenter) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }
  
  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="bottomright" />
        
        <MapViewController center={mapCenter} zoom={13} />
        
        {!loading && !error && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={(cluster) => {
              return ClusterMarker(cluster, crimes);
            }}
          >
            {Array.isArray((crime) => (
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
          </MarkerClusterGroup>
        )}
      </MapContainer>
      
      {/* Map Controls */}
      <MapControls
        onFilterChange={handleFilterChange}
        onLocationChange={handleLocationChange}
        filters={selectedFilters}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[400]">
          <Loader size="lg" />
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-[400]">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
    </div>
  );
};

export default CrimeMap;
