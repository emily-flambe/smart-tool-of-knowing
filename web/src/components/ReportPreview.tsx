import React from 'react';
import { format } from 'date-fns';
import { CheckCircle, GitPullRequest, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { ReportData, ReportConfig } from '../types/report';

interface ReportPreviewProps {
  data: ReportData;
  config: ReportConfig;
}

const ReportPreview: React.FC<ReportPreviewProps> = ({ data, config }) => {
  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {data.title || 'Team Activity Report'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {format(config.dateRange.start, 'MMM d, yyyy')} - {format(config.dateRange.end, 'MMM d, yyyy')}
        </p>
        {data.generatedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Generated on {format(new Date(data.generatedAt), 'MMM d, yyyy h:mm a')}
          </p>
        )}
      </div>

      {/* Summary Metrics */}
      {data.metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Issues Completed</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {data.metrics.issuesCompleted || 0}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">PRs Merged</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {data.metrics.prsMerged || 0}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Story Points</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {data.metrics.storyPoints || 0}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Contributors</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {data.metrics.contributors || 0}
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Executive Summary */}
      {data.summary && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Executive Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.summary}</p>
        </div>
      )}

      {/* Key Highlights */}
      {data.highlights && data.highlights.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Key Highlights</h3>
          <ul className="space-y-2">
            {data.highlights.map((highlight, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Project Breakdown */}
      {data.projectSummaries && data.projectSummaries.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Project Breakdown</h3>
          <div className="space-y-4">
            {data.projectSummaries.map((project, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  <span className="text-sm text-gray-500">
                    {project.completedIssues} issues completed
                  </span>
                </div>
                {project.summary && (
                  <p className="text-sm text-gray-600 mb-2">{project.summary}</p>
                )}
                {project.contributors && project.contributors.length > 0 && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Users className="h-3 w-3 mr-1" />
                    {project.contributors.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Issues */}
      {data.completedIssues && data.completedIssues.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Completed Issues</h3>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.completedIssues.map((issue, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {issue.url ? (
                          <a href={issue.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                            {issue.identifier} - {issue.title}
                          </a>
                        ) : (
                          <span>{issue.identifier} - {issue.title}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issue.assignee}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issue.project}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {issue.linkedPRs && issue.linkedPRs.length > 0 ? (
                        <div className="flex items-center">
                          <GitPullRequest className="h-4 w-4 text-gray-400 mr-1" />
                          <span>{issue.linkedPRs.length}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Items */}
      {data.actionItems && data.actionItems.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Action Items</h3>
          <ul className="space-y-2">
            {data.actionItems.map((item, index) => (
              <li key={index} className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReportPreview;