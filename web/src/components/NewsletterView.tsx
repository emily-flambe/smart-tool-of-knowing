import React from 'react'

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

interface NewsletterViewProps {
  issues: Issue[]
}

export function NewsletterView({ issues }: NewsletterViewProps) {
  // Group issues by project and sort by total points
  const projectGroups: ProjectGroup[] = React.useMemo(() => {
    const projectMap = new Map<string, ProjectGroup>()
    
    issues.forEach(issue => {
      const projectName = issue.project?.name || 'No Project'
      
      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, {
          name: projectName,
          color: issue.project?.color,
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
  }, [issues])

  const handleCopyToClipboard = async () => {
    const textContent = generateTextContent(projectGroups)
    try {
      await navigator.clipboard.writeText(textContent)
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Newsletter Summary</h3>
        <button
          onClick={handleCopyToClipboard}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          📋 Copy for Newsletter
        </button>
      </div>

      {/* Projects list */}
      <div className="space-y-6">
        {projectGroups.map((project) => (
          <div key={project.name} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                  <h4 className="text-base font-semibold text-gray-900">
                    {project.name}
                  </h4>
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  {project.totalPoints} points • {project.issues.length} issues
                </span>
              </div>
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

      {/* Text preview for copying */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Preview (Copy-ready format):</h4>
        <div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
          {generateTextContent(projectGroups)}
        </div>
      </div>
    </div>
  )
}

// Generate plain text content for copying
function generateTextContent(projectGroups: ProjectGroup[]): string {
  let content = '## Completed Work\n\n'
  
  projectGroups.forEach((project) => {
    content += `### ${project.name} (${project.totalPoints} points)\n\n`
    
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