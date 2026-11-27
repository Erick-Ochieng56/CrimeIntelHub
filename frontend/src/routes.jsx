import React, { lazy, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Loaded up front: the landing page, login and 404
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import Login from './components/user/Login';

// Pages. Most are lazy-loaded so each route downloads its own chunk;
// App.jsx wraps the routes in <Suspense>.
const MapPage = lazy(() => import('./pages/MapPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));

// Agency pages
const AgencyRegistrationPage = lazy(() => import('./pages/agency/AgencyRegistrationPage'));
const AgencyRegistrationSuccessPage = lazy(() => import('./pages/agency/AgencyRegistrationSuccessPage'));
const AgencyLoginPage = lazy(() => import('./pages/agency/AgencyLoginPage'));
const AgencyDashboardPage = lazy(() => import('./pages/agency/AgencyDashboardPage'));

// ETL page
const ETLPage = lazy(() => import('./pages/ETLPage'));

// Admin pages
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));

// Auth components
const Register = lazy(() => import('./components/user/Register'));
const PasswordReset = lazy(() => import('./components/user/PasswordReset'));

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
    path: '/analytics/*',
    element: (
      <ProtectedRoute>
        <AnalyticsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/alerts/*',
    element: (
      <ProtectedRoute>
        <AlertsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports/*',
    element: (
      <ProtectedRoute>
        <ReportsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/search/*',
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
        <ETLPage />
      </AgencyRoute>
    ),
  },
  {
    path: '/agency/analytics',
    element: (
      <AgencyRoute>
        <AgencyDashboardPage />
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
    path: '/admin/etl',
    element: (
      <AdminRoute>
        <ETLPage />
      </AdminRoute>
    ),
  },

  {
    path: '*',
    element: <NotFoundPage />,
  }
];

export default routes;