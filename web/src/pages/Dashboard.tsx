import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import TeamDashboard from '../components/TeamDashboard';
import DashboardSummary from '../components/DashboardSummary';
import { useApiData } from '../hooks/useApiData';
import apiClient from '../services/api';

const Dashboard: React.FC = () => {
  const { data: users, refetch: refetchUsers } = useApiData(
    () => apiClient.getLinearUsers()
  );
  
  const { data: issues, refetch: refetchIssues } = useApiData(
    () => apiClient.getLinearIssues()
  );

  useEffect(() => {
    refetchUsers();
    refetchIssues();
  }, []);

  // Calculate summary metrics
  const totalEngineers = users?.length || 0;
  const activeIssues = issues?.filter((issue: any) => 
    !issue.completedAt && ['In Progress', 'Todo'].includes(issue.state.name)
  ).length || 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = issues?.filter((issue: any) => {
    if (!issue.completedAt) return false;
    const completedDate = new Date(issue.completedAt);
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === today.getTime();
  }).length || 0;
  
  const inReview = issues?.filter((issue: any) => 
    issue.state.name === 'In Review'
  ).length || 0;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Engineering Manager Dashboard</h1>
      
      <DashboardSummary
        totalEngineers={totalEngineers}
        activeIssues={activeIssues}
        completedToday={completedToday}
        inReview={inReview}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Link to="/team" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Team Overview</h2>
          <p className="text-gray-600">View detailed status of all team members</p>
        </Link>
        <Link to="/sprint" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Sprint Progress</h2>
          <p className="text-gray-600">Current sprint metrics and burndown</p>
        </Link>
        <Link to="/reports" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Generate Reports</h2>
          <p className="text-gray-600">Create weekly status reports</p>
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Current Team Activity</h2>
        <TeamDashboard />
      </div>
    </div>
  );
};

export default Dashboard;