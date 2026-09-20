import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import ClusterMarker from './ClusterMarker';
import NeighborhoodSummaryMarker from './NeighborhoodSummaryMarker';
import CountyChoropleth from './CountyChoropleth';
import MapLegend from './MapLegend';
import MapControls from './MapControls';
import LocationSearch from './LocationSearch';
import BasemapLayers from './BasemapLayers';
import BasemapToggle from './BasemapToggle';
import DirectionsPanel from './DirectionsPanel';
import RouteLayer from './RouteLayer';
import Loader from '../common/Loader';
import ErrorBoundary from '../common/ErrorBoundary';
import { useGeolocation } from '../../hooks/useGeolocation';
import { formatDate, formatAddress } from '../../utils/formatters';
import {
  useCrimeSummaries,
  useExportedCrimeSummary,
  useHotspots,
  useMapViewport,
} from '../../hooks/useCrimeQueries';
import { useQueryClient } from '@tanstack/react-query';
import { boundsToTileParams, getMapTier } from '../../utils/mapTiles';
import { clusterRadiusMeters, colorForCount } from '../../utils/mapScale';
import { getDrivingRoute } from '../../services/mapService';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const CRIME_COLORS = {
  HOMICIDE: '#FF0000',
  OFFENSES: '#FF4500',
  ROBBERY: '#FFA500',
  OTHER_OFFENSES: '#FFD700',
  BREAKINGS: '#ADFF2F',
  THEFT_OF_STOLEN_GOODS: '#9ACD32',
  STEALING: '#98FB98',
  THEFT_BY_SERVANT: '#90EE90',
  THEFT_OF_VEHICLE: '#00FF7F',
  DANGEROUS_DRUGS: '#20B2AA',
  TRAFFIC: '#87CEEB',
  ECONOMIC: '#ADD8E6',
  CRIMINAL_DAMAGE: '#B0C4DE',
  CORRUPTION: '#DDA0DD',
  OTHER_PENAL: '#D8BFD8',
  UNITS: '#4299e1',
  VIOLENT: '#4a5568',
  OTHER: '#718096',
};

const KENYA_CENTER = [-0.0236, 37.9062];
const KENYA_ZOOM = 6;
const USER_ZOOM = 14;
const PLACE_ZOOM = 15;
const SESSION_KEY = 'crimeMap.view';
const BASEMAP_KEY = 'crimeMap.basemap';

const readBasemap = () => {
  try {
    const v = localStorage.getItem(BASEMAP_KEY);
    if (v === 'streets' || v === 'satellite' || v === 'hybrid') return v;
  } catch {
    /* ignore */
  }
  return 'streets';
};

