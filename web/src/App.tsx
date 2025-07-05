import React from 'react';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Smart Tool of Knowing
        </h1>
        <p className="text-gray-600 mb-6">
          Frontend application coming soon...
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            The backend API and CLI are still available for use.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App