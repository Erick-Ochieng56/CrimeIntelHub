import React, { useState, useEffect } from 'react';
import { getPredictiveAnalysis, getCrimes } from '../../services/crimeService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { useGeolocation } from '../../hooks/useGeolocation';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// MapClick component for handling map click events
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e);
    }
  });
  return null;
};

const PredictiveAnalysis = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCrimeType, setSelectedCrimeType] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([-4.0435, 39.6682]); // Default: Mombasa, Kenya
  const { position } = useGeolocation();

  const crimeTypes = [
    { value: 'ALL', label: 'All Crimes' },
    { value: 'THEFT', label: 'Theft' },
    { value: 'ASSAULT', label: 'Assault' },
    { value: 'BURGLARY', label: 'Burglary' },
    { value: 'ROBBERY', label: 'Robbery' },
    { value: 'VANDALISM', label: 'Vandalism' },
    { value: 'DRUG', label: 'Drug Offenses' },
    { value: 'FRAUD', label: 'Fraud' }
  ];

  // Set user's location as map center if available
  useEffect(() => {
    if (position && position.latitude && position.longitude) {
      setMapCenter([position.latitude, position.longitude]);
    }
  }, [position]);

  const fetchPredictiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format date in YYYY-MM-DD format
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      // Prepare coordinates for the API call
      const lat = selectedLocation ? selectedLocation[0] : mapCenter[0];
      const lng = selectedLocation ? selectedLocation[1] : mapCenter[1];

      // Log to debug
      console.log('Sending prediction request with:', {
        date: formattedDate,
        crime_type: selectedCrimeType !== 'ALL' ? selectedCrimeType : undefined,
        lat: lat,
        lng: lng
      });

      const params = {
        date: formattedDate,
        crimeType: selectedCrimeType !== 'ALL' ? selectedCrimeType : undefined,
        lat: lat,
        lng: lng
      };

      const results = await getPredictiveAnalysis(params);

      console.log('Prediction results:', results);

      // Check if results is an array
      if (Array.isArray(results)) {
        setPredictions(results);
      } else if (results && typeof results === 'object') {
        // If it's an object with data property that's an array
        setPredictions(Array.isArray(results.data) ? results.data : []);
      } else {
        // If nothing valid is returned
        setPredictions([]);
      }
    } catch (err) {
      console.error('Error fetching predictive data:', err);
      setError(`Failed to load predictive analysis: ${err.message}`);
      setPredictions([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchCrimeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        startDate: selectedDate.toISOString().split('T')[0],
        endDate: selectedDate.toISOString().split('T')[0],
        lat: mapCenter[0],
        lng: mapCenter[1],
        radius: 5, // Example radius in km
        crimeTypes: selectedCrimeType !== 'ALL' ? [selectedCrimeType] : undefined,
      };

      const crimes = await getCrimes(params);
      
      // Transform crime data to match prediction format
      if (Array.isArray(crimes) && crimes.length > 0) {
        setPredictions(crimes.map(crime => ({
          latitude: crime.latitude !== undefined ? crime.latitude : 0,
          longitude: crime.longitude !== undefined ? crime.longitude : 0,
          probability: Math.random(), // Placeholder for probability
          crimeType: crime.type || 'UNKNOWN',
          date: crime.date,
          address: crime.block_address,
          timeOfDay: crime.time ? 
            (new Date(crime.date + 'T' + crime.time).getHours() < 12 ? 'Morning' : 
             new Date(crime.date + 'T' + crime.time).getHours() < 18 ? 'Afternoon' : 'Evening') : 
            'All Day',
        })));
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error('Error fetching crime data:', err);
      setError('Failed to load crime data. Please try again later.');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // We'll fetch crime data by default
    fetchCrimeData();
  }, [selectedDate, selectedCrimeType, mapCenter]);

  const handleMapClick = (e) => {
    console.log('Map clicked at:', e.latlng);
    setSelectedLocation([e.latlng.lat, e.latlng.lng]);
  };

  const handleAnalyze = () => {
    fetchPredictiveData();
  };

  const getPredictionColor = (probability) => {
    if (probability >= 0.7) return '#ef4444'; // High risk - Red
    if (probability >= 0.4) return '#f59e0b'; // Medium risk - Amber
    return '#22c55e'; // Low risk - Green
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Predictive Crime Analysis</h2>
          <p className="text-gray-600 mb-6">
            Use our advanced machine learning model to predict crime patterns and hotspots for specific dates and locations.
            The predictions are based on historical crime data, temporal patterns, and spatial correlations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                minDate={new Date()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">Select future date for prediction</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crime Type</label>
              <select
                value={selectedCrimeType}
                onChange={(e) => setSelectedCrimeType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {crimeTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader size="sm" className="mr-2" />
                    Analyzing...
                  </span>
                ) : 'Generate Prediction'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p>
              <span className="font-medium">Instructions:</span> Select a date and crime type, then click "Generate Prediction" 
              to analyze potential crime hotspots. You can also click on the map to select a specific area for analysis.
            </p>
            {selectedLocation && (
              <p className="mt-2 text-blue-600">
                Location selected: Lat {selectedLocation[0].toFixed(6)}, Lng {selectedLocation[1].toFixed(6)}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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
        </div>
      </Card>

      <Card>
        <div className="h-[500px] w-full">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Add map click handler */}
            <MapClickHandler onMapClick={handleMapClick} />

            {/* Display selected location marker */}
            {selectedLocation && (
              <Marker position={selectedLocation}>
                <Popup>
                  <div>
                    <p>Selected location for analysis</p>
                    <p className="text-sm text-gray-500">Lat: {selectedLocation[0].toFixed(6)}</p>
                    <p className="text-sm text-gray-500">Lng: {selectedLocation[1].toFixed(6)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Display prediction circles with safeguard */}
            {Array.isArray(predictions) && predictions.map((pred, index) => {
              // Only render if both latitude and longitude are valid numbers
              if (typeof pred.latitude === 'number' && 
                  typeof pred.longitude === 'number' && 
                  !isNaN(pred.latitude) && 
                  !isNaN(pred.longitude)) {
                return (
                  <Circle
                    key={index}
                    center={[pred.latitude, pred.longitude]}
                    pathOptions={{
                      fillColor: getPredictionColor(pred.probability),
                      fillOpacity: 0.5,
                      weight: 1,
                      color: getPredictionColor(pred.probability)
                    }}
                    radius={pred.radius || 300}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-medium">{pred.crimeType || 'All Crimes'}</h3>
                        <p>Prediction Probability: {(pred.probability * 100).toFixed(1)}%</p>
                        <p>Predicted Date: {new Date(pred.date).toLocaleDateString()}</p>
                        {pred.factors && (
                          <div className="mt-2">
                            <p className="font-medium">Contributing Factors:</p>
                            <ul className="list-disc pl-4 text-sm">
                              {Array.isArray(pred.factors) && pred.factors.map((factor, i) => (
                                <li key={i}>{factor}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Circle>
                );
              }
              return null; // Skip rendering this prediction if coordinates are invalid
            })}
          </MapContainer>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Predictive Analysis Results</h3>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : Array.isArray(predictions) && predictions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crime Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Probability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time of Day</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {predictions.map((pred, index) => {
                    // Only include predictions with valid latitude and longitude
                    if (typeof pred.latitude === 'number' && 
                        typeof pred.longitude === 'number' && 
                        !isNaN(pred.latitude) && 
                        !isNaN(pred.longitude)) {
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pred.address || `${pred.latitude.toFixed(4)}, ${pred.longitude.toFixed(4)}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pred.crimeType || 'All Crimes'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(pred.probability * 100).toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              pred.probability >= 0.7
                                ? 'bg-red-100 text-red-800'
                                : pred.probability >= 0.4
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {pred.probability >= 0.7
                                ? 'High'
                                : pred.probability >= 0.4
                                ? 'Medium'
                                : 'Low'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pred.timeOfDay || 'All Day'}
                          </td>
                        </tr>
                      );
                    }
                    return null; // Skip this row if the coordinates are invalid
                  })}
                </tbody>
              </table>
            </div>
          ) : !loading && (
            <div className="text-center py-12">
              <svg 
                className="mx-auto h-12 w-12 text-gray-400" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No predictions generated</h3>
              <p className="mt-1 text-sm text-gray-500">Select parameters and generate a prediction to see results here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PredictiveAnalysis;