import React, { useEffect, useState } from 'react';
import { useApiData } from '../hooks/useApiData';
import apiClient from '../services/api';
import SprintMetrics from './SprintMetrics';

interface Cycle {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

interface Issue {
  id: string;
  identifier: string;
  title: string;
  state: {
    name: string;
  };
  estimate?: number;
  assignee?: {
    id: string;
    name: string;
  };
}

const SprintOverview: React.FC = () => {
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  
  const { data: cycles, loading: cyclesLoading, error: cyclesError, refetch: refetchCycles } = useApiData(
    () => apiClient.getLinearCycles()
  );
  
  const { data: issues, loading: issuesLoading, error: issuesError, refetch: refetchIssues } = useApiData(
    () => apiClient.getLinearIssues(selectedCycle)
  );

  useEffect(() => {
    refetchCycles();
  }, []);

  useEffect(() => {
    if (cycles && cycles.length > 0 && !selectedCycle) {
      const currentCycle = cycles.find((cycle: Cycle) => {
        const now = new Date();
        const start = new Date(cycle.startsAt);
        const end = new Date(cycle.endsAt);
        return now >= start && now <= end;
      });
      
      if (currentCycle) {
        setSelectedCycle(currentCycle.id);
      } else {
        setSelectedCycle(cycles[0].id);
      }
    }
  }, [cycles, selectedCycle]);

  useEffect(() => {
    if (selectedCycle) {
      refetchIssues();
    }
  }, [selectedCycle]);

  const handleRefresh = () => {
    refetchCycles();
    refetchIssues();
  };

  if (cyclesLoading || (selectedCycle && issuesLoading)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading sprint data...</div>
      </div>
    );
  }

  if (cyclesError || issuesError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading data: {(cyclesError || issuesError)?.message}
      </div>
    );
  }

  const currentCycle = cycles?.find((c: Cycle) => c.id === selectedCycle);
  const cycleIssues = issues || [];

  const completedIssues = cycleIssues.filter((i: Issue) => 
    ['Done', 'Completed', 'Canceled'].includes(i.state.name)
  );
  const inProgressIssues = cycleIssues.filter((i: Issue) => 
    ['In Progress', 'In Review'].includes(i.state.name)
  );
  const todoIssues = cycleIssues.filter((i: Issue) => 
    ['Todo', 'Backlog'].includes(i.state.name)
  );

  const totalPoints = cycleIssues.reduce((sum: number, i: Issue) => sum + (i.estimate || 0), 0);
  const completedPoints = completedIssues.reduce((sum: number, i: Issue) => sum + (i.estimate || 0), 0);

  const daysRemaining = currentCycle 
    ? Math.max(0, Math.ceil((new Date(currentCycle.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const issuesByAssignee = cycleIssues.reduce((acc: Record<string, Issue[]>, issue: Issue) => {
    const assigneeName = issue.assignee?.name || 'Unassigned';
    if (!acc[assigneeName]) {
      acc[assigneeName] = [];
    }
    acc[assigneeName].push(issue);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Sprint Overview</h2>
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {cycles?.map((cycle: Cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {currentCycle && (
        <>
          <SprintMetrics
            sprintName={currentCycle.name}
            totalIssues={cycleIssues.length}
            completedIssues={completedIssues.length}
            inProgressIssues={inProgressIssues.length}
            todoIssues={todoIssues.length}
            totalPoints={totalPoints}
            completedPoints={completedPoints}
            daysRemaining={daysRemaining}
          />

          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Issues by Engineer</h3>
            <div className="space-y-3">
              {Object.entries(issuesByAssignee).map(([assignee, assigneeIssues]) => (
                <div key={assignee} className="flex items-center justify-between">
                  <span className="font-medium">{assignee}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-500">
                      {assigneeIssues.filter(i => ['Todo', 'Backlog'].includes(i.state.name)).length} todo
                    </span>
                    <span className="text-blue-600">
                      {assigneeIssues.filter(i => ['In Progress', 'In Review'].includes(i.state.name)).length} in progress
                    </span>
                    <span className="text-green-600">
                      {assigneeIssues.filter(i => ['Done', 'Completed'].includes(i.state.name)).length} done
                    </span>
                    <span className="font-medium">
                      {assigneeIssues.reduce((sum, i) => sum + (i.estimate || 0), 0)} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SprintOverview;