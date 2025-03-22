import React from 'react';
import Profile from '../components/user/Profile';

const UserProfilePage = () => {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your personal information and notification preferences.
        </p>
      </div>
      
      <Profile />
    </div>
  );
};

export default UserProfilePage;
