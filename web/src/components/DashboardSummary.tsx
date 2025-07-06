import React from 'react';

interface DashboardSummaryProps {
  totalEngineers: number;
  activeIssues: number;
  completedToday: number;
  inReview: number;
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  totalEngineers,
  activeIssues,
  completedToday,
  inReview,
}) => {
  const metrics = [
    {
      label: 'Team Members',
      value: totalEngineers,
      icon: '👥',
      color: 'bg-blue-100 text-blue-800',
    },
    {
      label: 'Active Issues',
      value: activeIssues,
      icon: '🔄',
      color: 'bg-yellow-100 text-yellow-800',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: '✅',
      color: 'bg-green-100 text-green-800',
    },
    {
      label: 'In Review',
      value: inReview,
      icon: '👀',
      color: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{metric.icon}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${metric.color}`}>
              {metric.label}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary;