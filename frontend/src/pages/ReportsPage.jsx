import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ReportGenerator from '../components/reports/ReportGenerator';
import ReportTemplate from '../components/reports/ReportTemplate';
import ReportHistory from '../components/reports/ReportHistory';
import Card from '../components/common/Card';

const ReportsPage = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(getCurrentTab(location.pathname));
  
  function getCurrentTab(path) {
    if (path.includes('/templates')) return 'templates';
    if (path.includes('/history')) return 'history';
    return 'generate';
  }
  
  const tabs = [
    { id: 'generate', label: 'Generate Report', path: '/reports' },
    { id: 'templates', label: 'Report Templates', path: '/reports/templates' },
    { id: 'history', label: 'Report History', path: '/reports/history' },
  ];
  
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Crime Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate, manage, and download detailed crime reports for your selected areas.
        </p>
      </div>
      
      <div className="mb-6">
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">Select a tab</label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            defaultValue={tabs.find(tab => tab.id === activeTab)?.id}
            onChange={(e) => {
              const selectedTab = tabs.find(tab => tab.id === e.target.value);
              if (selectedTab) {
                setActiveTab(selectedTab.id);
              }
            }}
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      
      <Routes>
        <Route path="/" element={<ReportGenerator />} />
        <Route path="/templates" element={<ReportTemplate />} />
        <Route path="/history" element={<ReportHistory />} />
      </Routes>
      
      <Card className="mt-8">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">About Crime Reports</h2>
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-4">
              Crime reports provide detailed information about crime incidents in a specific area over a selected time period. These reports can be used for:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Community safety planning and awareness</li>
              <li>Property valuation and real estate assessments</li>
              <li>Local government and law enforcement resource allocation</li>
              <li>Research and analysis by academics and policy makers</li>
              <li>Business security planning and risk assessment</li>
            </ul>
            <p className="mt-4">
              All reports provide anonymized data to protect privacy. Address information is generalized by blocks to ensure individual locations are not identifiable.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ReportsPage;
