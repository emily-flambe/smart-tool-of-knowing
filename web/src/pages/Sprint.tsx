import React from 'react';

const Sprint: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Sprint Overview</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sprint Metrics</h2>
          <p className="text-gray-600">Sprint burndown and completion metrics will be shown here.</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Issues by Engineer</h2>
          <p className="text-gray-600">Distribution of work across team members.</p>
        </div>
      </div>
    </div>
  );
};

export default Sprint;