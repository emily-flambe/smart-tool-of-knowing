import React from 'react'

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
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
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
    },
    {
      title: 'Team Members',
      value: stats.uniqueContributors,
      icon: '👥',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <div className="space-y-4">
      {/* Main stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Velocity and additional metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Velocity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-50 rounded-lg p-2">
              <span className="text-xl">⚡</span>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 mb-1">
                Velocity
              </div>
              <div className="text-2xl font-bold text-indigo-600">
                {stats.velocity}
              </div>
              <div className="text-xs text-gray-500">
                points per week
              </div>
            </div>
          </div>
        </div>

        {/* Project breakdown preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Projects</h3>
            <span className="text-xs text-gray-400">
              {Object.keys(cycleReviewData.issuesByProject).length} total
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(cycleReviewData.issuesByProject)
              .sort(([, a], [, b]) => (b as any).totalPoints - (a as any).totalPoints)
              .slice(0, 3)
              .map(([projectName, projectData]: [string, any]) => (
                <div key={projectName} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: projectData.project?.color || '#6B7280' }}
                    ></div>
                    <span className="text-gray-700 truncate max-w-24">
                      {projectName}
                    </span>
                  </div>
                  <span className="text-gray-500 font-medium">
                    {projectData.totalPoints}pt
                  </span>
                </div>
              ))}
            {Object.keys(cycleReviewData.issuesByProject).length > 3 && (
              <div className="text-xs text-gray-400 pt-1">
                +{Object.keys(cycleReviewData.issuesByProject).length - 3} more...
              </div>
            )}
          </div>
        </div>

        {/* Engineer breakdown preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Top Contributors</h3>
            <span className="text-xs text-gray-400">
              by story points
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(cycleReviewData.issuesByEngineer)
              .sort(([, a], [, b]) => (b as any).totalPoints - (a as any).totalPoints)
              .slice(0, 3)
              .map(([engineerName, engineerData]: [string, any]) => (
                <div key={engineerName} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center text-xs font-medium text-gray-600">
                      {engineerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 truncate max-w-20">
                      {engineerName.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-gray-500 font-medium">
                    {(engineerData as any).totalPoints}pt
                  </span>
                </div>
              ))}
            {Object.keys(cycleReviewData.issuesByEngineer).length > 3 && (
              <div className="text-xs text-gray-400 pt-1">
                +{Object.keys(cycleReviewData.issuesByEngineer).length - 3} more...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}