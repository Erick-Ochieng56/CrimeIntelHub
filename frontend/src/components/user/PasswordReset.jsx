import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Card from '../common/Card';
import Loader from '../common/Loader';
import { requestPasswordReset, confirmPasswordReset } from '../../services/auth';
import { validateEmail, validatePassword } from '../../utils/validators';

const PasswordReset = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [stage, setStage] = useState('request'); // 'request' or 'reset'
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for token in query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    const emailParam = params.get('email');
    
    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(emailParam);
      setStage('reset');
    }
  }, [location]);
  
  const validateRequestForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateResetForm = () => {
    const newErrors = {};
    
    if (!token) {
      newErrors.token = 'Reset token is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters and include a number, uppercase letter, lowercase letter, and special character';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateRequestForm()) {
      return;
    }
    
    setIsRequestSubmitting(true);
    setErrors({});
    setSuccess('');
    
    try {
      await requestPasswordReset(email);
      setSuccess(
        'If an account exists with this email, you will receive password reset instructions. Please check your email.'
      );
    } catch (error) {
      console.error('Password reset request error:', error);
      setErrors({ 
        general: error.message || 'An error occurred while requesting password reset. Please try again.' 
      });
    } finally {
      setIsRequestSubmitting(false);
    }
  };
  
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateResetForm()) {
      return;
    }
    
    setIsResetSubmitting(true);
    setErrors({});
    setSuccess('');
    
    try {
      await confirmPasswordReset(token, email, password);
      setSuccess('Your password has been successfully reset.');
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate('/login', { state: { passwordReset: true } });
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ 
        general: error.message || 'An error occurred while resetting your password. The token may be invalid or expired.' 
      });
    } finally {
      setIsResetSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {stage === 'request' ? 'Reset your password' : 'Create new password'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {stage === 'request' ? (
              <>
                Or{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  go back to sign in
                </Link>
              </>
            ) : (
              'Enter your new password below'
            )}
          </p>
        </div>
        
        <Card>
          <div className="p-6">
            {errors.general && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      {errors.general}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      {success}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {stage === 'request' ? (
              // Password Reset Request Form
              <form className="space-y-6" onSubmit={handleRequestSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isRequestSubmitting || success}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (isRequestSubmitting || success) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isRequestSubmitting ? (
                      <span className="flex items-center">
                        <Loader size="sm" className="mr-2" />
                        Sending email...
                      </span>
                    ) : 'Send reset instructions'}
                  </button>
                </div>
              </form>
            ) : (
              // New Password Form
              <form className="space-y-6" onSubmit={handleResetSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      disabled
                    />
                  </div>
                </div>
                
                <div className="hidden">
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700">
                    Reset Token
                  </label>
                  <div className="mt-1">
                    <input
                      id="token"
                      name="token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.token ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.token && (
                      <p className="mt-2 text-sm text-red-600">{errors.token}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.password && (
                      <p className="mt-2 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isResetSubmitting || success}
                    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      (isResetSubmitting || success) ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isResetSubmitting ? (
                      <span className="flex items-center">
                        <Loader size="sm" className="mr-2" />
                        Resetting password...
                      </span>
                    ) : 'Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PasswordReset;
