import React, { useEffect, useState } from 'react';
import { useApiData } from '../hooks/useApiData';
import apiClient from '../services/api';
import EngineerCard from './EngineerCard';
import TimeframeSelector, { Timeframe } from './TimeframeSelector';
import { filterByTimeframe, getDateRangeText } from '../utils/dateFilters';

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
  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApiData(
    () => apiClient.getLinearUsers()
  );
  
  const { data: issues, loading: issuesLoading, error: issuesError, refetch: refetchIssues } = useApiData(
    () => apiClient.getLinearIssues()
  );

  const { data: cycles, refetch: refetchCycles } = useApiData(
    () => apiClient.getLinearCycles()
  );

  useEffect(() => {
    refetchUsers();
    refetchIssues();
    refetchCycles();
  }, []);

  const handleRefresh = () => {
    refetchUsers();
    refetchIssues();
    refetchCycles();
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
    
    // Filter issues based on timeframe
    let filteredIssues = userIssues;
    if (timeframe === 'sprint' && cycles && cycles.length > 0) {
      // Find current sprint
      const currentCycle = cycles.find((cycle: any) => {
        const now = new Date();
        const start = new Date(cycle.startsAt);
        const end = new Date(cycle.endsAt);
        return now >= start && now <= end;
      });
      
      if (currentCycle) {
        // For sprint view, show all issues in the current sprint
        filteredIssues = userIssues; // Assuming issues are already filtered by current sprint from API
      }
    } else if (timeframe !== 'sprint') {
      // For other timeframes, filter completed issues by date
      const completedInTimeframe = filterByTimeframe(
        userIssues.filter(i => i.completedAt),
        timeframe,
        'completedAt'
      );
      const activeIssues = userIssues.filter(i => !i.completedAt);
      filteredIssues = [...activeIssues, ...completedInTimeframe];
    }
    
    const currentIssues = filteredIssues.filter(issue => 
      !issue.completedAt && ['In Progress', 'Todo', 'Backlog'].includes(issue.state.name)
    );
    
    const completedInTimeframe = filteredIssues.filter(issue => issue.completedAt).length;
    
    const inReview = filteredIssues.filter(issue => 
      issue.state.name === 'In Review'
    ).length;

    return {
      currentIssues,
      completedToday: completedInTimeframe,
      inReview,
    };
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Status</h2>
          <p className="text-sm text-gray-600 mt-1">{getDateRangeText(timeframe)}</p>
        </div>
        <div className="flex items-center space-x-4">
          <TimeframeSelector selected={timeframe} onChange={setTimeframe} />
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
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