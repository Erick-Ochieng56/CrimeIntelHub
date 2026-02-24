import { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCrimes, getCrimeSummaries, getExportedCrimeSummary, getCurrentHotspots } from '../../services/crimeService';
import ClusterMarker from './ClusterMarker';
import NeighborhoodSummaryMarker from './NeighborhoodSummaryMarker';
import MapControls from './MapControls';
import Loader from '../common/Loader';
import ErrorBoundary from '../common/ErrorBoundary';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatDate, formatAddress } from '../../utils/formatters';
import { toast } from 'react-toastify';
import {
  useCrimes,
  useCrimeSummaries,
  useExportedCrimeSummary,
  useHotspots,
  usePrefetchCrimes
} from '../../hooks/useCrimeQueries';
import { useQueryClient } from '@tanstack/react-query';

// Fix for marker icons in Leaflet with webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Updated crime type colors to match backend categories
const CRIME_COLORS = {
  'HOMICIDE': '#FF0000',
  'OFFENSES': '#FF4500',
  'ROBBERY': '#FFA500',
  'OTHER_OFFENSES': '#FFD700',
  'BREAKINGS': '#ADFF2F',
  'THEFT_OF_STOLEN_GOODS': '#9ACD32',
  'STEALING': '#98FB98',
  'THEFT_BY_SERVANT': '#90EE90',
  'THEFT_OF_VEHICLE': '#00FF7F',
  'DANGEROUS_DRUGS': '#20B2AA',
  'TRAFFIC': '#87CEEB',
  'ECONOMIC': '#ADD8E6',
  'CRIMINAL_DAMAGE': '#B0C4DE',
  'CORRUPTION': '#DDA0DD',
  'OTHER_PENAL': '#D8BFD8',
  'UNITS': '#4299e1',
  'VIOLENT': '#4a5568',
  'OTHER': '#718096',
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

// Custom icon factory with memoization
const crimeIconCache = {};
const createCrimeIcon = (type) => {
  if (!type) return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #a0aec0; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  const cacheKey = type.toUpperCase();
  if (crimeIconCache[cacheKey]) {
    return crimeIconCache[cacheKey];
  }

  const color = CRIME_COLORS[cacheKey] || '#a0aec0';
  const icon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  crimeIconCache[cacheKey] = icon;
  return icon;
};

// Map view controller component
const MapViewController = ({ center, zoom, onBoundsReady }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
      // Set initial bounds after map is ready
      setTimeout(() => {
        const bounds = map.getBounds();
        if (onBoundsReady) {
          onBoundsReady(bounds);
        }
      }, 100);
    }
  }, [center, zoom, map, onBoundsReady]);
  return null;
};

// Map bounds handler component
const MapBoundsHandler = ({ onBoundsChange }) => {
  useMapEvents({
    moveend: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      console.log('Map moved, new bounds:', {
        northEast: bounds.getNorthEast(),
        southWest: bounds.getSouthWest()
      });
      onBoundsChange(bounds);
    },
    zoomend: (e) => {
      const map = e.target;
      const bounds = map.getBounds();
      console.log('Map zoomed, new bounds:', {
        northEast: bounds.getNorthEast(),
        southWest: bounds.getSouthWest()
      });
      onBoundsChange(bounds);
    },
  });
  return null;
};

