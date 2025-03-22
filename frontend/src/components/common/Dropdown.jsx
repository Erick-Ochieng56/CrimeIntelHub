import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Dropdown = ({
  trigger,
  items = [],
  align = 'left',
  width = 'auto',
  className = '',
  onSelect = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Close dropdown on ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);
  
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
  };
  
  // Position classes based on alignment
  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2',
  };
  
  // Width classes
  const widthClasses = {
    auto: '',
    sm: 'w-36',
    md: 'w-48',
    lg: 'w-64',
    xl: 'w-80',
    '2xl': 'w-96',
    full: 'w-full',
  };
  
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <div onClick={toggleDropdown}>
        {trigger}
      </div>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className={`origin-top-right absolute z-50 mt-2 ${alignmentClasses[align]} ${widthClasses[width] || 'w-56'} rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}>
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {items.map((item, index) => {
              // Check if item is a divider
              if (item.divider) {
                return <div key={`divider-${index}`} className="border-t border-gray-100 my-1"></div>;
              }
              
              // Check if item is a header
              if (item.header) {
                return (
                  <div key={`header-${index}`} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    {item.header}
                  </div>
                );
              }
              
              // Default item content
              const itemContent = (
                <div className="flex items-center">
                  {item.icon && (
                    <span className="mr-3 text-gray-500">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </div>
              );
              
              // Render as link if href or to is provided
              if (item.href) {
                return (
                  <a
                    key={index}
                    href={item.href}
                    target={item.target || '_self'}
                    rel={item.target === '_blank' ? 'noreferrer noopener' : undefined}
                    className={`block px-4 py-2 text-sm ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} ${item.className || ''}`}
                    onClick={(e) => {
                      if (item.disabled) e.preventDefault();
                      else handleSelect(item);
                    }}
                    role="menuitem"
                  >
                    {itemContent}
                  </a>
                );
              } else if (item.to) {
                return (
                  <Link
                    key={index}
                    to={item.to}
                    className={`block px-4 py-2 text-sm ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} ${item.className || ''}`}
                    onClick={(e) => {
                      if (item.disabled) e.preventDefault();
                      else handleSelect(item);
                    }}
                    role="menuitem"
                  >
                    {itemContent}
                  </Link>
                );
              }
              
              // Otherwise render as button
              return (
                <button
                  key={index}
                  type="button"
                  disabled={item.disabled}
                  className={`block w-full text-left px-4 py-2 text-sm ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'} ${item.className || ''}`}
                  onClick={() => handleSelect(item)}
                  role="menuitem"
                >
                  {itemContent}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
