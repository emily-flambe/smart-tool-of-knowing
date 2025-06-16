import React from 'react'
import { useDrop } from 'react-dnd'
import { LinearIssue, TeamMember } from '../types'
import { TicketCard } from './TicketCard'
import { STATUS_CATEGORIES, categorizeIssuesByStatus } from '../utils/statusCategories'

interface StatusGroupProps {
  statusTitle: string
  statusColor: string
  statusId: string
  issues: LinearIssue[]
  onDropFromBacklog?: (issue: LinearIssue, statusId: string, engineerId?: string) => void
  onUnifiedDrop?: (issue: LinearIssue, targetEngineerId: string | undefined, targetStatusId: string) => void
  onUpdateEstimate?: (issueId: string, estimate: number) => void
  engineerId: string
}

const StatusGroup: React.FC<StatusGroupProps> = ({
  statusTitle,
  statusColor,
  statusId,
  issues,
  onDropFromBacklog,
  onUnifiedDrop,
  onUpdateEstimate,
  engineerId
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'ticket',
    drop: (item: { issue: LinearIssue }) => {
      const targetEngineerId = engineerId === 'unassigned' ? undefined : engineerId
      
      // Simple detection: if issue has assignee, it's from planning view
      const isFromPlanningView = item.issue.assignee?.id !== undefined
      
      console.log(`🎯 Simple drop:`, {
        issueId: item.issue.identifier,
        isFromPlanningView,
        targetEngineerId,
        targetStatusId: statusId
      })
      
      if (isFromPlanningView && onUnifiedDrop) {
        // Drop from within planning view - use unified handler
        onUnifiedDrop(item.issue, targetEngineerId, statusId)
      } else if (onDropFromBacklog) {
        // Drop from Backlog++ - use backlog handler
        onDropFromBacklog(item.issue, statusId, targetEngineerId)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)

  if (issues.length === 0) {
    return (
      <div 
        ref={drop}
        className={`min-h-24 border-2 border-dashed rounded-lg p-4 ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <h5 className="text-sm font-medium text-gray-600">{statusTitle}</h5>
        </div>
        <div className="text-center text-xs text-gray-400">
          {isOver ? 'Drop ticket here' : 'No tickets'}
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={drop}
      className={`border rounded-lg p-4 ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <h5 className="text-sm font-medium text-gray-700">{statusTitle}</h5>
        <span className="text-xs text-gray-500">
          {issues.length} {issues.length === 1 ? 'ticket' : 'tickets'} • {totalPoints} {totalPoints === 1 ? 'pt' : 'pts'}
        </span>
      </div>
      
      <div className="space-y-2">
        {issues.map((issue) => (
          <TicketCard 
            key={issue.id} 
            issue={issue} 
            onUpdateEstimate={onUpdateEstimate}
          />
        ))}
      </div>
    </div>
  )
}

export interface EngineerSectionProps {
  engineer: TeamMember | null
  engineerId: string
  allIssues: LinearIssue[]
  isCollapsed: boolean
  onToggleCollapse: () => void
  onDropFromBacklog?: (issue: LinearIssue, statusId: string, engineerId?: string) => void
  onUnifiedDrop?: (issue: LinearIssue, targetEngineerId: string | undefined, targetStatusId: string) => void
  onUpdateEstimate?: (issueId: string, estimate: number) => void
}

export const EngineerSection: React.FC<EngineerSectionProps> = ({
  engineer,
  engineerId,
  allIssues,
  isCollapsed,
  onToggleCollapse,
  onDropFromBacklog,
  onUnifiedDrop,
  onUpdateEstimate
}) => {
  const totalPoints = allIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
  const issueCount = allIssues.length

  // Group issues by status using the centralized categorization function
  const issuesByStatus = React.useMemo(() => {
    return categorizeIssuesByStatus(allIssues)
  }, [allIssues])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-3">
          {engineer ? (
            <>
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                {engineer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{engineer.name}</h3>
                <div className="text-sm text-gray-500">
                  {issueCount} {issueCount === 1 ? 'ticket' : 'tickets'} • {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-medium text-lg">
                ?
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Unassigned</h3>
                <div className="text-sm text-gray-500">
                  {issueCount} {issueCount === 1 ? 'ticket' : 'tickets'} • {totalPoints} {totalPoints === 1 ? 'point' : 'points'}
                </div>
              </div>
            </>
          )}
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
          <div className="flex gap-4 overflow-x-auto">
            {STATUS_CATEGORIES.map((category) => {
              const categoryIssues = issuesByStatus[category.id] || []
              return (
                <div key={category.id} className="flex-shrink-0 w-64">
                  <StatusGroup
                    statusTitle={category.title}
                    statusColor={category.color}
                    statusId={category.id}
                    issues={categoryIssues}
                    onDropFromBacklog={onDropFromBacklog}
                    onUnifiedDrop={onUnifiedDrop}
                    onUpdateEstimate={onUpdateEstimate}
                    engineerId={engineerId}
                  />
                </div>
              )
            })}
          </div>
          {issueCount === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Drag tickets here to assign to {engineer?.name || 'this engineer'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}