import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';

const NotFoundPage = () => {
  return (
    <div className="max-w-md mx-auto my-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <div className="p-6 flex flex-col items-center">
          <div className="flex-shrink-0 flex justify-center">
            <svg
              className="h-24 w-24 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <div className="mt-6 text-center">
            <h3 className="text-xl font-medium text-gray-900">Page Not Found</h3>
            <p className="mt-2 text-base text-gray-600">
              Sorry, we couldn't find the page you're looking for.
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go back
              </button>
            </div>
          </div>
          
          <div className="mt-8 border-t border-gray-200 pt-6 w-full">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
              You might be looking for:
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/map" className="text-blue-600 hover:text-blue-800 font-medium">
                  Crime Map
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-blue-600 hover:text-blue-800 font-medium">
                  Crime Search
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-medium">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/reports" className="text-blue-600 hover:text-blue-800 font-medium">
                  Crime Reports
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NotFoundPage;
