import React, { useState, useEffect } from 'react';
import { useLocation, Route, Routes, Navigate } from 'react-router-dom';
import AlertList from '../components/alerts/AlertList';
import AlertForm from '../components/alerts/AlertForm';
import AlertDetail from '../components/alerts/AlertDetail';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { getAlert } from '../services/alertService';

const AlertsPage = () => {
  const location = useLocation();
  
  // Check for success message from navigation
  const [successMessage, setSuccessMessage] = useState('');
  
  useEffect(() => {
    if (location.state?.success) {
      setSuccessMessage(location.state.success);
      
      // Clear success message after 3 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {successMessage && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <Routes>
        <Route path="/" element={<AlertList />} />
        <Route path="/new" element={<AlertForm />} />
        <Route path="/:id" element={<AlertDetailWrapper />} />
        <Route path="/:id/edit" element={<AlertEditWrapper />} />
      </Routes>
    </div>
  );
};

// Wrapper to fetch alert data for detail view
const AlertDetailWrapper = () => {
  return <AlertRoutedWrapper component={AlertDetail} />;
};

// Wrapper to fetch alert data for edit form
const AlertEditWrapper = () => {
  return <AlertRoutedWrapper component={AlertForm} />;
};

// Common wrapper to handle data fetching for both detail and edit
const AlertRoutedWrapper = ({ component: Component }) => {
  const location = useLocation();
  const alertId = location.pathname.split('/')[2];
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchAlertData = async () => {
      try {
        setLoading(true);
        const data = await getAlert(alertId);
        setAlert(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching alert:', err);
        setError('Failed to load alert data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlertData();
  }, [alertId]);
  
  if (loading) {
    return (
      <Card>
        <div className="p-6 flex justify-center">
          <Loader size="lg" />
        </div>
      </Card>
    );
  }
  
  if (error) {
    return (
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
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  if (!alert) {
    return <Navigate to="/alerts" replace />;
  }
  
  return <Component existingAlert={alert} />;
};

export default AlertsPage;
