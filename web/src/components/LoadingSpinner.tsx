import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingSpinner;