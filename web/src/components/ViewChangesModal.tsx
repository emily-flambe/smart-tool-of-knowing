import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChangeDetail } from '../api/client'

interface ViewChangesModalProps {
  isOpen: boolean
  onClose: () => void
  changes: ChangeDetail[]
  lastFetched?: string
  onDeleteChange?: (changeIndex: number) => Promise<void>
}

export const ViewChangesModal: React.FC<ViewChangesModalProps> = ({
  isOpen,
  onClose,
  changes,
  lastFetched,
  onDeleteChange
}) => {
  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment':
      case 'unassignment':
        return '👤'
      case 'estimate':
        return '📊'
      case 'status':
        return '🔄'
      case 'cycle':
        return '📅'
      default:
        return '📝'
    }
  }

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'assignment':
        return 'Assignment'
      case 'unassignment':
        return 'Unassignment'
      case 'estimate':
        return 'Estimate'
      case 'status':
        return 'Status'
      case 'cycle':
        return 'Cycle'
      default:
        return 'Change'
    }
  }

  const formatChangeDescription = (change: ChangeDetail) => {
    if (change.type === 'assignment' || change.type === 'unassignment') {
      if (change.fromEngineer && change.toEngineer) {
        return `Reassigned from ${change.fromEngineer.name} to ${change.toEngineer.name}`
      } else if (change.toEngineer) {
        return `Assigned to ${change.toEngineer.name}`
      } else if (change.fromEngineer) {
        return `Unassigned from ${change.fromEngineer.name}`
      }
    } else if (change.type === 'estimate') {
      const prevEstimate = change.previousEstimate || 'unset'
      const newEstimate = change.estimate || 0
      return `Updated estimate from ${prevEstimate} to ${newEstimate} points`
    }
    
    return 'Modified'
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Changes Since Last Fetch
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {lastFetched && (
              <p className="text-sm text-gray-600 mt-2">
                Last fetched: {new Date(lastFetched).toLocaleString()}
              </p>
            )}
            
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                {changes.length} change{changes.length !== 1 ? 's' : ''} pending
              </span>
              {changes.length > 0 && (
                <span className="text-blue-600">
                  Ready to commit to Linear
                </span>
              )}
            </div>
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {changes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">No changes made</h3>
                <p className="text-sm">You haven't made any changes since the last fetch from Linear.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {changes.map((change, index) => (
                  <div key={`${change.issueId}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg" title={getChangeTypeLabel(change.type)}>
                            {getChangeTypeIcon(change.type)}
                          </span>
                          <span className="text-sm font-mono text-gray-500">
                            {change.issue?.identifier || change.issueId}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {getChangeTypeLabel(change.type)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {change.issue?.title || 'Unknown Issue'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatChangeDescription(change)}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(change.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {onDeleteChange && (
                        <button
                          onClick={() => onDeleteChange(index)}
                          className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete this change"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {changes.length > 0 && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue Editing
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}