import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const AgencyRegistrationPage = () => {
  const navigate = useNavigate();
  const { registerAgency } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    agency_name: '',
    agency_type: 'police',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });

  const agencyTypes = [
    { value: 'police', label: 'Police Department' },
    { value: 'sheriff', label: 'Sheriff Department' },
    { value: 'state', label: 'State Law Enforcement' },
    { value: 'federal', label: 'Federal Agency' },
    { value: 'campus', label: 'Campus Police' },
    { value: 'transit', label: 'Transit Police' },
    { value: 'other', label: 'Other Law Enforcement' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await registerAgency(formData);
      toast.success('Agency registration submitted successfully! Your account is pending approval.');
      navigate('/agency/registration-success');
    } catch (error) {
      if (error.response && error.response.data) {
        const errors = error.response.data;
        Object.keys(errors).forEach(key => {
          toast.error(`${key}: ${errors[key]}`);
        });
      } else {
        toast.error('Registration failed. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Agency Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Register your agency to contribute crime data and access enhanced features
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="bg-blue-50 p-4 rounded-md mb-6">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="text-lg font-medium text-green-800 mb-2">Agency Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="agency_name" className="block text-sm font-medium text-gray-700">
                  Agency Name
                </label>
                <input
                  id="agency_name"
                  name="agency_name"
                  type="text"
                  required
                  value={formData.agency_name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="agency_type" className="block text-sm font-medium text-gray-700">
                  Agency Type
                </label>
                <select
                  id="agency_type"
                  name="agency_type"
                  required
                  value={formData.agency_type}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {agencyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  id="zip_code"
                  name="zip_code"
                  type="text"
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="py-4">
            <p className="text-gray-600 text-sm">
              By registering your agency, you agree to our terms of service and data sharing policy.
              Your registration will be reviewed by our team before approval.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgencyRegistrationPage;