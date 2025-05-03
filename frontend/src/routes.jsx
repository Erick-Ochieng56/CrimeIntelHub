import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Pages
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import SearchPage from './pages/SearchPage';
import UserProfilePage from './pages/UserProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Agency pages
import AgencyRegistrationPage from './pages/AgencyRegistrationPage';
import AgencyRegistrationSuccessPage from './pages/AgencyRegistrationSuccessPage';
import AgencyLoginPage from './pages/AgencyLoginPage';
import AgencyDashboardPage from './pages/AgencyDashboardPage';

// Admin pages
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// Auth components
import Login from './components/user/Login';
import Register from './components/user/Register';
import PasswordReset from './components/user/PasswordReset';

// Auth guard component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Agency guard component
const AgencyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/agency/login" state={{ from: location }} replace />;
  }
  
  if (user?.user_type !== 'agency') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Admin guard component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useContext(AuthContext);
  const location = useLocation();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  
  if (user?.user_type !== 'admin' && !user?.is_staff) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const routes = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/map',
    element: <MapPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/alerts',
    element: (
      <ProtectedRoute>
        <AlertsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    element: (
      <ProtectedRoute>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/search',
    element: <SearchPage />,
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <UserProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/reset-password',
    element: <PasswordReset />,
  },
  
  // Agency routes
  {
    path: '/agencies/register',
    element: <AgencyRegistrationPage />,
  },
  {
    path: '/agency/login',
    element: <AgencyLoginPage />,
  },
  {
    path: '/agency/registration-success',
    element: <AgencyRegistrationSuccessPage />,
  },
  {
    path: '/agency/dashboard',
    element: (
      <AgencyRoute>
        <AgencyDashboardPage />
      </AgencyRoute>
    ),
  },
  {
    path: '/agency/data',
    element: (
      <AgencyRoute>
        <AgencyDashboardPage />
      </AgencyRoute>
    ),
  },
  {
    path: '/agency/analytics',
    element: (
      <AgencyRoute>
        <AnalyticsPage />
      </AgencyRoute>
    ),
  },
  
  // Admin routes
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin/dashboard',
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/agencies',
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/system',
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  
  {
    path: '*',
    element: <NotFoundPage />,
  }
];

export default routes;