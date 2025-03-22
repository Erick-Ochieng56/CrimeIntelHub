import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnEsc = true,
  closeOnOutsideClick = true,
  showCloseButton = true,
  hideHeader = false,
}) => {
  const modalRef = useRef(null);
  
  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      // Re-enable body scrolling when modal is closed
      document.body.style.overflow = 'visible';
    };
  }, [isOpen, onClose, closeOnEsc]);
  
  // Handle click outside modal
  const handleOutsideClick = (event) => {
    if (closeOnOutsideClick && modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  if (!isOpen) return null;
  
  return createPortal(
    <div 
      className="fixed inset-0 z-50 overflow-y-auto" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
      onClick={handleOutsideClick}
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        
        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        {/* Modal panel */}
        <div 
          ref={modalRef}
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size] || sizeClasses.md} w-full`}
          role="dialog"
          aria-modal="true" 
          aria-labelledby="modal-headline"
        >
          {!hideHeader && (
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                {title}
              </h3>
              {showCloseButton && (
                <button
                  type="button"
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* Modal content */}
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
