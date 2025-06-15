import React from 'react'
import { useDrag } from 'react-dnd'
import { LinearIssue, PRIORITY_LABELS } from '../types'

interface TicketCardProps {
  issue: LinearIssue
}

export const TicketCard: React.FC<TicketCardProps> = ({ issue }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'ticket',
    item: { issue },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const priorityInfo = PRIORITY_LABELS[issue.priority as keyof typeof PRIORITY_LABELS]

  return (
    <div
      ref={drag}
      className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-mono text-gray-500">{issue.identifier}</span>
        <div className="flex items-center gap-2">
          {issue.estimate && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {issue.estimate}
            </span>
          )}
          <div className={`w-2 h-2 rounded-full ${priorityInfo.color}`} />
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2">
        {issue.title}
      </h3>
      
      <div className="flex items-center justify-between">
        {issue.project && (
          <div className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: issue.project.color }}
            />
            <span className="text-xs text-gray-600">{issue.project.name}</span>
          </div>
        )}
        
        <span className="text-xs text-gray-500 capitalize">{issue.state.name}</span>
      </div>
    </div>
  )
}