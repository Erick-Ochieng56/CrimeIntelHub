import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAlert, deleteAlert } from '../../services/alertService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatDate, formatDistance } from '../../utils/formatters';

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

const AlertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  useEffect(() => {
    const fetchAlertDetails = async () => {
      try {
        setLoading(true);
        const data = await getAlert(id);
        setAlert(data);
      } catch (err) {
        console.error('Error fetching alert details:', err);
        setError('Failed to load alert details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlertDetails();
  }, [id]);
  
  const handleDeleteClick = () => {
    setDeleteConfirmation(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      await deleteAlert(id);
      navigate('/alerts', { state: { success: 'Alert deleted successfully' } });
    } catch (err) {
      console.error('Error deleting alert:', err);
      setError('Failed to delete alert. Please try again.');
      setDeleteConfirmation(false);
    } finally {
      setDeleteLoading(false);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteConfirmation(false);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen-minus-nav">
        <Loader size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <Card>
          <div className="p-6">
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                  <div className="mt-4">
                    <Link to="/alerts" className="text-sm font-medium text-red-700 hover:text-red-600">
                      &larr; Back to Alerts
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  if (!alert) {
    return (
      <div className="max-w-3xl mx-auto mt-8">
        <Card>
          <div className="p-6">
            <p className="text-gray-500">Alert not found</p>
            <div className="mt-4">
              <Link to="/alerts" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                &larr; Back to Alerts
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto mt-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/alerts" className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center">
            <svg className="h-5 w-5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Alerts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{alert.name}</h1>
        </div>
        <div className="flex space-x-3">
          <Link to={`/alerts/${id}/edit`} className="btn btn-secondary">
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Link>
          <button onClick={handleDeleteClick} className="btn btn-danger">
            <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>
      
      <Card>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Details</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div className="mt-1">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      alert.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Crime Types</h4>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {alert.crimeTypes.map(type => (
                      <span 
                        key={type} 
                        className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Alert Area</h4>
                  <div className="mt-1">
                    <p className="text-sm text-gray-900">{formatDistance(alert.radius)} radius</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <div className="mt-1">
                    <p className="text-sm text-gray-900">{alert.address || `${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`}</p>
                  </div>
                </div>
                
                {alert.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">{alert.description}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created On</h4>
                  <div className="mt-1">
                    <p className="text-sm text-gray-900">{formatDate(alert.createdAt)}</p>
                  </div>
                </div>
                
                {alert.updatedAt && alert.updatedAt !== alert.createdAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">{formatDate(alert.updatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Area</h3>
              <div className="h-80 rounded-md overflow-hidden border border-gray-300">
                <MapContainer
                  center={[alert.latitude, alert.longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker 
                    position={[alert.latitude, alert.longitude]}
                    icon={defaultIcon}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-medium">{alert.name}</h3>
                        <p className="text-sm text-gray-500">{alert.address || `${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`}</p>
                      </div>
                    </Popup>
                  </Marker>
                  <Circle
                    center={[alert.latitude, alert.longitude]}
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
                </MapContainer>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Recent Alerts</h3>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm text-gray-500">No recent alerts for this area</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation}
        onClose={handleDeleteCancel}
        title="Delete Alert"
      >
        <div className="p-6">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the alert "{alert.name}"? This action cannot be undone.
          </p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDeleteCancel}
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <span className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  Deleting...
                </span>
              ) : 'Delete Alert'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AlertDetail;
