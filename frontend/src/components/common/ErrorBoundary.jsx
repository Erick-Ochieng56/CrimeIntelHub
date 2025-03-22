import React, { Component } from 'react';
import Card from './Card';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // You could also log to a more sophisticated error tracking service here
    // e.g., Sentry, LogRocket, etc.
  }
  
  resetError = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      
      // Use custom fallback if provided
      if (fallback) {
        return fallback(this.state.error, this.resetError);
      }
      
      // Default error UI
      return (
        <Card className="my-6 mx-auto max-w-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                An error occurred while rendering this component. Please try refreshing the page or contact support if the problem persists.
              </p>
              
              <div className="mt-4">
                <button
                  onClick={this.resetError}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Refresh Page
                </button>
              </div>
              
              {/* Error details (collapsed) */}
              <details className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-200 text-xs">
                <summary className="cursor-pointer font-medium">Error Details (for developers)</summary>
                <div className="mt-2">
                  <p className="font-bold text-red-600">{this.state.error && this.state.error.toString()}</p>
                  <pre className="mt-2 overflow-x-auto bg-gray-100 p-2 rounded">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </Card>
      );
    }

    // If no error occurred, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
