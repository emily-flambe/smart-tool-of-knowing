import React, { useState } from 'react'

interface CycleReviewStats {
  totalIssues: number
  totalPoints: number
  totalPRs: number
  uniqueContributors: number
  velocity: number
}

interface CycleReviewData {
  cycle: {
    id: string
    name: string | null
    startedAt: string
    completedAt: string
  } | null
  stats: CycleReviewStats
  issues: any[]
  issuesByProject: Record<string, any>
  issuesByEngineer: Record<string, any>
  pullRequests: any[]
}

interface OverviewCardsProps {
  cycleReviewData: CycleReviewData | null
  isLoading: boolean
  error: string | null
}

export function OverviewCards({ cycleReviewData, isLoading, error }: OverviewCardsProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !cycleReviewData) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-400 text-sm font-medium mb-2">--</div>
            <div className="text-2xl font-bold text-gray-400">--</div>
          </div>
        ))}
      </div>
    )
  }

  const stats = cycleReviewData.stats

  const cards = [
    {
      title: 'Issues Completed',
      value: stats.totalIssues,
      icon: '✓',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Story Points',
      value: stats.totalPoints,
      icon: '📊',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pull Requests',
      value: stats.totalPRs,
      icon: '🔀',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Main stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${card.bgColor} rounded-lg p-2`}>
                <span className="text-xl">{card.icon}</span>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 mb-1">
                  {card.title}
                </div>
                <div className={`text-2xl font-bold ${card.color}`}>
                  {card.value.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Projects breakdown - full list, no truncation */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Projects</h3>
          <span className="text-sm text-gray-500">
            {Object.keys(cycleReviewData.issuesByProject).length} total
          </span>
        </div>
        <div className="space-y-3">
          {Object.entries(cycleReviewData.issuesByProject)
            .sort(([, a], [, b]) => (b as any).totalPoints - (a as any).totalPoints)
            .map(([projectName, projectData]: [string, any]) => {
              const percentage = stats.totalPoints > 0 ? Math.round((projectData.totalPoints / stats.totalPoints) * 100) : 0;
              
              // Generate a vibrant color if project doesn't have one or has gray
              const projectColor = projectData.project?.color;
              let displayColor = projectColor;
              
              if (!projectColor || projectColor === '#bec2c8') {
                // Generate a deterministic color based on project name
                const colors = [
                  '#3B82F6', // blue
                  '#10B981', // emerald  
                  '#F59E0B', // amber
                  '#EF4444', // red
                  '#8B5CF6', // violet
                  '#06B6D4', // cyan
                  '#84CC16', // lime
                  '#F97316', // orange
                  '#EC4899', // pink
                  '#6366F1'  // indigo
                ];
                const hash = projectName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                displayColor = colors[hash % colors.length];
              }
              
              const isExpanded = expandedProjects.has(projectName);
              
              return (
                <div key={projectName} className="bg-gray-50 rounded-lg">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      const newExpanded = new Set(expandedProjects);
                      if (isExpanded) {
                        newExpanded.delete(projectName);
                      } else {
                        newExpanded.add(projectName);
                      }
                      setExpandedProjects(newExpanded);
                    }}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: displayColor }}
                      ></div>
                      <span className="text-gray-900 font-medium truncate">
                        {projectName}
                      </span>
                    </div>
                    <div className="ml-3 flex-shrink-0 text-right flex items-center">
                      <div className="mr-2">
                        <div className="text-gray-600 font-semibold">
                          {projectData.totalPoints}pt
                        </div>
                        <div className="text-xs text-gray-500">
                          {percentage}%
                        </div>
                      </div>
                      <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        ▶
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-200 bg-white">
                      <div className="pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Issues completed ({projectData.issues.length})
                        </h4>
                        <ul className="space-y-1">
                          {projectData.issues
                            .sort((a: any, b: any) => (b.estimate || 0) - (a.estimate || 0))
                            .map((issue: any) => (
                              <li key={issue.id} className="text-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start min-w-0 flex-1">
                                    <span className="text-gray-500 mr-1 mt-0.5">•</span>
                                    <a 
                                      href={issue.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-medium mr-2 flex-shrink-0"
                                    >
                                      {issue.identifier}
                                    </a>
                                    <span className="text-gray-700 break-words">
                                      {issue.title}
                                      {issue.assignee && (
                                        <span className="text-gray-500 ml-1">
                                          ({issue.assignee.name})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500 flex-shrink-0 mt-0.5">
                                    {issue.estimate || 0}pt
                                  </span>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  )
}