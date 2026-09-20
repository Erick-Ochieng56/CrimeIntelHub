// DataIntegrationForm.jsx
import React, { useState } from 'react';
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

const DataIntegrationForm = () => {
  const [formData, setFormData] = useState({
    file: null,
    startDate: '',
    endDate: '',
    method: 'file_upload',
  });
  const [uploading, setUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const agencyId = resolveAgencyId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agencyId) {
      toast.error('No agency associated with this account');
      return;
    }
    if (!formData.file) {
      toast.error('Choose a file to upload');
      return;
    }

    const body = new FormData();
    body.append('file', formData.file);
    body.append('method', formData.method || 'file_upload');
    if (formData.startDate) body.append('start_date', formData.startDate);
    if (formData.endDate) body.append('end_date', formData.endDate);

    setUploading(true);
    setLastResult(null);
    try {
      const response = await api.post(`/agencies/agencies/${agencyId}/upload_data/`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setLastResult(response.data);
      toast.success(
        `Imported ${response.data.record_count ?? 0} records`
      );
      setFormData((prev) => ({ ...prev, file: null }));
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.formattedMessage ||
        'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  if (!agencyId) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Data Integration</h3>
        <p className="text-sm text-gray-600">
          Sign in as an agency user to upload crime data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Data Integration</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload CSV, Excel, or JSON crime records. Supported columns include
        category/crime_type, case_number, description, date, latitude, longitude.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={(e) =>
              setFormData({ ...formData, file: e.target.files?.[0] || null })
            }
            className="w-full border rounded p-2"
          />
          {formData.file && (
            <p className="text-xs text-gray-500 mt-1">{formData.file.name}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload Data'}
        </Button>
      </form>
      {lastResult && (
        <div className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3">
          Import #{lastResult.import_id}: {lastResult.record_count} records
          ({lastResult.status})
        </div>
      )}
    </div>
  );
};

export default DataIntegrationForm;
