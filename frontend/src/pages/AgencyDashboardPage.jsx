import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from '../services/api'; // Import your configured API
import { AuthContext } from '../context/AuthContext'; // Import the auth context
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Fix for Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const AgencyDashboardPage = () => {
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [crimeData, setCrimeData] = useState([]);
  const [crimeTypeData, setCrimeTypeData] = useState(null);
  const [monthlyCrimeData, setMonthlyCrimeData] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // New York as default
  const [error, setError] = useState(null);

  // Get agency ID from context user or fallback to localStorage
  const getAgencyId = () => {
    if (user && user.agency_id) {
      return user.agency_id;
    }
    return localStorage.getItem('agency_id') || '1'; // Default to 1 for demo
  };

  useEffect(() => {
    const fetchAgencyData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const agencyId = getAgencyId();

        // Try to fetch data, but handle potential errors for each request
        try {
          const statsResponse = await axios.get(`/agencies/agencies/${agencyId}/stats/`);
          setStatsData(statsResponse.data);
        } catch (statsError) {
          console.error('Failed to fetch agency stats:', statsError);
        }

        try {
          const crimeResponse = await axios.get(`/crimes/?agency_id=${agencyId}`);
          const crimes = crimeResponse.data.results || [];
          setCrimeData(crimes);

          // Center map on first crime location if available
          if (crimes.length > 0 && crimes[0].latitude && crimes[0].longitude) {
            setMapCenter([crimes[0].latitude, crimes[0].longitude]);
          }
        } catch (crimeError) {
          console.error('Failed to fetch crime data:', crimeError);
        }

        try {
          const chartResponse = await axios.get(`/crimes/stats/?agency_id=${agencyId}`);
          
          // Set Pie chart data (Crime by Type)
          if (chartResponse.data.crime_types && chartResponse.data.crime_types.length > 0) {
            setCrimeTypeData({
              labels: chartResponse.data.crime_types.map(item => item.name),
              datasets: [
                {
                  label: 'Crime by Type',
                  data: chartResponse.data.crime_types.map(item => item.count),
                  backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                  ],
                  borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                  ],
                  borderWidth: 1,
                },
              ],
            });
          }
        } catch (chartError) {
          console.error('Failed to fetch crime stats:', chartError);
        }

        try {
          const trendsResponse = await axios.get(`/crimes/trends/?agency_id=${agencyId}`);
          setMonthlyCrimeData(trendsResponse.data);
        } catch (trendsError) {
          console.error('Failed to fetch crime trends:', trendsError);
        }

      } catch (error) {
        console.error('Failed to fetch agency data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgencyData();
  }, [user]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('method', 'file_upload');

    // Add date range
    const today = new Date();
    formData.append('start_date', today.toISOString().split('T')[0]);
    formData.append('end_date', today.toISOString().split('T')[0]);

    try {
      setUploadStatus('uploading');
      const agencyId = getAgencyId();

      await axios.post(
        `/agencies/agencies/${agencyId}/upload_data/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );

      setUploadStatus('success');

      // Refresh stats and charts after successful upload
      try {
        const statsResponse = await axios.get(`/agencies/agencies/${agencyId}/stats/`);
        setStatsData(statsResponse.data);
      } catch (statsError) {
        console.error('Failed to refresh agency stats:', statsError);
      }

      try {
        const chartResponse = await axios.get(`/crimes/stats/?agency_id=${agencyId}`);
        setCrimeTypeData({
          labels: chartResponse.data.crime_types.map(item => item.name),
          datasets: [
            {
              label: 'Crime by Type',
              data: chartResponse.data.crime_types.map(item => item.count),
              backgroundColor: [
                'rgba(255, 99, 132, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
              ],
              borderWidth: 1,
            },
          ],
        });
      } catch (chartError) {
        console.error('Failed to refresh crime stats:', chartError);
      }

      try {
        const trendsResponse = await axios.get(`/crimes/trends/?agency_id=${agencyId}`);
        setMonthlyCrimeData(trendsResponse.data);
      } catch (trendsError) {
        console.error('Failed to refresh crime trends:', trendsError);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Agency Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user?.username || localStorage.getItem('username') || 'Agency User'}
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className={`px-3 py-1 rounded-full text-sm ${
              statsData?.status === 'approved' 
                ? 'bg-green-100 text-green-800' 
                : statsData?.status === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              Status: {statsData?.status || 'Unknown'}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-md shadow">
            <div className="text-blue-600 text-xl font-semibold">{statsData?.contact_count || 0}</div>
            <div className="text-gray-600 text-sm">Contacts</div>
          </div>
          <div className="bg-green-50 p-4 rounded-md shadow">
            <div className="text-green-600 text-xl font-semibold">{statsData?.active_api_keys || 0}</div>
            <div className="text-gray-600 text-sm">Active API Keys</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-md shadow">
            <div className="text-purple-600 text-xl font-semibold">{statsData?.total_imports || 0}</div>
            <div className="text-gray-600 text-sm">Data Imports</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-md shadow">
            <div className="text-yellow-600 text-xl font-semibold">{statsData?.successful_imports || 0}</div>
            <div className="text-gray-600 text-sm">Successful Imports</div>
          </div>
        </div>

        {/* Data Upload Section */}
        <div className="bg-gray-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Crime Data</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Data File (CSV, Excel, or JSON)
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-600
                  hover:file:bg-blue-100"
                accept=".csv,.xlsx,.json"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload your crime data in CSV, Excel, or JSON format. Ensure the file follows our standard schema.
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploadStatus === 'uploading'}
                className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md 
                  text-white bg-blue-600 hover:bg-blue-700 focus:outline-none 
                  focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Data'}
              </button>
            </div>
          </div>
          {uploadStatus === 'success' && (
            <div className="mt-3 text-sm text-green-600 bg-green-50 p-2 rounded">
              File uploaded successfully! Your data is being processed.
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
              Error uploading file. Please check the file format and try again.
            </div>
          )}
        </div>

        {/* Data Visualization Section */}
        {crimeTypeData && monthlyCrimeData && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Data Visualization</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-2">Crime by Type</h3>
                <div className="h-64">
                  <Pie data={crimeTypeData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-2">Monthly Crime Trends</h3>
                <div className="h-64">
                  <Line data={monthlyCrimeData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Crime Map</h2>
          <div className="h-96 bg-gray-100 rounded-lg overflow-hidden">
            <MapContainer 
              center={mapCenter} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {crimeData.map((crime, index) => (
                <Marker 
                  key={crime.id || index} 
                  position={[crime.latitude || mapCenter[0], crime.longitude || mapCenter[1]]}
                >
                  <Popup>
                    <div>
                      <h3 className="font-bold">{crime.crime_type || 'Unknown Crime'}</h3>
                      <p>Date: {crime.date || 'N/A'}</p>
                      <p>Time: {crime.time || 'N/A'}</p>
                      <p>Status: {crime.status || 'N/A'}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/agency/data" 
              className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700"
            >
              <div className="font-medium">View All Data</div>
              <p className="text-sm text-gray-600">Access and manage your uploaded crime data</p>
            </Link>
            <Link 
              to="/agency/analytics" 
              className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg text-green-700"
            >
              <div className="font-medium">Advanced Analytics</div>
              <p className="text-sm text-gray-600">Explore detailed crime trends and patterns</p>
            </Link>
            <Link 
              to="/profile" 
              className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700"
            >
              <div className="font-medium">Agency Profile</div>
              <p className="text-sm text-gray-600">Update your agency information</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyDashboardPage;