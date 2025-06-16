import React from 'react'
import { useDrop } from 'react-dnd'
import { LinearIssue, TeamMember } from '../types'
import { TicketCard } from './TicketCard'

interface EngineerDropColumnProps {
  engineerId: string
  engineer: TeamMember | null
  issues: LinearIssue[]
  groupPoints: number
  statusId: string
  onDropFromBacklog?: (issue: LinearIssue, statusId: string, engineerId?: string) => void
  onDropStatus?: (issue: LinearIssue, statusId: string) => void
  onUpdateEstimate?: (issueId: string, estimate: number) => void
}

const EngineerDropColumn: React.FC<EngineerDropColumnProps> = ({
  engineerId,
  engineer,
  issues,
  groupPoints,
  statusId,
  onDropFromBacklog,
  onDropStatus,
  onUpdateEstimate
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'ticket',
    drop: (item: { issue: LinearIssue }) => {
      // Check if this is a drop from backlog or a status change
      const isFromBacklog = !item.issue.cycle?.id || item.issue.cycle.id !== issues[0]?.cycle?.id
      
      if (isFromBacklog && onDropFromBacklog) {
        // Drop from backlog - assign to cycle, status, and engineer
        const targetEngineerId = engineerId === 'unassigned' ? undefined : engineerId
        onDropFromBacklog(item.issue, statusId, targetEngineerId)
      } else if (!isFromBacklog && onDropStatus) {
        // Status change within current cycle
        onDropStatus(item.issue, statusId)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  return (
    <div 
      ref={drop}
      className={`flex-shrink-0 w-80 ${isOver ? 'transform scale-105' : ''} transition-transform`}
    >
      <div className={`bg-gray-50 rounded-lg border h-full ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {engineer ? (
              <>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  {engineer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{engineer.name}</h4>
                  <p className="text-sm text-gray-500">
                    {issues.length} {issues.length === 1 ? 'ticket' : 'tickets'} • {groupPoints} {groupPoints === 1 ? 'point' : 'points'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-medium">
                  ?
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Unassigned</h4>
                  <p className="text-sm text-gray-500">
                    {issues.length} {issues.length === 1 ? 'ticket' : 'tickets'} • {groupPoints} {groupPoints === 1 ? 'point' : 'points'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="p-4 space-y-3">
          {issues.map((issue) => (
            <TicketCard 
              key={issue.id} 
              issue={issue} 
              onUpdateEstimate={onUpdateEstimate}
            />
          ))}
          {issues.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              {isOver ? 'Drop ticket here' : 'No tickets'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export interface StatusSectionProps {
  title: string
  issues: LinearIssue[]
  teamMembers: TeamMember[]
  isCollapsed: boolean
  onToggleCollapse: () => void
  onDropTicket: (issue: LinearIssue, engineerId: string) => void
  onDropFromBacklog?: (issue: LinearIssue, statusId: string, engineerId?: string) => void
  onDropStatus?: (issue: LinearIssue, statusId: string) => void
  onUpdateEstimate?: (issueId: string, estimate: number) => void
  statusColor: string
  statusId: string
  groupByEngineer?: boolean
}

export const StatusSection: React.FC<StatusSectionProps> = ({
  title,
  issues,
  teamMembers,
  isCollapsed,
  onToggleCollapse,
  onDropTicket,
  onDropFromBacklog,
  onDropStatus,
  onUpdateEstimate,
  statusColor,
  statusId,
  groupByEngineer = false
}) => {
  const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
  const issueCount = issues.length

  const getEngineerForIssue = (issue: LinearIssue): TeamMember | undefined => {
    return teamMembers.find(member => member.id === issue.assignee?.id)
  }

  // Group issues by engineer or project
  const groupedIssues = React.useMemo(() => {
    if (groupByEngineer) {
      const grouped: Record<string, LinearIssue[]> = {
        'unassigned': []
      }

      // Initialize groups for all team members
      teamMembers.forEach(member => {
        grouped[member.id] = []
      })

      // Group issues by engineer
      issues.forEach(issue => {
        if (issue.assignee?.id && grouped[issue.assignee.id]) {
          grouped[issue.assignee.id].push(issue)
        } else {
          grouped['unassigned'].push(issue)
        }
      })

      // Remove empty groups except unassigned
      Object.keys(grouped).forEach(key => {
        if (key !== 'unassigned' && grouped[key].length === 0) {
          delete grouped[key]
        }
      })

      return grouped
    } else {
      // Group by project and sort by estimate within each project
      const grouped: Record<string, LinearIssue[]> = {
        'no-project': []
      }

      // Group issues by project
      issues.forEach(issue => {
        const projectId = issue.project?.id || 'no-project'
        if (!grouped[projectId]) {
          grouped[projectId] = []
        }
        grouped[projectId].push(issue)
      })

      // Sort issues within each project by estimate (descending)
      Object.keys(grouped).forEach(projectId => {
        grouped[projectId].sort((a, b) => (b.estimate || 0) - (a.estimate || 0))
      })

      // Remove empty groups
      Object.keys(grouped).forEach(key => {
        if (grouped[key].length === 0) {
          delete grouped[key]
        }
      })

      return grouped
    }
  }, [issues, groupByEngineer, teamMembers])

  // Drop zone for the entire section (when not grouped by engineer)
  const [{ isOverSection }, dropSection] = useDrop({
    accept: 'ticket',
    drop: (item: { issue: LinearIssue }) => {
      // Check if this is a drop from backlog (unplanned to planned) or status change (planned to planned)
      const isFromBacklog = !item.issue.cycle?.id || item.issue.cycle.id !== issues[0]?.cycle?.id
      
      if (isFromBacklog && onDropFromBacklog && !groupByEngineer) {
        // Drop from backlog - assign to cycle and status
        onDropFromBacklog(item.issue, statusId)
      } else if (!isFromBacklog && onDropStatus && !groupByEngineer) {
        // Status change within current cycle
        onDropStatus(item.issue, statusId)
      }
    },
    collect: (monitor) => ({
      isOverSection: monitor.isOver({ shallow: true }),
    }),
  })

  return (
    <div 
      ref={groupByEngineer ? undefined : dropSection}
      className={`bg-white rounded-lg shadow-sm border mb-4 ${
        !groupByEngineer && isOverSection 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-200'
      }`}
    >
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${statusColor}`} />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="text-sm text-gray-500">
            {issueCount} {issueCount === 1 ? 'ticket' : 'tickets'} • {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="p-4 pt-0">
          {issues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tickets in this status
            </div>
          ) : groupByEngineer ? (
            // Engineer-grouped view with columns
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Object.entries(groupedIssues).map(([engineerId, groupIssues]) => {
                if (groupIssues.length === 0) return null
                
                const engineer = engineerId === 'unassigned' 
                  ? null 
                  : teamMembers.find(m => m.id === engineerId)
                const groupPoints = groupIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                
                return (
                  <EngineerDropColumn
                    key={engineerId}
                    engineerId={engineerId}
                    engineer={engineer}
                    issues={groupIssues}
                    groupPoints={groupPoints}
                    statusId={statusId}
                    onDropFromBacklog={onDropFromBacklog}
                    onDropStatus={onDropStatus}
                    onUpdateEstimate={onUpdateEstimate}
                  />
                )
              })}
            </div>
          ) : (
            // Project-grouped view
            <div className="space-y-6">
              {Object.entries(groupedIssues)
                .sort(([, issuesA], [, issuesB]) => {
                  const pointsA = issuesA.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                  const pointsB = issuesB.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                  return pointsB - pointsA // Descending order (highest points first)
                })
                .map(([projectId, projectIssues]) => {
                if (projectIssues.length === 0) return null
                
                const project = projectId === 'no-project' 
                  ? null 
                  : issues.find(i => i.project?.id === projectId)?.project
                const projectPoints = projectIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                
                return (
                  <div key={`project-${projectId}`} className="space-y-3">
                    {/* Project Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      {project ? (
                        <>
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: project.color || '#6b7280' }}
                          />
                          <h4 className="font-medium text-gray-900">{project.name}</h4>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-sm bg-gray-400" />
                          <h4 className="font-medium text-gray-900">No Project</h4>
                        </>
                      )}
                      <span className="text-sm text-gray-500">
                        ({projectIssues.length} {projectIssues.length === 1 ? 'ticket' : 'tickets'} • {projectPoints} {projectPoints === 1 ? 'point' : 'points'})
                      </span>
                    </div>
                    
                    {/* Project Issues Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {projectIssues.map((issue) => {
                        const engineer = getEngineerForIssue(issue)
                        return (
                          <div key={issue.id} className="relative">
                            <TicketCard 
                              issue={issue}
                              onUpdateEstimate={onUpdateEstimate}
                            />
                            {engineer && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-white font-medium">
                                  {engineer.name.charAt(0).toUpperCase()}
                                </div>
                                {engineer.name}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}