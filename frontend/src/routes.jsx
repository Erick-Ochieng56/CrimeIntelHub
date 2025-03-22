import React from 'react';
import { Navigate } from 'react-router-dom';

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

// Auth components
import Login from './components/user/Login';
import Register from './components/user/Register';
import PasswordReset from './components/user/PasswordReset';

// Auth guard component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
  {
    path: '*',
    element: <NotFoundPage />,
  }
];

export default routes;
