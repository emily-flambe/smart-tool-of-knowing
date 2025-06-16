import React, { useState } from 'react'
import { useDrag } from 'react-dnd'
import { LinearIssue, PRIORITY_LABELS } from '../types'

interface TicketCardProps {
  issue: LinearIssue
  onUpdateEstimate?: (issueId: string, estimate: number) => void
}

export const TicketCard: React.FC<TicketCardProps> = ({ issue, onUpdateEstimate }) => {
  const [isEditingEstimate, setIsEditingEstimate] = useState(false)
  const [estimateInput, setEstimateInput] = useState(issue.estimate?.toString() || '')
  const [{ isDragging }, drag] = useDrag({
    type: 'ticket',
    item: { issue },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const priorityInfo = PRIORITY_LABELS[issue.priority as keyof typeof PRIORITY_LABELS] || { 
    label: 'Normal', 
    color: 'bg-gray-500', 
    textColor: 'text-gray-600',
    icon: '📝'
  }

  const handleEstimateClick = () => {
    if (onUpdateEstimate) {
      setIsEditingEstimate(true)
      setEstimateInput(issue.estimate?.toString() || '')
    }
  }

  const handleEstimateSubmit = () => {
    if (onUpdateEstimate && estimateInput !== '') {
      const newEstimate = parseInt(estimateInput, 10)
      if (!isNaN(newEstimate) && newEstimate >= 0) {
        onUpdateEstimate(issue.id, newEstimate)
      }
    }
    setIsEditingEstimate(false)
  }

  const handleEstimateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEstimateSubmit()
    } else if (e.key === 'Escape') {
      setIsEditingEstimate(false)
      setEstimateInput(issue.estimate?.toString() || '')
    }
  }

  return (
    <div
      ref={drag}
      className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono text-gray-500">{issue.identifier}</span>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors"
            title="Open in Linear"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              window.open(issue.url, '_blank', 'noopener,noreferrer')
            }}
            draggable={false}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-2">
          {isEditingEstimate ? (
            <input
              type="number"
              value={estimateInput}
              onChange={(e) => setEstimateInput(e.target.value)}
              onBlur={handleEstimateSubmit}
              onKeyDown={handleEstimateKeyDown}
              className="w-12 px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full text-center border-none outline-none"
              autoFocus
              min="0"
            />
          ) : issue.estimate ? (
            <button
              onClick={handleEstimateClick}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
              title="Click to edit estimate"
            >
              {issue.estimate}
            </button>
          ) : onUpdateEstimate ? (
            <button
              onClick={handleEstimateClick}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              title="Click to add estimate"
            >
              ?
            </button>
          ) : null}
          <span 
            className="text-sm" 
            title={`${priorityInfo.label} Priority`}
          >
            {priorityInfo.icon}
          </span>
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
              style={{ backgroundColor: issue.project.color || '#1e40af' }}
            />
            <span className="text-xs text-gray-600">{issue.project.name}</span>
          </div>
        )}
        
        <span className="text-xs text-gray-500 capitalize">{issue.state.name}</span>
      </div>
    </div>
  )
}