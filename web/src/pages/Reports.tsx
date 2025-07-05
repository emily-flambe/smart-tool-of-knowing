import React from 'react';
import ReportGenerator from '../components/ReportGenerator';

const Reports: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports</h1>
      <ReportGenerator />
    </div>
  );
};

export default Reports;