// Crime statistics panel
const CrimeStatsPanel = ({ crimes, summaries, viewMode, loading }) => {
  if (viewMode === 'summaries' || viewMode === 'exported') {
    const totalCrimes = summaries.reduce((sum, s) => sum + s.total_count, 0);
    const violentCrimes = summaries.reduce((sum, s) => sum + s.violent_count, 0);
    const categoryCounts = summaries.reduce((acc, s) => {
      s.categories.forEach(cat => {
        acc[cat.name] = (acc[cat.name] || 0) + cat.count;
      });
      return acc;
    }, {});
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <div className="absolute bottom-4 right-4 bg-white p-4 shadow rounded z-[400] w-64">
        <h3 className="font-semibold text-gray-800 mb-2">Neighborhood Statistics</h3>
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader size="sm" />
          </div>
        ) : (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm">
                <span>Neighborhoods:</span>
                <span className="font-medium">{summaries.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total crimes:</span>
                <span className="font-medium">{totalCrimes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Violent crimes:</span>
                <span className="font-medium">{violentCrimes}</span>
              </div>
            </div>
            {topCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Top Crime Types:</h4>
                <ul className="text-xs">
                  {topCategories.map(([type, count]) => (
                    <li key={type} className="flex justify-between mb-1">
                      <span>{type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  const violentCount = crimes.filter(crime => crime.is_violent).length;
  const nonViolentCount = crimes.length - violentCount;
  const crimeTypeCount = crimes.reduce((acc, crime) => {
    const type = crime.type || 'OTHER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const topCrimeTypes = Object.entries(crimeTypeCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="absolute bottom-4 right-4 bg-white p-4 shadow rounded z-[400] w-64">
      <h3 className="font-semibold text-gray-800 mb-2">Crime Statistics</h3>
      {loading ? (
        <div className="flex justify-center py-2">
          <Loader size="sm" />
        </div>
      ) : (
        <>
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span>Total crimes:</span>
              <span className="font-medium">{crimes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Violent crimes:</span>
              <span className="font-medium">{violentCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Non-violent crimes:</span>
              <span className="font-medium">{nonViolentCount}</span>
            </div>
          </div>
          {topCrimeTypes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">Top Crime Types:</h4>
              <ul className="text-xs">
                {topCrimeTypes.map(([type, count]) => (
                  <li key={type} className="flex justify-between mb-1">
                    <span>{type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Crime legend component
const CrimeLegend = ({ isVisible, onToggle }) => {
  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="absolute left-4 bottom-4 bg-white p-2 rounded shadow z-[400] flex items-center"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="ml-1 text-sm">Show Legend</span>
      </button>
    );
  }

  const legendItems = Object.entries(CRIME_COLORS)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, color]) => ({
      type: key,
      label: key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' '),
      color
    }));

  return (
    <div className="absolute left-4 bottom-4 bg-white p-3 shadow rounded z-[400] max-h-64 overflow-y-auto w-64">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-700 text-sm">Crime Type Legend</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {legendItems.map(item => (
          <div key={item.type} className="flex items-center text-xs">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            ></div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CrimeMap = () => {
  // UI state
  const [showStats, setShowStats] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);
  const [viewMode, setViewMode] = useState('crimes'); // 'crimes', 'summaries', 'exported'
  const [selectedFilters, setSelectedFilters] = useState({
    crimeTypes: [],
    dateRange: { start: null, end: null },
    searchRadius: 5000, // Default to 5km
  });

  const mapRef = useRef(null);
  const { position, error: geoError } = useGeolocation();

  // Memoize query parameters to prevent unnecessary re-renders
  const crimesQueryParams = useMemo(() => {
    if (!mapBounds) return null;

    return {
      northEastLat: mapBounds.getNorthEast().lat,
      northEastLng: mapBounds.getNorthEast().lng,
      southWestLat: mapBounds.getSouthWest().lat,
      southWestLng: mapBounds.getSouthWest().lng,
      crimeTypes: selectedFilters.crimeTypes,
      startDate: selectedFilters.dateRange.start
        ? selectedFilters.dateRange.start.toISOString().split('T')[0]
        : undefined,
      endDate: selectedFilters.dateRange.end
        ? selectedFilters.dateRange.end.toISOString().split('T')[0]
        : undefined,
    };
  }, [mapBounds, selectedFilters.crimeTypes, selectedFilters.dateRange.start, selectedFilters.dateRange.end]);

  // React Query hooks for data fetching
  const crimesQuery = useCrimes(crimesQueryParams, {
    enabled: !!crimesQueryParams, // Only fetch when parameters are available
  });

  const summariesQuery = useCrimeSummaries();
  const exportedQuery = useExportedCrimeSummary();
  const hotspotsQuery = useHotspots();
  const { prefetchCrimes } = usePrefetchCrimes();
  const queryClient = useQueryClient();

  // Extract data from queries
  const crimes = crimesQuery.data?.results || [];
  const summaries = summariesQuery.data?.results || [];
  const exportedSummary = exportedQuery.data?.results || [];
  const hotspots = hotspotsQuery.data || [];
  const loading = crimesQuery.isLoading || summariesQuery.isLoading || exportedQuery.isLoading || hotspotsQuery.isLoading;
  const error = crimesQuery.error || summariesQuery.error || exportedQuery.error || hotspotsQuery.error;

  // Initialize map center
  useEffect(() => {
    if (position && !mapCenter) {
      setMapCenter([position.latitude, position.longitude]);
      // Initialize bounds around user's location
      if (mapRef.current) {
        const map = mapRef.current;
        const bounds = map.getBounds();
        setMapBounds(bounds);
      }
    } else if (!mapCenter) {
      setMapCenter([-4.0435, 39.6682]); // Default to Mombasa
      // Initialize bounds around default location
      if (mapRef.current) {
        const map = mapRef.current;
        const bounds = map.getBounds();
        setMapBounds(bounds);
      }
    }
  }, [position, mapCenter]);

  // Fetch individual crimes




  // Apply client-side filtering using useMemo
  const filteredData = useMemo(() => {
    if (viewMode === 'crimes') {
      let filtered = [...crimes];
      if (selectedFilters.crimeTypes.length > 0) {
        filtered = filtered.filter(crime =>
          selectedFilters.crimeTypes.includes(crime.type)
        );
      }
      return { crimes: filtered, summaries: [] };
    } else {
      let filtered = [...summaries];
      if (selectedFilters.crimeTypes.length > 0) {
        filtered = filtered.map(summary => {
          const filteredCategories = summary.categories.filter(cat =>
            selectedFilters.crimeTypes.includes(cat.name.toUpperCase())
          );
          const total_count = filteredCategories.reduce((sum, cat) => sum + cat.count, 0);
          const violent_count = filteredCategories.reduce((sum, cat) =>
            CRIME_COLORS[cat.name.toUpperCase()] === CRIME_COLORS.VIOLENT ? sum + cat.count : sum, 0);
          return { ...summary, categories: filteredCategories, total_count, violent_count };
        }).filter(summary => summary.total_count > 0);
      }
      return { crimes: [], summaries: filtered };
    }
  }, [crimes, summaries, selectedFilters.crimeTypes, viewMode]);

  const filteredCrimes = filteredData.crimes;
  const filteredSummaries = filteredData.summaries;

  const handleFilterChange = (filters) => {
    setSelectedFilters(filters);
  };

  const handleLocationChange = (location) => {
    setMapCenter([location.lat, location.lng]);
  };

  const toggleStatsPanel = () => {
    setShowStats(!showStats);
  };

  const toggleLegend = () => {
    setShowLegend(!showLegend);
  };

  const cycleViewMode = () => {
    if (viewMode === 'crimes') {
      setViewMode('summaries');
    } else if (viewMode === 'summaries') {
      setViewMode('exported');
    } else {
      setViewMode('crimes');
    }
  };

  if (!mapCenter) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-700">Error loading the map. Please refresh.</div>}>
      <div className="h-full w-full relative">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          ref={mapRef}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          <MapViewController
            center={mapCenter}
            zoom={13}
            onBoundsReady={(bounds) => {
              if (!mapBounds) {
                setMapBounds(bounds);
              }
            }}
          />
          <MapBoundsHandler onBoundsChange={setMapBounds} />

          {viewMode === 'crimes' && !loading && !error && filteredCrimes.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              iconCreateFunction={(cluster) => ClusterMarker(cluster, filteredCrimes)}
            >
              {filteredCrimes.map((crime) => (
                <Marker
                  key={crime.id}
                  position={[crime.latitude, crime.longitude]}
                  icon={createCrimeIcon(crime.type)}
                >
                  <Popup maxWidth={300} className="crime-popup">
                    <div className="text-sm">
                      <h3 className="font-semibold text-gray-900">{crime.type}</h3>
                      <p className="text-gray-600">{formatAddress(crime.block_address)}</p>
                      <p className="text-gray-500">{formatDate(crime.date)}</p>
                      {crime.description && (
                        <p className="mt-1 text-gray-700">{crime.description}</p>
                      )}
                      {crime.is_violent && (
                        <span className="inline-block mt-1 bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          Violent Crime
                        </span>
                      )}
                      {crime.property_loss && (
                        <div className="mt-1 text-xs">
                          <span className="text-gray-500">Property Loss:</span>
                          <span className="ml-1 font-medium">${parseFloat(crime.property_loss).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}

          {(viewMode === 'summaries' || viewMode === 'exported') && !loading && !error && filteredSummaries.length > 0 && (
            <>
              {filteredSummaries.map((summary) => (
                <NeighborhoodSummaryMarker key={summary.neighborhood_id} summary={summary} />
              ))}
            </>
          )}

          {showHotspots && Array.isArray(hotspots) && hotspots.length > 0 && hotspots.map((hotspot, index) => (
            <Marker
              key={`hotspot-${index}`}
              position={[hotspot.lat, hotspot.lng]}
              icon={L.divIcon({
                className: 'hotspot-marker',
                html: `<div style="background-color: rgba(255, 0, 0, 0.4); width: ${hotspot.intensity * 20}px; height: ${hotspot.intensity * 20}px; border-radius: 50%; border: 2px solid red;"></div>`,
                iconSize: [hotspot.intensity * 20, hotspot.intensity * 20],
                iconAnchor: [hotspot.intensity * 10, hotspot.intensity * 10],
              })}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-red-600">Active Hotspot</h3>
                  <p>Intensity: {hotspot.intensity.toFixed(2)}</p>
                  <p>Crimes in area: {hotspot.count}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* View Mode Toggle */}
        <div className="absolute top-4 right-4 bg-white px-3 py-2 shadow rounded z-[400] flex items-center">
          <span className="text-sm font-medium mr-2">
            {loading ? 'Loading...' : viewMode === 'crimes' ? `Showing ${filteredCrimes.length} crimes` : `Showing ${filteredSummaries.length} neighborhoods`}
          </span>
          <button
            onClick={cycleViewMode}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none mr-2"
            title="Cycle view mode"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button
            onClick={toggleStatsPanel}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none mr-2"
            title="Toggle statistics panel"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`p-1 rounded focus:outline-none ${showHotspots ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}
            title="Toggle hotspots"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Map Controls */}
        <MapControls
          onFilterChange={handleFilterChange}
          onLocationChange={handleLocationChange}
          filters={selectedFilters}
          onRefresh={() => {
            // Invalidate and refetch queries based on view mode
            if (viewMode === 'crimes') {
              queryClient.invalidateQueries({ queryKey: ['crimes'] });
            } else if (viewMode === 'summaries') {
              queryClient.invalidateQueries({ queryKey: ['crime-summaries'] });
            } else if (viewMode === 'exported') {
              queryClient.invalidateQueries({ queryKey: ['exported-summary'] });
            }
            queryClient.invalidateQueries({ queryKey: ['hotspots'] });
          }}
        />

        {/* Stats Panel */}
        {showStats && (
          <CrimeStatsPanel
            crimes={filteredCrimes}
            summaries={filteredSummaries}
            viewMode={viewMode}
            loading={loading}
          />
        )}

        {/* Legend */}
        <CrimeLegend isVisible={showLegend} onToggle={toggleLegend} />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[400]">
            <div className="flex flex-col items-center">
              <Loader size="lg" />
              <span className="mt-2 text-gray-700">Loading {viewMode === 'crimes' ? 'crime data' : viewMode === 'summaries' ? 'neighborhood summaries' : 'exported summary'}...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-[400] max-w-md">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error?.message || error?.toString() || 'An error occurred'}</span>
            <button
              onClick={() => {
                // Invalidate and refetch queries based on view mode
                if (viewMode === 'crimes') {
                  queryClient.invalidateQueries({ queryKey: ['crimes'] });
                } else if (viewMode === 'summaries') {
                  queryClient.invalidateQueries({ queryKey: ['crime-summaries'] });
                } else if (viewMode === 'exported') {
                  queryClient.invalidateQueries({ queryKey: ['exported-summary'] });
                }
              }}
              className="mt-2 bg-red-700 text-white px-2 py-1 rounded text-sm hover:bg-red-800 focus:outline-none"
            >
              Retry
            </button>
          </div>
        )}

        {/* No results message */}
        {!loading && !error && (viewMode === 'crimes' ? filteredCrimes.length === 0 : filteredSummaries.length === 0) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-[400] max-w-md">
            <span>No {viewMode === 'crimes' ? 'crimes' : 'neighborhood summaries'} found in this area with the current filters.</span>
            <div className="mt-2 text-sm">
              Try:
              <ul className="list-disc ml-5 mt-1">
                <li>Increasing the search radius</li>
                <li>Selecting different crime types</li>
                <li>Expanding the date range</li>
                <li>Searching in a different location</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CrimeMap;