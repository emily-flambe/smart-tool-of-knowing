import React from 'react';

const Reports: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Generate Reports</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Status Report</h2>
        <p className="text-gray-600 mb-4">Generate a comprehensive weekly status report for your team.</p>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default Reports;