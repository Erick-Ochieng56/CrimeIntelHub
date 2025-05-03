// AgenLogin.jsx
// This component serves as the login page for agency users, allowing them to authenticate and access their dashboard.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import { useAuth } from '../../hooks/useAuth';

const AgencyLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(formData.email, formData.password, 'agency');
      navigate('/agency/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card>
        <div className="p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6">Agency Login</h2>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Login
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AgencyLogin;