import React from 'react';
import { AlertCircle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
          <div className="max-w-md text-center bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="space-y-3">
              <button
                onClick={this.resetError}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Try Again
              </button>
              <a
                href="/"
                className="block w-full bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Back to Home
              </a>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 p-4 bg-gray-100 rounded text-left">
                <summary className="cursor-pointer font-mono text-sm text-gray-700">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 text-xs overflow-auto bg-gray-800 text-gray-100 p-2 rounded">
                  {this.state.error?.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
