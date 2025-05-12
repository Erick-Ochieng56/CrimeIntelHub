import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCrimes, getCrimeSummaries, getExportedCrimeSummary } from '../../services/crimeService';
import ClusterMarker from './ClusterMarker';
import NeighborhoodSummaryMarker from './NeighborhoodSummaryMarker';
import MapControls from './MapControls';
import Loader from '../common/Loader';
import ErrorBoundary from '../common/ErrorBoundary';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatDate, formatAddress } from '../../utils/formatters';
import { toast } from 'react-toastify';

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
const MapViewController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
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
  const [crimes, setCrimes] = useState([]);
  const [filteredCrimes, setFilteredCrimes] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [filteredSummaries, setFilteredSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [viewMode, setViewMode] = useState('crimes'); // 'crimes', 'summaries', 'exported'
  const [selectedFilters, setSelectedFilters] = useState({
    crimeTypes: [],
    dateRange: { start: null, end: null },
    searchRadius: 5000000, // Increased to 5km
  });
  const [showStats, setShowStats] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const mapRef = useRef(null);
  const { position, error: geoError } = useGeolocation();

  // Initialize map center
  useEffect(() => {
    if (position && !mapCenter) {
      setMapCenter([position.latitude, position.longitude]);
    } else if (!mapCenter) {
      setMapCenter([-4.0435, 39.6682]); // Default to Mombasa
    }
  }, [position, mapCenter]);

  // Fetch individual crimes
  const fetchCrimes = useCallback(async () => {
    if (!mapCenter) return;
    try {
      setLoading(true);
      const params = {
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: selectedFilters.searchRadius / 1000, // Convert meters to km
        crimeTypes: selectedFilters.crimeTypes,
        startDate: selectedFilters.dateRange.start
          ? selectedFilters.dateRange.start.toISOString().split('T')[0]
          : undefined,
        endDate: selectedFilters.dateRange.end
          ? selectedFilters.dateRange.end.toISOString().split('T')[0]
          : undefined,
      };

      console.log('Fetching crimes with params:', params); // Debug log
      const response = await getCrimes(params);
      const validCrimes = response.filter(crime =>
        typeof crime.latitude === 'number' &&
        typeof crime.longitude === 'number' &&
        !isNaN(crime.latitude) &&
        !isNaN(crime.longitude)
      );
      console.log('Valid crimes fetched:', validCrimes); // Debug log
      setCrimes(validCrimes);
      setFilteredCrimes(validCrimes);
      setError(null);
    } catch (fetchError) {
      console.error('Error fetching crimes:', fetchError);
      toast.warning('Having trouble loading crime data. Retrying...');
      setTimeout(async () => {
        try {
          const retryResponse = await getCrimes(params);
          const validCrimes = retryResponse.filter(crime =>
            typeof crime.latitude === 'number' &&
            typeof crime.longitude === 'number' &&
            !isNaN(crime.latitude) &&
            !isNaN(crime.longitude)
          );
          setCrimes(validCrimes);
          setFilteredCrimes(validCrimes);
          setError(null);
        } catch (retryError) {
          setError('Failed to load crime data after multiple attempts.');
          toast.error('Could not load crime data.');
        } finally {
          setLoading(false);
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  }, [mapCenter, selectedFilters]);

  // Fetch neighborhood summaries
  const fetchSummaries = useCallback(async () => {
    if (!mapCenter) return;
    try {
      setLoading(true);
      const params = {
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: selectedFilters.searchRadius / 1000,
        start_date: selectedFilters.dateRange.start
          ? selectedFilters.dateRange.start.toISOString().split('T')[0]
          : undefined,
        end_date: selectedFilters.dateRange.end
          ? selectedFilters.dateRange.end.toISOString().split('T')[0]
          : undefined,
        crimeTypes: selectedFilters.crimeTypes,
        hierarchical: true,
      };

      console.log('Fetching summaries with params:', params); // Debug log
      const response = await getCrimeSummaries(params);
      const flatSummaries = response.districts.flatMap(district =>
        district.neighborhoods.map(neighborhood => ({
          neighborhood_id: neighborhood.crime_summary.neighborhood_id,
          neighborhood_name: neighborhood.crime_summary.neighborhood_name,
          district_name: neighborhood.crime_summary.district_name,
          total_count: neighborhood.crime_summary.total_count,
          violent_count: neighborhood.crime_summary.violent_count,
          centroid: neighborhood.crime_summary.centroid,
          categories: neighborhood.crime_summary.categories,
        }))
      );
      console.log('Flat summaries:', flatSummaries); // Debug log
      setSummaries(flatSummaries);
      setFilteredSummaries(flatSummaries);
      setError(null);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      setError('Failed to load neighborhood summaries.');
      toast.error('Could not load neighborhood summaries.');
    } finally {
      setLoading(false);
    }
  }, [mapCenter, selectedFilters]);

  // Fetch exported crime summary
  const fetchExportedSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getExportedCrimeSummary();
      console.log('Exported summary response:', response); // Debug log
      const flatSummaries = response.districts.flatMap(district =>
        district.neighborhoods.map(neighborhood => ({
          neighborhood_id: neighborhood.crime_summary.neighborhood_id,
          neighborhood_name: neighborhood.crime_summary.neighborhood_name,
          district_name: neighborhood.crime_summary.district_name,
          total_count: neighborhood.crime_summary.total_count,
          violent_count: neighborhood.crime_summary.violent_count,
          centroid: neighborhood.crime_summary.centroid,
          categories: neighborhood.crime_summary.categories,
        }))
      );
      console.log('Flat exported summaries:', flatSummaries); // Debug log
      setSummaries(flatSummaries);
      setFilteredSummaries(flatSummaries);
      setError(null);
    } catch (error) {
      console.error('Error fetching exported summary:', error);
      setError('Failed to load exported crime summary.');
      toast.error('Could not load exported crime summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data based on view mode
  useEffect(() => {
    if (viewMode === 'crimes') {
      fetchCrimes();
    } else if (viewMode === 'summaries') {
      fetchSummaries();
    } else if (viewMode === 'exported') {
      fetchExportedSummary();
    }
  }, [viewMode, fetchCrimes, fetchSummaries, fetchExportedSummary]);

  // Apply client-side filtering
  useEffect(() => {
    if (viewMode === 'crimes') {
      let filtered = [...crimes];
      if (selectedFilters.crimeTypes.length > 0) {
        filtered = filtered.filter(crime =>
          selectedFilters.crimeTypes.includes(crime.type)
        );
      }
      setFilteredCrimes(filtered);
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
      setFilteredSummaries(filtered);
    }
  }, [crimes, summaries, selectedFilters, viewMode]);

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
          <MapViewController center={mapCenter} zoom={13} />

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
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none"
            title="Toggle statistics panel"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
        </div>

        {/* Map Controls */}
        <MapControls
          onFilterChange={handleFilterChange}
          onLocationChange={handleLocationChange}
          filters={selectedFilters}
          onRefresh={() => {
            if (viewMode === 'crimes') fetchCrimes();
            else if (viewMode === 'summaries') fetchSummaries();
            else fetchExportedSummary();
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
            <span className="block sm:inline"> {error}</span>
            <button
              onClick={() => {
                if (viewMode === 'crimes') fetchCrimes();
                else if (viewMode === 'summaries') fetchSummaries();
                else fetchExportedSummary();
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