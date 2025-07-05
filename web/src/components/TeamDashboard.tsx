import React, { useEffect } from 'react';
import { useApiData } from '../hooks/useApiData';
import apiClient from '../services/api';
import EngineerCard from './EngineerCard';

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  email: string;
}

interface Issue {
  id: string;
  title: string;
  identifier: string;
  assignee?: {
    id: string;
    name: string;
  };
  state: {
    name: string;
    color: string;
  };
  priority: number;
  estimate?: number;
  completedAt?: string;
}

const TeamDashboard: React.FC = () => {
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApiData(
    () => apiClient.getLinearUsers()
  );
  
  const { data: issues, loading: issuesLoading, error: issuesError, refetch: refetchIssues } = useApiData(
    () => apiClient.getLinearIssues()
  );

  useEffect(() => {
    refetchUsers();
    refetchIssues();
  }, []);

  const handleRefresh = () => {
    refetchUsers();
    refetchIssues();
  };

  if (usersLoading || issuesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading team data...</div>
      </div>
    );
  }

  if (usersError || issuesError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading data: {(usersError || issuesError)?.message}
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getEngineerData = (user: TeamMember) => {
    const userIssues = issues?.filter(issue => issue.assignee?.id === user.id) || [];
    
    const currentIssues = userIssues.filter(issue => 
      !issue.completedAt && ['In Progress', 'Todo', 'Backlog'].includes(issue.state.name)
    );
    
    const completedToday = userIssues.filter(issue => {
      if (!issue.completedAt) return false;
      const completedDate = new Date(issue.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    }).length;
    
    const inReview = userIssues.filter(issue => 
      issue.state.name === 'In Review'
    ).length;

    return {
      currentIssues,
      completedToday,
      inReview,
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Team Status</h2>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users?.map((user: TeamMember) => {
          const engineerData = getEngineerData(user);
          return (
            <EngineerCard
              key={user.id}
              name={user.name}
              avatarUrl={user.avatarUrl}
              {...engineerData}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TeamDashboard;