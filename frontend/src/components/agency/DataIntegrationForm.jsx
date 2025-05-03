//DataIntegrationForm.jsx
// This component handles the data integration form for agencies, allowing them to upload files and set date ranges for data import.
import React, { useState } from 'react';
import Button from '../common/Button';

const DataIntegrationForm = () => {
  const [formData, setFormData] = useState({
    file: null,
    startDate: '',
    endDate: '',
    method: 'file_upload'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: Implement data upload logic
    console.log('Uploading data:', formData);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Data Integration</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload File
          </label>
          <input
            type="file"
            onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
            className="w-full border rounded p-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
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
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <Button type="submit">Upload Data</Button>
      </form>
    </div>
  );
};

export default DataIntegrationForm;
