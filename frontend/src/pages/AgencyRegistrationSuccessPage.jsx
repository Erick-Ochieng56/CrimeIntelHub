import React from 'react';
import { Link } from 'react-router-dom';

const AgencyRegistrationSuccessPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <svg 
              className="mx-auto h-12 w-12 text-green-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
            
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Registration Submitted
            </h2>
            
            <p className="mt-2 text-center text-sm text-gray-600">
              Thank you for registering your agency.
            </p>
            
            <div className="mt-6 space-y-4">
              <p className="text-center text-sm text-gray-500">
                Your registration is pending review by our administrators. Once approved, you will receive an email confirmation and can begin using the system.
              </p>
              
              <div className="px-4 py-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">
                  Please note that the approval process typically takes 1-2 business days. You can contact our support team if you have any questions.
                </p>
              </div>
            </div>
            
            <div className="mt-6 space-y-3">
              <Link
                to="/agency/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Agency Login
              </Link>
              
              <Link
                to="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyRegistrationSuccessPage;