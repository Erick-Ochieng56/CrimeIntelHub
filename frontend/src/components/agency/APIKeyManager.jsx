// File: frontend/src/components/agency/APIKeyManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import Button from '../common/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';

const resolveAgencyId = () => {
  try {
    const raw = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.agency_id) return user.agency_id;
      if (user?.agency?.id) return user.agency.id;
    }
  } catch {
    /* ignore */
  }
  return localStorage.getItem('agency_id') || null;
};

const APIKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const agencyId = resolveAgencyId();

  const fetchKeys = useCallback(async () => {
    if (!agencyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/agencies/agencies/${agencyId}/api_keys/`);
      const data = response.data;
      setApiKeys(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error(error.formattedMessage || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleGenerateKey = async () => {
    if (!agencyId) {
      toast.error('No agency associated with this account');
      return;
    }
    if (!newKeyName.trim()) {
      toast.error('Enter a name for the API key');
      return;
    }
    setGenerating(true);
    try {
      const response = await api.post(`/agencies/agencies/${agencyId}/generate_api_key/`, {
        name: newKeyName.trim(),
      });
      setCreatedKey(response.data);
      setNewKeyName('');
      toast.success('API key generated — copy it now; it will not be shown again in full.');
      await fetchKeys();
    } catch (error) {
      toast.error(error.formattedMessage || 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (key) => {
    if (!agencyId) return;
    try {
      const response = await api.post(`/agencies/agencies/${agencyId}/api_keys/${key.id}/toggle/`);
      setApiKeys((prev) =>
        prev.map((k) => (k.id === key.id ? { ...k, ...response.data } : k))
      );
      toast.success(response.data.is_active ? 'Key activated' : 'Key deactivated');
    } catch (error) {
      toast.error(error.formattedMessage || 'Failed to update API key');
    }
  };

  if (!agencyId) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">API Key Management</h3>
        <p className="text-sm text-gray-600">
          Sign in as an agency user to manage API keys.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">API Key Management</h3>

      {createdKey?.key && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          <p className="font-medium text-amber-900 mb-1">New key — copy now:</p>
          <code className="break-all text-amber-800">{createdKey.key}</code>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Enter key name"
            className="flex-1 border rounded p-2"
          />
          <Button onClick={handleGenerateKey} disabled={generating}>
            {generating ? 'Generating…' : 'Generate New Key'}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading keys…</p>
      ) : apiKeys.length === 0 ? (
        <p className="text-sm text-gray-500">No API keys yet.</p>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div key={key.id} className="border rounded p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">{key.name}</h4>
                  <p className="text-sm text-gray-500">
                    Created:{' '}
                    {key.created_at
                      ? new Date(key.created_at).toLocaleString()
                      : '—'}
                  </p>
                  {key.key && (
                    <p className="text-xs text-gray-400 font-mono mt-1">
                      {String(key.key).slice(0, 8)}…
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      key.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {key.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <Button onClick={() => handleToggle(key)} className="text-sm">
                    {key.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default APIKeyManager;
