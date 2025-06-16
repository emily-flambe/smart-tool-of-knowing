import React from 'react';

interface Change {
  id: string;
  type: 'assignment';
  issueId: string;
  fromEngineerId?: string;
  toEngineerId: string;
  timestamp: string;
}

interface ChangesPanelProps {
  changes: Change[];
  lastFetched: string;
  onReset: () => void;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({ changes, lastFetched, onReset }) => (
  <div>
    <div>Changes: {changes.length}</div>
    <button onClick={onReset}>Reset Changes</button>
  </div>
);