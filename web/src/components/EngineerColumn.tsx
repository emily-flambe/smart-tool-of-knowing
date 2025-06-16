import React from 'react'
import { useDrop } from 'react-dnd'
import { TeamMember, LinearIssue } from '../types'
import { TicketCard } from './TicketCard'

interface EngineerColumnProps {
  engineer: TeamMember
  issues: LinearIssue[]
  onDropTicket: (issue: LinearIssue, engineerId: string) => void
}

export const EngineerColumn: React.FC<EngineerColumnProps> = ({
  engineer,
  issues,
  onDropTicket,
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'ticket',
    drop: (item: { issue: LinearIssue }) => {
      onDropTicket(item.issue, engineer.id)
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)

  const getLoadColor = (points: number) => {
    if (points > 10) return 'text-red-600'
    if (points >= 6) return 'text-gray-800'
    return 'text-blue-600'
  }

  return (
    <div className="min-w-80 max-w-80">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              {engineer.name.charAt(0)}
            </div>
            <h3 className="font-medium text-gray-900">{engineer.name}</h3>
          </div>
          <div className={`text-sm font-medium ${getLoadColor(totalPoints)}`}>
            {totalPoints} story points
          </div>
        </div>
        
        <div
          ref={drop}
          className={`min-h-96 p-4 space-y-3 ${
            isOver ? 'bg-blue-50 border-blue-200' : ''
          }`}
        >
          {issues.map((issue) => (
            <TicketCard key={issue.id} issue={issue} />
          ))}
          
          {issues.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              Drop tickets here
            </div>
          )}
        </div>
      </div>
    </div>
  )
}