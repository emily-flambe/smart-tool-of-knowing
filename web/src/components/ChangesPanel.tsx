import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChangeDetail } from '../api/client'

interface ChangesPanelProps {
  changes: ChangeDetail[]
  lastFetched: string
  onReset: () => Promise<void>
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({
  changes,
  lastFetched,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  if (changes.length === 0) {
    return null
  }

  const getChangeIcon = (type: string) => {
    return type === 'assignment' ? '➡️' : '⬅️'
  }

  const getChangeDescription = (change: ChangeDetail) => {
    if (change.type === 'assignment') {
      return `Assigned to ${change.toEngineer?.name || 'Unknown'}`
    } else {
      return `Unassigned from ${change.fromEngineer?.name || 'Unknown'}`
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">📝</span>
          <h3 className="font-medium text-amber-800">
            {changes.length} Local Change{changes.length !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-amber-600 hover:text-amber-800 text-sm"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-amber-700 hover:text-amber-900 underline"
        >
          Reset All
        </button>
      </div>

      <div className="text-sm text-amber-700 mb-3">
        Since {new Date(lastFetched).toLocaleString()}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            {changes.map((change, index) => (
              <div
                key={`${change.issueId}-${change.timestamp}`}
                className="flex items-start gap-3 p-2 bg-white rounded border border-amber-100"
              >
                <span className="text-lg">{getChangeIcon(change.type)}</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {change.issue?.identifier} {change.issue?.title}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getChangeDescription(change)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(change.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}