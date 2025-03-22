import React, { useState } from 'react';
import PredictiveAnalysis from '../components/analytics/PredictiveAnalysis';
import HeatmapView from '../components/analytics/HeatmapView';
import TimeSeriesAnalysis from '../components/analytics/TimeSeriesAnalysis';
import Card from '../components/common/Card';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('predictive');
  
  const tabs = [
    { id: 'predictive', label: 'Predictive Analysis', icon: PredictiveIcon },
    { id: 'heatmap', label: 'Heatmap Analysis', icon: HeatmapIcon },
    { id: 'timeseries', label: 'Time Series Analysis', icon: TimeSeriesIcon },
  ];
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Crime Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Explore and analyze crime data through various analytical tools and visualizations.
        </p>
      </div>
      
      <div className="mb-6">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">Select an analytics view</label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                } px-3 py-2 font-medium text-sm rounded-md flex items-center`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <tab.icon
                  className={`${
                    activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'
                  } mr-2 h-5 w-5`}
                  aria-hidden="true"
                />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {activeTab === 'predictive' && <PredictiveAnalysis />}
      {activeTab === 'heatmap' && <HeatmapView />}
      {activeTab === 'timeseries' && <TimeSeriesAnalysis />}
      
      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">About Crime Analytics</h2>
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-4">
              Our analytics tools provide valuable insights into crime patterns and trends:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Predictive Analysis:</strong> Uses machine learning algorithms to forecast crime hotspots based on historical data.
              </li>
              <li>
                <strong>Heatmap Analysis:</strong> Visualizes crime density across geographic areas to identify high-concentration zones.
              </li>
              <li>
                <strong>Time Series Analysis:</strong> Examines crime trends over time to identify patterns, seasonality, and long-term changes.
              </li>
            </ul>
            <p className="mt-4">
              These tools can assist law enforcement agencies, community organizations, and residents in making informed decisions about resource allocation and safety measures.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Tab Icons
function PredictiveIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}

function HeatmapIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function TimeSeriesIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
      />
    </svg>
  );
}

export default AnalyticsPage;
