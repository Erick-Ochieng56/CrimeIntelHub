import React, { useState } from 'react';
import { saveReportTemplate, getReportTemplates, deleteReportTemplate } from '../../services/reportService';
import Card from '../common/Card';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const ReportTemplate = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, templateId: null });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    crimeTypes: [],
    radius: 5,
    includeCharts: true,
    includeMap: true,
    defaultFormat: 'pdf'
  });
  
  const crimeTypes = [
    { value: 'THEFT', label: 'Theft' },
    { value: 'ASSAULT', label: 'Assault' },
    { value: 'BURGLARY', label: 'Burglary' },
    { value: 'ROBBERY', label: 'Robbery' },
    { value: 'VANDALISM', label: 'Vandalism' },
    { value: 'DRUG', label: 'Drug Offenses' },
    { value: 'FRAUD', label: 'Fraud' },
    { value: 'OTHER', label: 'Other' },
  ];
  
  const reportFormats = [
    { value: 'pdf', label: 'PDF Document' },
    { value: 'excel', label: 'Excel Spreadsheet' },
    { value: 'csv', label: 'CSV File' },
    { value: 'json', label: 'JSON Data' },
  ];
  
  // Fetch templates on component mount
  React.useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReportTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching report templates:', err);
      setError('Failed to load report templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewTemplate({
      ...newTemplate,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleCrimeTypeToggle = (type) => {
    if (newTemplate.crimeTypes.includes(type)) {
      setNewTemplate({
        ...newTemplate,
        crimeTypes: newTemplate.crimeTypes.filter(t => t !== type)
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        crimeTypes: [...newTemplate.crimeTypes, type]
      });
    }
  };
  
  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      
      // Validate form
      if (!newTemplate.name.trim()) {
        setError('Template name is required');
        setLoading(false);
        return;
      }
      
      const savedTemplate = await saveReportTemplate(newTemplate);
      
      // Add the new template to our state
      setTemplates([...templates, savedTemplate]);
      
      // Reset form and close modal
      setNewTemplate({
        name: '',
        description: '',
        crimeTypes: [],
        radius: 5,
        includeCharts: true,
        includeMap: true,
        defaultFormat: 'pdf'
      });
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.message || 'Failed to save template. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEditTemplate = (template) => {
    setSelectedTemplate(template);
    setNewTemplate({
      ...template
    });
    setShowCreateModal(true);
  };
  
  const handleDeleteClick = (templateId) => {
    setDeleteConfirmation({ show: true, templateId });
  };
  
  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await deleteReportTemplate(deleteConfirmation.templateId);
      
      // Remove deleted template from state
      setTemplates(templates.filter(template => template.id !== deleteConfirmation.templateId));
      
      setDeleteConfirmation({ show: false, templateId: null });
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage templates for frequently generated reports.
          </p>
        </div>
        
        <button 
          onClick={() => {
            setSelectedTemplate(null);
            setNewTemplate({
              name: '',
              description: '',
              crimeTypes: [],
              radius: 5,
              includeCharts: true,
              includeMap: true,
              defaultFormat: 'pdf'
            });
            setShowCreateModal(true);
          }} 
          className="btn btn-primary"
        >
          <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Template
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <div className="p-6">
          {loading && !templates.length ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" />
            </div>
          ) : templates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crime Types
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Radius
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {template.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {template.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {template.crimeTypes.length > 0 ? (
                            template.crimeTypes.map((type) => (
                              <span
                                key={type}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">All types</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.defaultFormat.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.radius} km
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(template.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first report template.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary"
                >
                  Create Template
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Create/Edit Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={selectedTemplate ? 'Edit Template' : 'Create Template'}
      >
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="template-name" className="block text-sm font-medium text-gray-700">
                Template Name *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="template-name"
                  name="name"
                  value={newTemplate.name}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="e.g., Monthly Crime Summary"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="template-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <div className="mt-1">
                <textarea
                  id="template-description"
                  name="description"
                  value={newTemplate.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Describe the purpose of this template"
                />
              </div>
            </div>
            
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700">
                  Crime Types
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                  {crimeTypes.map((type) => (
                    <div key={type.value} className="flex items-center">
                      <input
                        id={`template-crime-${type.value}`}
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={newTemplate.crimeTypes.includes(type.value)}
                        onChange={() => handleCrimeTypeToggle(type.value)}
                      />
                      <label htmlFor={`template-crime-${type.value}`} className="ml-2 block text-sm text-gray-700">
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Leave all unchecked to include all crime types
                </p>
              </fieldset>
            </div>
            
            <div>
              <label htmlFor="template-radius" className="block text-sm font-medium text-gray-700">
                Default Radius: {newTemplate.radius} km
              </label>
              <div className="mt-1">
                <input
                  type="range"
                  id="template-radius"
                  name="radius"
                  min="1"
                  max="50"
                  step="1"
                  value={newTemplate.radius}
                  onChange={handleInputChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="template-format" className="block text-sm font-medium text-gray-700">
                Default Format
              </label>
              <div className="mt-1">
                <select
                  id="template-format"
                  name="defaultFormat"
                  value={newTemplate.defaultFormat}
                  onChange={handleInputChange}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  {reportFormats.map(format => (
                    <option key={format.value} value={format.value}>{format.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <fieldset className="space-y-2">
                <legend className="block text-sm font-medium text-gray-700">
                  Report Options
                </legend>
                <div className="flex items-center">
                  <input
                    id="template-charts"
                    name="includeCharts"
                    type="checkbox"
                    checked={newTemplate.includeCharts}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="template-charts" className="ml-2 block text-sm text-gray-700">
                    Include charts and graphs
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="template-map"
                    name="includeMap"
                    type="checkbox"
                    checked={newTemplate.includeMap}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="template-map" className="ml-2 block text-sm text-gray-700">
                    Include map visualization
                  </label>
                </div>
              </fieldset>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTemplate}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  Saving...
                </span>
              ) : selectedTemplate ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmation.show}
        onClose={() => setDeleteConfirmation({ show: false, templateId: null })}
        title="Delete Template"
      >
        <div className="p-6">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteConfirmation({ show: false, templateId: null })}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader size="sm" className="mr-2" />
                  Deleting...
                </span>
              ) : 'Delete Template'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportTemplate;
