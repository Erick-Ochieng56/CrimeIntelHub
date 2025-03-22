import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200 lg:border-none">
          <div className="flex items-center">
            <Link to="/">
              <span className="sr-only">Crime Analysis System</span>
              <div className="flex items-center">
                <svg className="h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="ml-2 text-xl font-bold text-gray-900">CrimeTrack</span>
              </div>
            </Link>
            <div className="hidden ml-10 space-x-8 lg:block">
              <Link to="/map" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Map
              </Link>
              <Link to="/dashboard" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Dashboard
              </Link>
              <Link to="/analytics" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Analytics
              </Link>
              <Link to="/search" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Search
              </Link>
              <Link to="/reports" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Reports
              </Link>
              <Link to="/alerts" className="text-base font-medium text-gray-700 hover:text-gray-900">
                Alerts
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
                  <svg className="h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="ml-1">{user.name || user.email}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary text-sm"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="btn btn-secondary text-sm">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary text-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="pt-2 pb-3 space-y-1">
            <Link to="/map" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Map
            </Link>
            <Link to="/dashboard" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Dashboard
            </Link>
            <Link to="/analytics" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Analytics
            </Link>
            <Link to="/search" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Search
            </Link>
            <Link to="/reports" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Reports
            </Link>
            <Link to="/alerts" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">
              Alerts
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            {user ? (
              <div>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium leading-none text-white">
                        {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">{user.name || 'User'}</div>
                    <div className="text-sm font-medium text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Link to="/profile" className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    Your Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 px-4">
                <Link to="/login" className="btn btn-secondary w-full">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary w-full">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
