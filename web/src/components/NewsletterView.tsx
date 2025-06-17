import React, { useState } from 'react'
import { planningApi } from '../api/client'

interface Issue {
  id: string
  identifier: string
  title: string
  url?: string
  assignee?: {
    name: string
  } | null
  project?: {
    name: string
    color?: string
  } | null
  estimate: number
  linkedPRs?: Array<{
    id: string
    title: string
    url: string
    number: number
    org: string
    repo: string
    metadata?: {
      status: string
      mergedAt?: string
    }
  }>
}

interface ProjectGroup {
  name: string
  color?: string
  totalPoints: number
  issues: Issue[]
}

interface NewsletterData {
  completedIssues: Issue[]
  cycleInfo: {
    name: string
    startDate: string
    endDate: string
  }
  githubStats: {
    totalPRs: number
    totalCommits: number
  }
  summary?: string
  projectSummaries?: Record<string, string>
}

interface NewsletterViewProps {
  issues?: Issue[]
}

// Generate a vibrant color if project doesn't have one or has gray (same logic as OverviewCards)
function generateProjectColor(projectName: string, originalColor?: string): string {
  if (originalColor && originalColor !== '#bec2c8') {
    return originalColor
  }
  
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
  ]
  const hash = projectName.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function NewsletterView({ issues = [] }: NewsletterViewProps) {
  const [newsletterData, setNewsletterData] = useState<NewsletterData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group issues by project and sort by total points (for display)
  const projectGroups: ProjectGroup[] = React.useMemo(() => {
    const dataToProcess = newsletterData?.completedIssues || issues
    const projectMap = new Map<string, ProjectGroup>()
    
    dataToProcess.forEach(issue => {
      const projectName = issue.project?.name || 'No Project'
      
      if (!projectMap.has(projectName)) {
        const displayColor = generateProjectColor(projectName, issue.project?.color)
        projectMap.set(projectName, {
          name: projectName,
          color: displayColor,
          totalPoints: 0,
          issues: []
        })
      }
      
      const group = projectMap.get(projectName)!
      group.issues.push(issue)
      group.totalPoints += issue.estimate || 0
    })
    
    // Sort projects by total points (descending) and issues by identifier
    return Array.from(projectMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map(group => ({
        ...group,
        issues: group.issues.sort((a, b) => a.identifier.localeCompare(b.identifier))
      }))
  }, [issues, newsletterData])

  const handleSummarize = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch newsletter data from API
      const result = await planningApi.generateNewsletter()
      setNewsletterData(result)
    } catch (err) {
      console.error('Error generating newsletter:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while generating the newsletter')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyToClipboard = async () => {
    const textContent = generateTextContent(projectGroups, newsletterData)
    try {
      await navigator.clipboard.writeText(textContent)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with summarize and copy buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Newsletter Generator</h3>
          <p className="text-sm text-gray-600 mt-1">
            Generate a summary of completed work from the latest cycle
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Generating...' : '📝 Summarize'}
          </button>
          {newsletterData && (
            <button
              onClick={handleCopyToClipboard}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              📋 Copy for Newsletter
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-blue-700">Generating newsletter summary...</p>
        </div>
      )}

      {/* Newsletter data display */}
      {newsletterData && !isLoading && (
        <>
          {/* Cycle info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-base font-semibold text-gray-900 mb-2">Cycle Information</h4>
            <div className="text-sm text-gray-600">
              <p><strong>Cycle:</strong> {newsletterData.cycleInfo.name}</p>
              <p><strong>Period:</strong> {new Date(newsletterData.cycleInfo.startDate).toLocaleDateString()} - {new Date(newsletterData.cycleInfo.endDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* AI Summary */}
          {newsletterData.summary && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-base font-semibold text-gray-900 mb-3">AI Summary</h4>
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{newsletterData.summary}</p>
              </div>
            </div>
          )}

          {/* GitHub stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="text-base font-semibold text-gray-900 mb-2">Development Activity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Pull Requests:</span>
                <span className="ml-2 font-medium">{newsletterData.githubStats.totalPRs}</span>
              </div>
              <div>
                <span className="text-gray-600">Commits:</span>
                <span className="ml-2 font-medium">{newsletterData.githubStats.totalCommits}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Show content if we have data or fallback to initial issues */}
      {(newsletterData || issues.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Completed Work</h4>

          <div className="space-y-4">
            {projectGroups.map((project) => (
              <div key={project.name} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Project header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {project.color && (
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: project.color }}
                        />
                      )}
                      <h5 className="text-sm font-semibold text-gray-900">
                        {project.name}
                      </h5>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {project.totalPoints} points • {project.issues.length} issues
                    </span>
                  </div>
                  
                  {/* Project summary */}
                  {newsletterData?.projectSummaries?.[project.name] && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                        {newsletterData.projectSummaries[project.name]}
                      </div>
                    </div>
                  )}
                </div>

                {/* Issues list */}
                <div className="px-4 py-3">
                  <div className="space-y-2">
                    {project.issues.map((issue) => (
                      <div key={issue.id} className="border-l-2 border-gray-100 pl-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">
                              <a
                                href={issue.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {issue.identifier}
                              </a>
                              <span className="text-gray-900 ml-2">{issue.title}</span>
                            </div>
                            {issue.linkedPRs && issue.linkedPRs.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                PRs: {issue.linkedPRs.map((pr, index) => (
                                  <span key={pr.id}>
                                    <a
                                      href={pr.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline"
                                      title={pr.title}
                                    >
                                      #{pr.number}
                                    </a>
                                    {index < issue.linkedPRs!.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex-shrink-0">
                            {issue.assignee?.name || 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text preview for copying - only show when we have newsletter data */}
      {newsletterData && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Preview (Copy-ready format):</h4>
          <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {generateTextContent(projectGroups, newsletterData)}
          </div>
        </div>
      )}
    </div>
  )
}

// Generate plain text content for copying
function generateTextContent(projectGroups: ProjectGroup[], newsletterData?: NewsletterData | null): string {
  let content = ''
  
  if (newsletterData) {
    content += `# Newsletter - ${newsletterData.cycleInfo.name}\n\n`
    content += `**Period:** ${new Date(newsletterData.cycleInfo.startDate).toLocaleDateString()} - ${new Date(newsletterData.cycleInfo.endDate).toLocaleDateString()}\n\n`
    
    if (newsletterData.summary) {
      content += `## Summary\n\n${newsletterData.summary}\n\n`
    }
    
    content += `## Development Activity\n\n`
    content += `- **Pull Requests:** ${newsletterData.githubStats.totalPRs}\n`
    content += `- **Commits:** ${newsletterData.githubStats.totalCommits}\n\n`
  }
  
  content += '## Completed Work\n\n'
  
  projectGroups.forEach((project) => {
    content += `### ${project.name} (${project.totalPoints} points)\n\n`
    
    // Add project summary if available
    if (newsletterData?.projectSummaries?.[project.name]) {
      content += `${newsletterData.projectSummaries[project.name]}\n\n`
    }
    
    project.issues.forEach((issue) => {
      const assignee = issue.assignee?.name || 'Unassigned'
      const prLinks = issue.linkedPRs?.length ? 
        ` [${issue.linkedPRs.map(pr => `PR #${pr.number}`).join(', ')}]` : ''
      content += `- ${issue.identifier}: ${issue.title} (${assignee})${prLinks}\n`
    })
    
    content += '\n'
  })
  
  return content
}