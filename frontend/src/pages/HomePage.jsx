import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';

const HomePage = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-12 sm:px-12 sm:py-16 lg:py-20 xl:py-24 text-white">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
            Crime Analysis & Mapping Platform
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-blue-100 max-w-3xl">
            Access comprehensive crime data, analytics, and mapping tools to understand 
            crime patterns in your area and make data-driven decisions.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/map" className="btn btn-primary bg-white text-blue-600 hover:bg-blue-50 text-base sm:text-lg py-3 px-6">
              Explore Crime Map
            </Link>
            <Link to="/search" className="btn btn-secondary bg-blue-700 text-white border-blue-500 hover:bg-blue-800 text-base sm:text-lg py-3 px-6">
              Search Crime Data
            </Link>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900">Key Features</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Interactive Crime Map</h3>
              <p className="mt-2 text-base text-gray-600">
                Visualize crime data geographically with our interactive map that lets you filter by crime type, date range, and location.
              </p>
              <div className="mt-4">
                <Link to="/map" className="text-blue-600 hover:text-blue-800 font-medium">
                  View Map →
                </Link>
              </div>
            </div>
          </Card>
          
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Advanced Analytics</h3>
              <p className="mt-2 text-base text-gray-600">
                Utilize predictive analysis tools, heatmaps, and time-series analysis to identify patterns and trends in crime data.
              </p>
              <div className="mt-4">
                <Link to="/analytics" className="text-blue-600 hover:text-blue-800 font-medium">
                  View Analytics →
                </Link>
              </div>
            </div>
          </Card>
          
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Custom Crime Alerts</h3>
              <p className="mt-2 text-base text-gray-600">
                Set up customized alerts for specific crime types, locations, and search distances to stay informed about incidents in your area.
              </p>
              <div className="mt-4">
                <Link to="/alerts" className="text-blue-600 hover:text-blue-800 font-medium">
                  Set Up Alerts →
                </Link>
              </div>
            </div>
          </Card>
          
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Comprehensive Reports</h3>
              <p className="mt-2 text-base text-gray-600">
                Generate detailed crime reports for specific locations and time periods that can be downloaded in multiple formats.
              </p>
              <div className="mt-4">
                <Link to="/reports" className="text-blue-600 hover:text-blue-800 font-medium">
                  Generate Reports →
                </Link>
              </div>
            </div>
          </Card>
          
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Advanced Search</h3>
              <p className="mt-2 text-base text-gray-600">
                Search for crimes based on location, address, crime type, date range, and search radius with our powerful search capabilities.
              </p>
              <div className="mt-4">
                <Link to="/search" className="text-blue-600 hover:text-blue-800 font-medium">
                  Search Crime Data →
                </Link>
              </div>
            </div>
          </Card>
          
          <Card padding="p-6">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Data Privacy</h3>
              <p className="mt-2 text-base text-gray-600">
                We prioritize privacy by generalizing all address information by blocks to help ensure individual privacy while providing valuable data.
              </p>
              <div className="mt-4">
                <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
                  Learn More →
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Data Sources Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900">Data Sources</h2>
        <p className="mt-4 text-lg text-gray-600 max-w-3xl">
          Our system integrates crime data directly from law enforcement agencies. The information is regularly extracted from each department's records system to ensure you're viewing the most current data available.
        </p>
        
        <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agency Partners</h3>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {/* These would be agency logos in a real implementation */}
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 1
            </div>
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 2
            </div>
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 3
            </div>
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 4
            </div>
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 5
            </div>
            <div className="h-12 bg-white rounded shadow-sm flex items-center justify-center text-gray-400">
              Agency 6
            </div>
          </div>
        </div>
      </div>
      
      {/* Call to Action */}
      <div className="mt-16 bg-blue-700 rounded-lg shadow-xl overflow-hidden">
        <div className="px-6 py-12 sm:px-12 lg:py-16 lg:px-16 text-white">
          <div className="lg:self-center lg:flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                <span className="block">Ready to get started?</span>
                <span className="block text-blue-200">Create an account to access all features.</span>
              </h2>
              <p className="mt-4 text-lg leading-6 text-blue-200">
                Sign up for free to unlock custom alerts, report generation, and more.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 lg:ml-8 flex flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link to="/register" className="btn bg-white text-blue-600 hover:bg-blue-50 text-base font-medium py-3 px-6">
                  Sign up for free
                </Link>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <Link to="/login" className="btn bg-blue-800 text-white hover:bg-blue-900 text-base font-medium py-3 px-6">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