const saveBasemap = (mode) => {
  try {
    localStorage.setItem(BASEMAP_KEY, mode);
  } catch {
    /* ignore */
  }
};

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const userLocationIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="
    width: 18px; height: 18px; border-radius: 50%;
    background: #4285F4; border: 3px solid white;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const placePinIcon = L.divIcon({
  className: 'place-pin-icon',
  html: `<div style="
    width: 28px; height: 28px; border-radius: 50% 50% 50% 0;
    background: #EA4335; transform: rotate(-45deg);
    border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const crimeIconCache = {};
const createCrimeIcon = (type) => {
  if (!type) {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: #a0aec0; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }

  const cacheKey = type.toUpperCase();
  if (crimeIconCache[cacheKey]) return crimeIconCache[cacheKey];

  const color = CRIME_COLORS[cacheKey] || '#a0aec0';
  const nextIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
  crimeIconCache[cacheKey] = nextIcon;
  return nextIcon;
};

const readSessionView = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed?.center) &&
      parsed.center.length === 2 &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const saveSessionView = (center, zoom) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ center, zoom }));
  } catch {
    /* ignore */
  }
};

/** Quantize bounds so tiny pans / flyTo frames do not thrash React Query. */
const boundsKey = (bounds, zoom = 12) => {
  if (!bounds) return '';
  const tile = boundsToTileParams(bounds, zoom);
  return `${tile.tier}|${tile.zoom}|${tile.northEastLat},${tile.northEastLng},${tile.southWestLat},${tile.southWestLng}`;
};

/** Density heatmap for far/mid zoom (leaflet.heat). */
const DensityHeatLayer = ({ points }) => {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!map) return undefined;
    heatRef.current = L.heatLayer([], {
      radius: 28,
      blur: 18,
      maxZoom: 14,
      max: 1.0,
      gradient: {
        0.0: '#22c55e',
        0.4: '#3b82f6',
        0.65: '#eab308',
        0.85: '#f97316',
        1.0: '#ef4444',
      },
    }).addTo(map);

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (!heatRef.current) return;
    heatRef.current.setLatLngs(points?.length ? points : []);
  }, [points]);

  return null;
};

/** One-shot flyTo / fitBounds — does not re-run on every pan. */
const MapNavigator = ({ navigation, onNavigatingChange, onDone }) => {
  const map = useMap();
  const lastIdRef = useRef(null);

  useEffect(() => {
    if (!navigation || navigation.id === lastIdRef.current) return;
    lastIdRef.current = navigation.id;

    onNavigatingChange?.(true);

    if (navigation.bounds) {
      map.fitBounds(navigation.bounds, {
        padding: [48, 48],
        maxZoom: navigation.maxZoom ?? 16,
        animate: true,
      });
    } else if (navigation.center) {
      map.flyTo(navigation.center, navigation.zoom ?? PLACE_ZOOM, { duration: 0.85 });
    }

    const t = setTimeout(() => {
      onNavigatingChange?.(false);
      onDone?.({ bounds: map.getBounds(), zoom: map.getZoom() });
    }, 1000);
    return () => {
      clearTimeout(t);
      onNavigatingChange?.(false);
    };
  }, [navigation, map, onDone, onNavigatingChange]);

  return null;
};

const MapBoundsHandler = ({ onViewportChange, suppress }) => {
  const timerRef = useRef(null);
  const lastKeyRef = useRef('');

  useMapEvents({
    moveend: (e) => {
      if (suppress) return;

      const map = e.target;
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const key = boundsKey(bounds, zoom);
      if (key === lastKeyRef.current) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (suppress) return;
        const settled = map.getBounds();
        const settledZoom = map.getZoom();
        const settledKey = boundsKey(settled, settledZoom);
        if (settledKey === lastKeyRef.current) return;
        lastKeyRef.current = settledKey;
        onViewportChange({ bounds: settled, zoom: settledZoom });
        const c = map.getCenter();
        saveSessionView([c.lat, c.lng], settledZoom);
      }, 550);
    },
  });

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return null;
};

const InitialBoundsCapture = ({ onViewportReady }) => {
  const map = useMap();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const t = setTimeout(() => {
      onViewportReady?.({ bounds: map.getBounds(), zoom: map.getZoom() });
    }, 150);
    return () => clearTimeout(t);
  }, [map, onViewportReady]);

  return null;
};

/** Map click → set directions destination when directions mode is open. */
const DirectionsClickHandler = ({ enabled, onPick }) => {
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      onPick?.({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        label: `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`,
      });
    },
  });
  return null;
};

const CrimeStatsPanel = ({ crimes, summaries, viewMode, loading }) => {
  if (viewMode === 'summaries' || viewMode === 'exported') {
    const totalCrimes = summaries.reduce((sum, s) => sum + s.total_count, 0);
    const violentCrimes = summaries.reduce((sum, s) => sum + s.violent_count, 0);
    const categoryCounts = summaries.reduce((acc, s) => {
      s.categories.forEach((cat) => {
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

  const violentCount = crimes.filter((crime) => crime.is_violent).length;
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
    <div className="absolute bottom-4 right-4 bg-white p-4 shadow rounded z-[400] w-64 mr-14">
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

const CrimeLegend = ({ isVisible, onToggle }) => {
  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute left-4 bottom-4 bg-white p-2 rounded shadow z-[400] flex items-center"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
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
      color,
    }));

  return (
    <div className="absolute left-4 bottom-4 bg-white p-3 shadow rounded z-[400] max-h-64 overflow-y-auto w-64">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-700 text-sm">Crime Type Legend</h3>
        <button type="button" onClick={onToggle} className="text-gray-500 hover:text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center text-xs">
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const CrimeMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showStats, setShowStats] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showHotspots, setShowHotspots] = useState(true);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(USER_ZOOM);
  const [mapBounds, setMapBounds] = useState(null);
  const [viewMode, setViewMode] = useState('crimes');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [navigation, setNavigation] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [bootstrapDone, setBootstrapDone] = useState(false);
  const [basemap, setBasemap] = useState(readBasemap);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [routeDest, setRouteDest] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    crimeTypes: [],
    dateRange: { start: null, end: null },
  });

  const navIdRef = useRef(0);
  const deepLinkHandled = useRef(false);
  const { position, error: geoError, loading: geoLoading, getCurrentPosition } = useGeolocation({
    timeout: 8000,
    maximumAge: 60000,
  });

  const handleBasemapChange = useCallback((mode) => {
    setBasemap(mode);
    saveBasemap(mode);
  }, []);

  const applyViewport = useCallback(({ bounds, zoom }) => {
    if (bounds) setMapBounds(bounds);
    if (typeof zoom === 'number') setMapZoom(zoom);
  }, []);

  const requestNavigate = useCallback((payload) => {
    navIdRef.current += 1;
    setNavigation({ id: navIdRef.current, ...payload });
  }, []);

  // Deep-link from Dashboard (?lat=&lng=&zoom=) or GPS / session / Kenya default
  useEffect(() => {
    if (bootstrapDone || geoLoading) return;

    if (!deepLinkHandled.current) {
      const lat = parseFloat(searchParams.get('lat'));
      const lng = parseFloat(searchParams.get('lng'));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const zoomParam = parseInt(searchParams.get('zoom'), 10);
        const zoom = Number.isFinite(zoomParam) ? zoomParam : USER_ZOOM;
        const center = [lat, lng];
        setMapCenter(center);
        setMapZoom(zoom);
        saveSessionView(center, zoom);
        deepLinkHandled.current = true;
        setBootstrapDone(true);
        // Clear coords from URL so refresh doesn't re-fly; keep other params
        const next = new URLSearchParams(searchParams);
        next.delete('lat');
        next.delete('lng');
        next.delete('zoom');
        setSearchParams(next, { replace: true });
        return;
      }
      deepLinkHandled.current = true;
    }

    if (position) {
      const center = [position.latitude, position.longitude];
      setMapCenter(center);
      setMapZoom(USER_ZOOM);
      saveSessionView(center, USER_ZOOM);
      setBootstrapDone(true);
      return;
    }

    const session = readSessionView();
    if (session) {
      setMapCenter(session.center);
      setMapZoom(session.zoom);
      setBootstrapDone(true);
      return;
    }

    setMapCenter(KENYA_CENTER);
    setMapZoom(KENYA_ZOOM);
    saveSessionView(KENYA_CENTER, KENYA_ZOOM);
    setBootstrapDone(true);
  }, [geoLoading, position, bootstrapDone, searchParams, setSearchParams]);

  const viewportParams = useMemo(() => {
    if (!mapBounds) return null;
    const tile = boundsToTileParams(mapBounds, mapZoom);
    const national = tile.tier === 'districts' || tile.zoom < 9;
    return {
      ...tile,
      national,
      crimeTypes: selectedFilters.crimeTypes,
      startDate: selectedFilters.dateRange.start
        ? selectedFilters.dateRange.start.toISOString().split('T')[0]
        : undefined,
      endDate: selectedFilters.dateRange.end
        ? selectedFilters.dateRange.end.toISOString().split('T')[0]
        : undefined,
      limit: 2500,
    };
  }, [mapBounds, mapZoom, selectedFilters.crimeTypes, selectedFilters.dateRange.start, selectedFilters.dateRange.end]);

  const searchViewbox = useMemo(() => {
    if (!mapBounds) return null;
    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    return { west: sw.lng, south: sw.lat, east: ne.lng, north: ne.lat };
  }, [mapBounds]);

  const viewportQuery = useMapViewport(viewportParams, {
    enabled: !!viewportParams && viewMode === 'crimes',
    retry: (failureCount, error) => {
      const status = error?.response?.status || error?.status;
      if (status === 429) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
  });

  // Neighbor prefetch disabled — was contributing to request storms / 429s
  // (React Query cache already covers revisiting the same tiles)

  const summaryParams = useMemo(
    () => ({
      hierarchical: true,
      crimeTypes: selectedFilters.crimeTypes,
      startDate: selectedFilters.dateRange.start
        ? selectedFilters.dateRange.start.toISOString().split('T')[0]
        : undefined,
      endDate: selectedFilters.dateRange.end
        ? selectedFilters.dateRange.end.toISOString().split('T')[0]
        : undefined,
    }),
    [selectedFilters.crimeTypes, selectedFilters.dateRange.start, selectedFilters.dateRange.end]
  );

  const exportedParams = useMemo(
    () => ({
      crimeTypes: selectedFilters.crimeTypes,
      startDate: selectedFilters.dateRange.start
        ? selectedFilters.dateRange.start.toISOString().split('T')[0]
        : undefined,
      endDate: selectedFilters.dateRange.end
        ? selectedFilters.dateRange.end.toISOString().split('T')[0]
        : undefined,
      days: 30,
    }),
    [selectedFilters.crimeTypes, selectedFilters.dateRange.start, selectedFilters.dateRange.end]
  );

  const summariesQuery = useCrimeSummaries(summaryParams, {
    enabled: viewMode === 'summaries',
    retry: 2,
  });
  const exportedQuery = useExportedCrimeSummary(exportedParams, {
    enabled: viewMode === 'exported',
    retry: 2,
  });
  const hotspotsQuery = useHotspots({
    enabled: showHotspots,
    retry: 2,
    staleTime: 1000 * 60 * 15,
  });
  const queryClient = useQueryClient();

  const viewportMode = viewportQuery.data?.mode || getMapTier(mapZoom);
  const viewportResults = viewportQuery.data?.results || [];
  const viewportTotal = viewportQuery.data?.count ?? 0;
  const crimes = viewportMode === 'points' ? viewportResults : [];
  const aggregates = viewportMode === 'points' ? [] : viewportResults;
  const summaries = summariesQuery.data?.results || [];
  const exportedPoints = Array.isArray(exportedQuery.data) ? exportedQuery.data : [];
  const hotspots = hotspotsQuery.data || [];
  const loading =
    (viewMode === 'crimes' && viewportQuery.isLoading) ||
    (viewMode === 'summaries' && summariesQuery.isLoading) ||
    (viewMode === 'exported' && exportedQuery.isLoading);
  // Scope errors per feature — do not blank crime layers for hotspot/summary failures
  const mapError =
    viewMode === 'crimes'
      ? viewportQuery.error
      : viewMode === 'summaries'
        ? summariesQuery.error
        : viewMode === 'exported'
          ? exportedQuery.error
          : null;
  const hotspotError = showHotspots ? hotspotsQuery.error : null;

  const heatPoints = useMemo(() => {
    if (viewMode === 'exported' && exportedPoints.length) {
      const maxIntensity = Math.max(...exportedPoints.map((p) => p.intensity || 1), 1);
      return exportedPoints.map((p) => [
        p.lat,
        p.lng,
        Math.min(1, (p.intensity || 1) / maxIntensity),
      ]);
    }
    // Heat only at mid zoom — national view uses choropleth instead
    if (viewportMode !== 'clusters' || !aggregates.length) return [];
    const maxCount = Math.max(...aggregates.map((a) => a.count || 1), 1);
    return aggregates.map((a) => [a.lat, a.lng, Math.min(1, (a.count || 1) / maxCount)]);
  }, [aggregates, viewportMode, viewMode, exportedPoints]);

  const aggregateMaxCount = useMemo(
    () => Math.max(0, ...aggregates.map((a) => a.count || 0)),
    [aggregates]
  );

  const filteredData = useMemo(() => {
    if (viewMode === 'crimes') {
      let filtered = [...crimes];
      if (selectedFilters.crimeTypes.length > 0) {
        filtered = filtered.filter((crime) => selectedFilters.crimeTypes.includes(crime.type));
      }
      return { crimes: filtered, summaries: [] };
    }

    if (viewMode === 'exported') {
      return { crimes: [], summaries: [] };
    }

    let filtered = [...summaries];
    if (selectedFilters.crimeTypes.length > 0) {
      filtered = filtered
        .map((summary) => {
          const filteredCategories = (summary.categories || []).filter((cat) =>
            selectedFilters.crimeTypes.includes(cat.name.toUpperCase())
          );
          const total_count = filteredCategories.reduce((sum, cat) => sum + cat.count, 0);
          const violent_count = filteredCategories.reduce(
            (sum, cat) =>
              CRIME_COLORS[cat.name.toUpperCase()] === CRIME_COLORS.VIOLENT ? sum + cat.count : sum,
            0
          );
          return { ...summary, categories: filteredCategories, total_count, violent_count };
        })
        .filter((summary) => summary.total_count > 0);
    }
    return { crimes: [], summaries: filtered };
  }, [crimes, summaries, selectedFilters.crimeTypes, viewMode]);

  const filteredCrimes = filteredData.crimes;
  const filteredSummaries = filteredData.summaries;

  // Keep crime-type legend collapsed when leaving street/points zoom
  useEffect(() => {
    if (viewportMode !== 'points') setShowLegend(false);
  }, [viewportMode]);

  const handlePlaceSelect = useCallback(
    (place) => {
      setSelectedPlace(place);
      if (directionsOpen) {
        setRouteDest({
          lat: place.lat,
          lng: place.lng,
          label: place.primary || place.name,
        });
        setRouteData(null);
        setRouteError(null);
      }
      if (place.boundingbox) {
        requestNavigate({ bounds: place.boundingbox });
      } else {
        requestNavigate({ center: [place.lat, place.lng], zoom: PLACE_ZOOM });
      }
    },
    [requestNavigate, directionsOpen]
  );

  const handleSearchClear = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  const setDestination = useCallback((dest) => {
    setRouteDest(dest);
    setRouteData(null);
    setRouteError(null);
    if (!directionsOpen) setDirectionsOpen(true);
  }, [directionsOpen]);

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRouteError(null);
    setRouteDest(null);
  }, []);

  const runRoute = useCallback(async () => {
    if (!routeDest) {
      setRouteError('Select a destination (search, crime, or map click)');
      return;
    }
    if (!position) {
      setRouteError('Enable location or wait for GPS to set origin');
      getCurrentPosition();
      return;
    }

    setRouteLoading(true);
    setRouteError(null);
    try {
      const result = await getDrivingRoute(
        { lat: position.latitude, lng: position.longitude },
        { lat: routeDest.lat, lng: routeDest.lng }
      );
      setRouteData(result);
    } catch (err) {
      setRouteData(null);
      setRouteError(err?.message || 'Routing unavailable');
    } finally {
      setRouteLoading(false);
    }
  }, [routeDest, position, getCurrentPosition]);

  // Auto-route when destination is set and directions are open with a GPS fix
  useEffect(() => {
    if (!directionsOpen || !routeDest || !position || routeLoading) return;
    if (routeData || routeError) return;
    runRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot when dest+GPS ready
  }, [directionsOpen, routeDest, position]);

  const flyToUser = useCallback(
    (coords) => {
      const center = [coords.latitude, coords.longitude];
      setSelectedPlace(null);
      requestNavigate({ center, zoom: USER_ZOOM });
      saveSessionView(center, USER_ZOOM);
    },
    [requestNavigate]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (position) {
      flyToUser(position);
      return;
    }
    getCurrentPosition();
  }, [position, getCurrentPosition, flyToUser]);

  const locatePendingRef = useRef(false);
  useEffect(() => {
    if (!bootstrapDone) return;
    if (locatePendingRef.current && position) {
      locatePendingRef.current = false;
      flyToUser(position);
    }
  }, [position, bootstrapDone, flyToUser]);

  const handleLocateMe = useCallback(() => {
    if (position) {
      flyToUser(position);
      return;
    }
    locatePendingRef.current = true;
    getCurrentPosition();
  }, [position, getCurrentPosition, flyToUser]);

  const handleNavigationDone = useCallback(
    (payload) => {
      applyViewport(payload);
    },
    [applyViewport]
  );

  const handleInitialViewport = useCallback(
    (payload) => {
      setMapBounds((prev) => prev || payload.bounds);
      if (typeof payload.zoom === 'number') {
        setMapZoom((z) => z || payload.zoom);
      }
    },
    []
  );

  const zoomIntoAggregate = useCallback(
    (agg) => {
      if (agg?.bounds) {
        requestNavigate({ bounds: agg.bounds, maxZoom: 9 });
        return;
      }
      const nextZoom = viewportMode === 'districts' ? 9 : 13;
      if (agg?.lat != null && agg?.lng != null) {
        requestNavigate({ center: [agg.lat, agg.lng], zoom: nextZoom });
      }
    },
    [requestNavigate, viewportMode]
  );

  if (!mapCenter) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-gray-50">
        <Loader size="lg" />
        <p className="text-sm text-gray-600">
          {geoLoading ? 'Locating you…' : 'Preparing map…'}
        </p>
        {geoError && (
          <p className="text-xs text-gray-500 max-w-xs text-center">
            Location unavailable — showing Kenya overview.
          </p>
        )}
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-700">Error loading the map. Please refresh.</div>}>
      <div className="h-full w-full relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <BasemapLayers mode={basemap} />
          <ZoomControl position="bottomright" />
          <InitialBoundsCapture onViewportReady={handleInitialViewport} />
          <MapNavigator
            navigation={navigation}
            onNavigatingChange={setIsNavigating}
            onDone={handleNavigationDone}
          />
          <MapBoundsHandler onViewportChange={applyViewport} suppress={isNavigating} />
          <DirectionsClickHandler
            enabled={directionsOpen}
            onPick={(dest) => setDestination(dest)}
          />
          <RouteLayer route={routeData} />

          {position && (
            <>
              <Circle
                center={[position.latitude, position.longitude]}
                radius={Math.max(position.accuracy || 40, 25)}
                pathOptions={{
                  color: '#4285F4',
                  fillColor: '#4285F4',
                  fillOpacity: 0.15,
                  weight: 1,
                }}
              />
              <Marker
                position={[position.latitude, position.longitude]}
                icon={userLocationIcon}
                zIndexOffset={1000}
              >
                <Popup>You are here</Popup>
              </Marker>
            </>
          )}

          {selectedPlace && (
            <Marker
              position={[selectedPlace.lat, selectedPlace.lng]}
              icon={placePinIcon}
              zIndexOffset={900}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{selectedPlace.primary || selectedPlace.name}</div>
                  {selectedPlace.secondary && (
                    <div className="text-gray-500 text-xs">{selectedPlace.secondary}</div>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-xs text-blue-600 hover:underline"
                    onClick={() =>
                      setDestination({
                        lat: selectedPlace.lat,
                        lng: selectedPlace.lng,
                        label: selectedPlace.primary || selectedPlace.name,
                      })
                    }
                  >
                    Directions here
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {viewMode === 'crimes' && !mapError && viewportMode === 'districts' && (
            <CountyChoropleth
              aggregates={aggregates}
              onCountyClick={zoomIntoAggregate}
            />
          )}

          {viewMode === 'crimes' && !mapError && viewportMode === 'clusters' && (
            <>
              <DensityHeatLayer points={heatPoints} />
              {aggregates.map((agg) => {
                const fill = colorForCount(agg.count || 0, aggregateMaxCount);
                return (
                  <Circle
                    key={agg.id}
                    center={[agg.lat, agg.lng]}
                    radius={clusterRadiusMeters(agg.count || 1, mapZoom)}
                    pathOptions={{
                      color: '#7f1d1d',
                      fillColor: fill,
                      fillOpacity: 0.55,
                      weight: 1.5,
                    }}
                    eventHandlers={{
                      click: () => zoomIntoAggregate(agg),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">
                          {agg.name || 'Area cluster'}
                        </div>
                        <p>{(agg.count || 0).toLocaleString()} crimes in view</p>
                        {agg.violent_count > 0 && (
                          <p className="text-red-600">
                            {agg.violent_count.toLocaleString()} violent
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Click bubble to zoom in
                        </p>
                      </div>
                    </Popup>
                  </Circle>
                );
              })}
            </>
          )}

          {viewMode === 'crimes' && !loading && !mapError && viewportMode === 'points' && filteredCrimes.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              spiderfyOnMaxZoom
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
                      <button
                        type="button"
                        className="mt-2 block text-xs text-blue-600 hover:underline"
                        onClick={() =>
                          setDestination({
                            lat: crime.latitude,
                            lng: crime.longitude,
                            label: crime.type || 'Crime',
                          })
                        }
                      >
                        Directions here
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}

          {viewMode === 'exported' && !loading && !mapError && heatPoints.length > 0 && (
            <DensityHeatLayer points={heatPoints} />
          )}

          {viewMode === 'summaries' &&
            !loading &&
            !mapError &&
            filteredSummaries.length > 0 &&
            filteredSummaries.map((summary) => (
              <NeighborhoodSummaryMarker key={summary.neighborhood_id} summary={summary} />
            ))}

          {showHotspots &&
            Array.isArray(hotspots) &&
            hotspots.length > 0 &&
            hotspots.map((hotspot, index) => (
              <Marker
                key={`hotspot-${index}`}
                position={[hotspot.lat, hotspot.lng]}
                icon={L.divIcon({
                  className: 'hotspot-marker',
                  html: `<div style="background-color: rgba(255, 0, 0, 0.4); width: ${
                    hotspot.intensity * 20
                  }px; height: ${hotspot.intensity * 20}px; border-radius: 50%; border: 2px solid red;"></div>`,
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

        {/* Top chrome: filters FAB (left) · search (center) · meta + actions (right) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[550] w-[min(92vw,28rem)] px-2 pointer-events-none">
          <div className="pointer-events-auto">
            <LocationSearch
              viewbox={searchViewbox}
              onLocationSelect={handlePlaceSelect}
              onClear={handleSearchClear}
              onUseCurrentLocation={() => {
                if (!position) locatePendingRef.current = true;
                handleUseCurrentLocation();
              }}
            />
          </div>
        </div>

        <div className="absolute top-4 right-4 z-[500] flex items-center gap-1.5 bg-white/95 px-2.5 py-1.5 shadow-md rounded-lg border border-gray-100 max-w-[min(42vw,16rem)]">
          <span className="text-xs sm:text-sm font-medium text-gray-800 truncate tabular-nums">
            {loading
              ? 'Loading…'
              : viewMode === 'crimes'
                ? viewportMode === 'points'
                  ? `${filteredCrimes.length.toLocaleString()}${viewportQuery.data?.truncated ? '+' : ''} of ${viewportTotal.toLocaleString()}`
                  : `${viewportTotal.toLocaleString()} crimes`
                : viewMode === 'exported'
                  ? `${exportedPoints.length} heat points`
                  : `${filteredSummaries.length} areas`}
          </span>
          <button
            type="button"
            onClick={() =>
              setViewMode((m) => (m === 'crimes' ? 'summaries' : m === 'summaries' ? 'exported' : 'crimes'))
            }
            className="p-1.5 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none shrink-0"
            title="Cycle view mode"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowStats((s) => !s)}
            className={`p-1.5 rounded focus:outline-none shrink-0 ${
              showStats ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle statistics panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowHotspots((h) => !h)}
            className={`p-1.5 rounded focus:outline-none shrink-0 ${
              showHotspots ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Toggle hotspots"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>

        <DirectionsPanel
          open={directionsOpen}
          loading={routeLoading}
          error={routeError}
          route={routeData}
          originLabel={position ? 'Your location' : 'Waiting for GPS…'}
          destinationLabel={routeDest?.label}
          canRoute={!!routeDest && !!position}
          onRoute={runRoute}
          onClear={clearRoute}
          onClose={() => {
            setDirectionsOpen(false);
            clearRoute();
          }}
        />

        <BasemapToggle mode={basemap} onChange={handleBasemapChange} />

        {/* Directions toggle */}
        <button
          type="button"
          onClick={() => {
            setDirectionsOpen((v) => {
              if (v) {
                clearRoute();
                return false;
              }
              if (selectedPlace) {
                setRouteDest({
                  lat: selectedPlace.lat,
                  lng: selectedPlace.lng,
                  label: selectedPlace.primary || selectedPlace.name,
                });
                setRouteData(null);
                setRouteError(null);
              }
              return true;
            });
          }}
          className={`absolute bottom-36 right-4 z-[500] w-11 h-11 rounded-full shadow-lg border flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            directionsOpen
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-blue-600 border-gray-200 hover:bg-gray-50'
          }`}
          title="Directions"
          aria-label="Directions"
          aria-pressed={directionsOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
        </button>

        {/* Locate me (Google Maps–style) */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-24 right-4 z-[500] w-11 h-11 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Locate me"
          aria-label="Locate me"
        >
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.94 3A8.994 8.994 0 0013 3.06V1h-2v2.06A8.994 8.994 0 003.06 11H1v2h2.06A8.994 8.994 0 0011 20.94V23h2v-2.06A8.994 8.994 0 0020.94 13H23v-2h-2.06zM12 19a7 7 0 110-14 7 7 0 010 14z" />
          </svg>
        </button>

        <MapControls
          onFilterChange={setSelectedFilters}
          filters={selectedFilters}
          onRefresh={() => {
            if (viewMode === 'crimes') {
              queryClient.invalidateQueries({ queryKey: ['map-viewport'] });
              queryClient.invalidateQueries({ queryKey: ['crimes'] });
            } else if (viewMode === 'summaries') {
              queryClient.invalidateQueries({ queryKey: ['crime-summaries'] });
            } else if (viewMode === 'exported') {
              queryClient.invalidateQueries({ queryKey: ['exported-summary'] });
            }
            if (showHotspots) {
              queryClient.invalidateQueries({ queryKey: ['hotspots'] });
            }
          }}
        />

        {showStats && (
          <CrimeStatsPanel
            crimes={filteredCrimes}
            summaries={viewMode === 'exported' ? [] : filteredSummaries}
            viewMode={viewMode}
            loading={loading}
          />
        )}

        {/* Crime-type legend only in point mode; density scale handles districts/clusters */}
        {viewMode === 'crimes' && viewportMode === 'points' && (
          <CrimeLegend isVisible={showLegend} onToggle={() => setShowLegend((v) => !v)} />
        )}

        {loading && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 px-4 py-2 rounded-full shadow z-[400] flex items-center gap-2">
            <Loader size="sm" />
            <span className="text-sm text-gray-700">
              Loading{' '}
              {viewMode === 'crimes'
                ? 'crimes'
                : viewMode === 'exported'
                  ? 'heatmap'
                  : 'summaries'}
              …
            </span>
          </div>
        )}

        {(mapError || hotspotError) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-[400] max-w-md">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline">
              {' '}
              {(mapError || hotspotError)?.message ||
                (mapError || hotspotError)?.toString() ||
                'An error occurred'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'crimes') {
                  queryClient.invalidateQueries({ queryKey: ['map-viewport'] });
                } else if (viewMode === 'summaries') {
                  queryClient.invalidateQueries({ queryKey: ['crime-summaries'] });
                } else if (viewMode === 'exported') {
                  queryClient.invalidateQueries({ queryKey: ['exported-summary'] });
                }
                if (hotspotError) {
                  queryClient.invalidateQueries({ queryKey: ['hotspots'] });
                }
              }}
              className="mt-2 bg-red-700 text-white px-2 py-1 rounded text-sm hover:bg-red-800 focus:outline-none"
            >
              Retry
            </button>
          </div>
        )}

        {!loading &&
          !mapError &&
          viewMode === 'crimes' &&
          ((viewportMode === 'points' && filteredCrimes.length === 0) ||
            (viewportMode !== 'points' && aggregates.length === 0)) && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-[400] max-w-md">
              <span>No crimes found in this area with the current filters.</span>
              <div className="mt-2 text-sm">
                Try zooming out, searching another place, or adjusting crime type / date filters.
              </div>
            </div>
          )}

        {!loading &&
          !mapError &&
          viewMode === 'summaries' &&
          filteredSummaries.length === 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-[400] max-w-md">
              <span>No neighborhood summaries found with the current filters.</span>
            </div>
          )}

        {!loading &&
          !mapError &&
          viewMode === 'exported' &&
          exportedPoints.length === 0 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-[400] max-w-md">
              <span>No exported heatmap points found with the current filters.</span>
            </div>
          )}

        {viewMode === 'crimes' && !loading && (
          <>
            {/* Density scale for choropleth / clusters only (MapLegend hides itself in points mode) */}
            <MapLegend mode={viewportMode} maxCount={aggregateMaxCount} />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-white/95 text-xs text-gray-600 px-3 py-1.5 rounded-full shadow border border-gray-100">
              {viewportMode === 'districts' &&
                'County overview — colour = crime volume (zoom in for clusters)'}
              {viewportMode === 'clusters' &&
                'Area clusters — size & colour = density (zoom in for markers)'}
              {viewportMode === 'points' &&
                'Street view — individual crime markers in this area'}
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default CrimeMap;
