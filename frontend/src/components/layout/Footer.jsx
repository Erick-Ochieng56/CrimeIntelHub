import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span className="ml-2 text-xl font-bold">CrimeTrack</span>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              A comprehensive crime analysis system with geospatial mapping, predictive analytics, and reporting capabilities.
            </p>
          </div>
          
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Resources</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/map" className="text-base text-gray-300 hover:text-white">
                  Crime Map
                </Link>
              </li>
              <li>
                <Link to="/analytics" className="text-base text-gray-300 hover:text-white">
                  Analytics
                </Link>
              </li>
              <li>
                <Link to="/reports" className="text-base text-gray-300 hover:text-white">
                  Reports
                </Link>
              </li>
              <li>
                <Link to="/search" className="text-base text-gray-300 hover:text-white">
                  Search
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Support</h3>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="text-base text-gray-300" title="Coming soon">
                  Documentation
                </span>
              </li>
              <li>
                <span className="text-base text-gray-300" title="Coming soon">
                  Help Center
                </span>
              </li>
              <li>
                <span className="text-base text-gray-300" title="Coming soon">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="text-base text-gray-300" title="Coming soon">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
          
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Stay Connected</h3>
            <div className="mt-4 flex space-x-4">
              <a
                href="https://github.com/Erick-Ochieng56/CrimeIntelHub"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-300"
              >
                <span className="sr-only">GitHub</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-700 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-base text-gray-400">
            &copy; {year} CrimeTrack. All rights reserved.
          </p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <span className="text-sm text-gray-400" title="Coming soon">
              Privacy Policy
            </span>
            <span className="text-sm text-gray-400" title="Coming soon">
              Terms of Service
            </span>
            <span className="text-sm text-gray-400" title="Coming soon">
              Cookie Policy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
