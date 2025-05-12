import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import L from 'leaflet';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { getCrimes } from '../../services/crimeService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// HeatmapLayer component that uses leaflet.heat
const HeatmapLayer = ({ points, intensity = 8, radius = 25, blur = 15 }) => {
  const map = useMap();
  const heatLayerRef = useRef(null);
  
  useEffect(() => {
    if (!map) return;
    
    // Initialize the heat layer if not already created
    if (!heatLayerRef.current) {
      heatLayerRef.current = L.heatLayer([], {
        radius,
        blur,
        maxZoom: 17,
        max: intensity,
        gradient: {
          0.0: 'green',
          0.4: 'blue',
          0.6: 'yellow',
          0.8: 'orange',
          1.0: 'red'
        }
      }).addTo(map);
    }
    
    // Update the heat layer with new points
    if (points && points.length > 0) {
      heatLayerRef.current.setLatLngs(points);
    }
    
    // Cleanup function
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [map, points, radius, blur, intensity]);
  
  return null;
};

const HeatmapView = () => {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([-4.0435, 39.6682]); // Default to NYC
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [selectedCrimeTypes, setSelectedCrimeTypes] = useState([]);
  const [intensity, setIntensity] = useState(8);
  const [radius, setRadius] = useState(25);
  
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
  
  const timePeriodsOptions = [
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' },
  ];
  
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('last_30_days');
  
  // Update dateRange when time period changes
  useEffect(() => {
    const endDate = new Date();
    let startDate;
    
    switch (selectedTimePeriod) {
      case 'last_7_days':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'last_90_days':
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'last_year':
        startDate = new Date(endDate);
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'custom':
        // Do nothing, keep the current dateRange
        return;
      default:
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 30);
    }
    
    setDateRange({ startDate, endDate });
  }, [selectedTimePeriod]);
  
  const handleCrimeTypeToggle = (type) => {
    if (selectedCrimeTypes.includes(type)) {
      setSelectedCrimeTypes(selectedCrimeTypes.filter(t => t !== type));
    } else {
      setSelectedCrimeTypes([...selectedCrimeTypes, type]);
    }
  };
  
  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: 10, // Example radius in km
        crimeTypes: selectedCrimeTypes,
      };

      const crimes = await getCrimes(params);
      setHeatmapData(crimes.map(crime => [crime.latitude, crime.longitude, 1]));
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError('Failed to load heatmap data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, [dateRange, selectedCrimeTypes, mapCenter]);
  
  const handleApplyFilters = () => {
    fetchHeatmapData();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Crime Heatmap Analysis</h2>
          <p className="text-gray-600 mb-6">
            Visualize crime density across areas using our heatmap. 
            Areas with higher concentrations of crime appear in red, while areas with lower concentrations appear in green.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
              <select
                value={selectedTimePeriod}
                onChange={(e) => setSelectedTimePeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {timePeriodsOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            {selectedTimePeriod === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Date Range</label>
                <div className="flex space-x-2">
                  <DatePicker
                    selected={dateRange.startDate}
                    onChange={(date) => setDateRange({ ...dateRange, startDate: date })}
                    selectsStart
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    maxDate={new Date()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholderText="Start Date"
                  />
                  <DatePicker
                    selected={dateRange.endDate}
                    onChange={(date) => setDateRange({ ...dateRange, endDate: date })}
                    selectsEnd
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    minDate={dateRange.startDate}
                    maxDate={new Date()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholderText="End Date"
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                className="w-full btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader size="sm" className="mr-2" />
                    Loading...
                  </span>
                ) : 'Apply Filters'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heatmap Intensity: {intensity}
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heatmap Radius: {radius}
              </label>
              <input
                type="range"
                min="10"
                max="50"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crime Types</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-1">
              {crimeTypes.map((type) => (
                <div key={type.value} className="flex items-center">
                  <input
                    id={`crime-type-${type.value}`}
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={selectedCrimeTypes.includes(type.value)}
                    onChange={() => handleCrimeTypeToggle(type.value)}
                  />
                  <label htmlFor={`crime-type-${type.value}`} className="ml-2 block text-sm text-gray-700">
                    {type.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
      
      <Card>
        <div className="relative h-[600px] w-full">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <Loader size="lg" />
            </div>
          )}
          
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <HeatmapLayer 
              points={heatmapData} 
              intensity={intensity} 
              radius={radius} 
              blur={15} 
            />
          </MapContainer>
        </div>
      </Card>
      
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Heatmap Analysis Insights</h3>
          
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader size="md" />
            </div>
          ) : heatmapData.length > 0 ? (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      This heatmap represents {heatmapData.length} crime incidents 
                      from {dateRange.startDate.toLocaleDateString()} to {dateRange.endDate.toLocaleDateString()}.
                      {selectedCrimeTypes.length > 0 && ` Filtered for crime types: ${selectedCrimeTypes.join(', ')}.`}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Total Incidents</h4>
                  <p className="text-2xl font-bold text-gray-900">{heatmapData.length}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Date Range</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Crime Types</h4>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedCrimeTypes.length > 0 
                      ? selectedCrimeTypes.join(', ') 
                      : 'All Types'}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Hotspot Risk Level</h4>
                  <div className="flex items-center space-x-1">
                    <span className="block w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="block w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="block w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="block w-3 h-3 rounded-full bg-orange-500"></span>
                    <span className="block w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-xs text-gray-500 ml-2">Low to High</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-2">Key Observations</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Heatmap displays crime density where red areas indicate highest concentration.</li>
                  <li>The analysis is based on historical crime data within the selected time period.</li>
                  <li>You can adjust the intensity and radius to better visualize hotspots.</li>
                  <li>This visualization helps identify patterns for preventative policing and resource allocation.</li>
                </ul>
              </div>
            </div>
          ) : !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
              <p className="mt-1 text-sm text-gray-500">Try changing filters or selecting a different time period.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default HeatmapView;
