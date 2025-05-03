// AgencyDashboard.jsx
// This component serves as the main dashboard for agency users, allowing them to manage data integration and API keys.
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../common/Card';
import Button from '../common/Button';
import DataIntegrationForm from './DataIntegrationForm';
import APIKeyManager from './APIKeyManager';

const AgencyDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Agency Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Data Integration</h3>
            <p className="text-gray-600 mb-4">Manage your crime data imports</p>
            <Button onClick={() => setActiveTab('integration')}>
              Import Data
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">API Access</h3>
            <p className="text-gray-600 mb-4">Manage your API keys and access</p>
            <Button onClick={() => setActiveTab('api')}>
              Manage API Keys
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Reports</h3>
            <p className="text-gray-600 mb-4">View data integration history</p>
            <Button onClick={() => setActiveTab('reports')}>
              View Reports
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        {activeTab === 'integration' && <DataIntegrationForm />}
        {activeTab === 'api' && <APIKeyManager />}
      </div>
    </div>
  );
};

export default AgencyDashboard;