import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Loader from '../common/Loader';
import Modal from '../common/Modal';
import { useAuth } from '../../hooks/useAuth';
import { updateUserProfile, changePassword } from '../../services/auth';
import { validatePassword } from '../../utils/validators';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    organization: '',
    jobTitle: '',
    receiveAlerts: false,
    alertTypes: {
      email: true,
      sms: false,
      push: true
    }
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  
  // Load user data into form
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        organization: user.organization || '',
        jobTitle: user.job_title || '',
        receiveAlerts: user.receive_alerts || false,
        alertTypes: {
          email: user.alert_preferences?.email || true,
          sms: user.alert_preferences?.sms || false,
          push: user.alert_preferences?.push || true
        }
      });
    }
  }, [user]);
  
  const handleProfileChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('alertTypes.')) {
      const alertType = name.split('.')[1];
      setProfileData({
        ...profileData,
        alertTypes: {
          ...profileData.alertTypes,
          [alertType]: checked
        }
      });
    } else {
      setProfileData({
        ...profileData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({
      ...passwordData,
      [name]: value
    });
  };
  
  const validateProfileForm = () => {
    const errors = {};
    
    if (!profileData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!profileData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (profileData.phone && !/^\+?[1-9]\d{1,14}$/.test(profileData.phone)) {
      errors.phone = 'Phone number is invalid';
    }
    
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const validatePasswordForm = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (!validatePassword(passwordData.newPassword)) {
      errors.newPassword = 'Password must be at least 8 characters and include a number, uppercase letter, lowercase letter, and special character';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateProfileForm()) {
      return;
    }
    
    setIsProfileSubmitting(true);
    setSuccessMessage('');
    
    try {
      const profilePayload = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        organization: profileData.organization,
        job_title: profileData.jobTitle,
        receive_alerts: profileData.receiveAlerts,
        alert_preferences: profileData.alertTypes
      };
      
      await updateUserProfile(profilePayload);
      await refreshUser();
      setSuccessMessage('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setIsProfileSubmitting(false);
    }
  };
  
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setIsPasswordSubmitting(true);
    
    try {
      await changePassword(
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      // Clear form and close modal
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
      setSuccessMessage('Password changed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordErrors({ general: error.message || 'Failed to change password. Please try again.' });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader size="lg" />
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="btn btn-secondary"
        >
          Change Password
        </button>
      </div>
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h2>
          
          {profileErrors.general && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{profileErrors.general}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      profileErrors.firstName ? 'border-red-300' : ''
                    }`}
                  />
                  {profileErrors.firstName && (
                    <p className="mt-2 text-sm text-red-600">{profileErrors.firstName}</p>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      profileErrors.lastName ? 'border-red-300' : ''
                    }`}
                  />
                  {profileErrors.lastName && (
                    <p className="mt-2 text-sm text-red-600">{profileErrors.lastName}</p>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profileData.email}
                    disabled
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-50"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Email address cannot be changed
                  </p>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone number (optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      profileErrors.phone ? 'border-red-300' : ''
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  {profileErrors.phone && (
                    <p className="mt-2 text-sm text-red-600">{profileErrors.phone}</p>
                  )}
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                  Organization (optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="organization"
                    name="organization"
                    value={profileData.organization}
                    onChange={handleProfileChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Company or agency name"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                  Job title (optional)
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="jobTitle"
                    name="jobTitle"
                    value={profileData.jobTitle}
                    onChange={handleProfileChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="e.g., Police Officer, Analyst, etc."
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="receiveAlerts"
                      name="receiveAlerts"
                      type="checkbox"
                      checked={profileData.receiveAlerts}
                      onChange={handleProfileChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="receiveAlerts" className="font-medium text-gray-700">
                      Receive crime alerts
                    </label>
                    <p className="text-gray-500">Get notified about crimes that match your alert criteria</p>
                  </div>
                </div>
              </div>
              
              {profileData.receiveAlerts && (
                <div className="sm:col-span-6 ml-7">
                  <p className="block text-sm font-medium text-gray-700 mb-2">
                    Alert delivery methods
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="alertEmail"
                          name="alertTypes.email"
                          type="checkbox"
                          checked={profileData.alertTypes.email}
                          onChange={handleProfileChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="alertEmail" className="font-medium text-gray-700">
                          Email
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="alertSms"
                          name="alertTypes.sms"
                          type="checkbox"
                          checked={profileData.alertTypes.sms}
                          onChange={handleProfileChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          disabled={!profileData.phone}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="alertSms" className={`font-medium ${!profileData.phone ? 'text-gray-400' : 'text-gray-700'}`}>
                          SMS text message
                        </label>
                        {!profileData.phone && (
                          <p className="text-gray-500">Add a phone number to enable SMS alerts</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="alertPush"
                          name="alertTypes.push"
                          type="checkbox"
                          checked={profileData.alertTypes.push}
                          onChange={handleProfileChange}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="alertPush" className="font-medium text-gray-700">
                          Push notifications
                        </label>
                        <p className="text-gray-500">In-browser notifications when you're using the application</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    // Reset to user data
                    if (user) {
                      setProfileData({
                        firstName: user.first_name || '',
                        lastName: user.last_name || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        organization: user.organization || '',
                        jobTitle: user.job_title || '',
                        receiveAlerts: user.receive_alerts || false,
                        alertTypes: {
                          email: user.alert_preferences?.email || true,
                          sms: user.alert_preferences?.sms || false,
                          push: user.alert_preferences?.push || true
                        }
                      });
                    }
                  }}
                  className="mr-3 btn btn-secondary"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isProfileSubmitting}
                  className="btn btn-primary"
                >
                  {isProfileSubmitting ? (
                    <span className="flex items-center">
                      <Loader size="sm" className="mr-2" />
                      Saving...
                    </span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Card>
      
      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordErrors({});
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        }}
        title="Change Password"
      >
        <div className="p-6">
          {passwordErrors.general && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{passwordErrors.general}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.currentPassword ? 'border-red-300' : ''
                    }`}
                  />
                  {passwordErrors.currentPassword && (
                    <p className="mt-2 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.newPassword ? 'border-red-300' : ''
                    }`}
                  />
                  {passwordErrors.newPassword && (
                    <p className="mt-2 text-sm text-red-600">{passwordErrors.newPassword}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                      passwordErrors.confirmPassword ? 'border-red-300' : ''
                    }`}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordErrors({});
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPasswordSubmitting}
                className="btn btn-primary"
              >
                {isPasswordSubmitting ? (
                  <span className="flex items-center">
                    <Loader size="sm" className="mr-2" />
                    Changing...
                  </span>
                ) : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
