import React from 'react';

interface SprintMetricsProps {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  todoIssues: number;
  totalPoints: number;
  completedPoints: number;
  daysRemaining: number;
  sprintName: string;
}

const SprintMetrics: React.FC<SprintMetricsProps> = ({
  totalIssues,
  completedIssues,
  inProgressIssues,
  todoIssues,
  totalPoints,
  completedPoints,
  daysRemaining,
  sprintName,
}) => {
  const completionPercentage = totalIssues > 0 
    ? Math.round((completedIssues / totalIssues) * 100) 
    : 0;
  
  const pointsPercentage = totalPoints > 0 
    ? Math.round((completedPoints / totalPoints) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{sprintName}</h2>
        <p className="text-gray-600">{daysRemaining} days remaining</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Issue Progress</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{completedIssues} of {totalIssues} issues</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Story Points</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{completedPoints} of {totalPoints} points</span>
              <span>{pointsPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${pointsPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{todoIssues}</p>
          <p className="text-sm text-gray-500">To Do</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{inProgressIssues}</p>
          <p className="text-sm text-gray-500">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{completedIssues}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
      </div>
    </div>
  );
};

export default SprintMetrics;