import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

const Layout = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  
  // Determine if we should show the sidebar based on the route
  const showSidebar = !['/login', '/register', '/reset-password'].includes(location.pathname);
  // Determine if we should show the full-height layout (for map view)
  const isFullHeight = location.pathname === '/map';
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex-grow flex overflow-hidden bg-gray-50">
        {showSidebar && (
          <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
        )}
        
        <div className="flex-1 overflow-auto focus:outline-none">
          <div className={`py-6 ${isFullHeight ? 'h-[calc(100vh-64px)]' : ''}`}>
            <main className={`${showSidebar ? 'mx-auto px-4 sm:px-6 md:px-8' : 'w-full'} ${isFullHeight ? 'h-full' : ''}`}>
              {/* Replace with your content */}
              {children}
              {/* /End replace */}
            </main>
          </div>
        </div>
      </div>
      
      {!isFullHeight && <Footer />}
    </div>
  );
};

export default Layout;
