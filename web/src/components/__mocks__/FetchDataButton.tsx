import React from 'react';

interface FetchDataButtonProps {
  onFetchData: () => void;
  hasLocalChanges: boolean;
  isLoading: boolean;
}

export const FetchDataButton: React.FC<FetchDataButtonProps> = ({ onFetchData, hasLocalChanges, isLoading }) => (
  <button onClick={onFetchData} disabled={isLoading}>
    {isLoading ? 'Loading...' : hasLocalChanges ? 'Refresh Data' : 'Fetch Data'}
  </button>
);