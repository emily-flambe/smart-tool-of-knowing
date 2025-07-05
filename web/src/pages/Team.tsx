import React from 'react';

const Team: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Team Status</h1>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <p className="text-gray-600">Team member cards will be displayed here showing current work and status.</p>
        </div>
      </div>
    </div>
  );
};

export default Team;