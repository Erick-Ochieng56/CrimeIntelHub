// File: frontend/src/components/agency/APIKeyManager.jsx
// APIKeyManager.jsx
// This component manages the API keys for the agency, allowing users to generate new keys and manage existing ones.
import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

const APIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');

  useEffect(() => {
    // TODO: Fetch existing API keys
    console.log('Fetching API keys');
  }, []);

  const handleGenerateKey = async () => {
    // TODO: Implement API key generation
    console.log('Generating new API key:', newKeyName);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">API Key Management</h3>
      
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Enter key name"
            className="flex-1 border rounded p-2"
          />
          <Button onClick={handleGenerateKey}>Generate New Key</Button>
        </div>
      </div>

      <div className="space-y-4">
        {apiKeys.map((key) => (
          <div key={key.id} className="border rounded p-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">{key.name}</h4>
                <p className="text-sm text-gray-500">Created: {key.created_at}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-sm ${key.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {key.is_active ? 'Active' : 'Inactive'}
                </span>
                <Button
                  onClick={() => console.log('Toggle key:', key.id)}
                  className="text-sm"
                >
                  {key.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default APIKeyManager;
