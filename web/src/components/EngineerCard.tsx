import React from 'react';

interface Issue {
  id: string;
  title: string;
  identifier: string;
  state: {
    name: string;
    color: string;
  };
  priority: number;
  estimate?: number;
}

interface EngineerCardProps {
  name: string;
  avatarUrl?: string;
  currentIssues: Issue[];
  completedToday: number;
  inReview: number;
}

const EngineerCard: React.FC<EngineerCardProps> = ({
  name,
  avatarUrl,
  currentIssues,
  completedToday,
  inReview,
}) => {
  const priorityLabels = ['None', 'Urgent', 'High', 'Medium', 'Low'];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center mb-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full mr-3"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
            <span className="text-gray-600 font-medium">
              {name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <div className="flex text-sm text-gray-500 space-x-3">
            <span>{completedToday} completed today</span>
            <span>{inReview} in review</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {currentIssues.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No active issues</p>
        ) : (
          currentIssues.map((issue) => (
            <div
              key={issue.id}
              className="border-l-4 pl-3 py-2"
              style={{ borderColor: issue.state.color }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {issue.identifier}: {issue.title}
                  </p>
                  <div className="flex items-center mt-1 space-x-3">
                    <span className="text-xs text-gray-500">
                      {issue.state.name}
                    </span>
                    {issue.priority > 0 && (
                      <span className="text-xs text-gray-500">
                        {priorityLabels[issue.priority]}
                      </span>
                    )}
                    {issue.estimate && (
                      <span className="text-xs text-gray-500">
                        {issue.estimate} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EngineerCard;