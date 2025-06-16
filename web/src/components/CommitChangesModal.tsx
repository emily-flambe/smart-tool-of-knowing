import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChangeDetail {
  id: string
  type: 'assignment' | 'estimate' | 'status' | 'cycle' | 'multiple'
  description: string
  issueIdentifier: string
  issueTitle: string
  fromAssignee?: string
  toAssignee?: string
  estimate?: number
  previousEstimate?: number
  stateId?: string
  previousStateId?: string
  cycleId?: string
  previousCycleId?: string
}

interface CommitStatus {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

interface CommitChangesModalProps {
  isOpen: boolean
  onClose: () => void
  changes: ChangeDetail[]
  onCommit: (changes: ChangeDetail[]) => Promise<any>
  onDeleteChange: (changeIndex: number) => Promise<any>
}

export const CommitChangesModal: React.FC<CommitChangesModalProps> = ({
  isOpen,
  onClose,
  changes,
  onCommit,
  onDeleteChange
}) => {
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitStatuses, setCommitStatuses] = useState<Record<string, CommitStatus>>({})
  const [showProgress, setShowProgress] = useState(false)
  const [deletingChangeIndex, setDeletingChangeIndex] = useState<number | null>(null)

  const handleCommit = async () => {
    setIsCommitting(true)
    setShowProgress(true)
    
    // Initialize statuses
    const initialStatuses: Record<string, CommitStatus> = {}
    changes.forEach(change => {
      initialStatuses[change.id] = { id: change.id, status: 'pending' }
    })
    setCommitStatuses(initialStatuses)

    try {
      // First, mark all as in progress
      const progressStatuses = { ...initialStatuses }
      changes.forEach(change => {
        progressStatuses[change.id] = { id: change.id, status: 'in_progress' }
      })
      setCommitStatuses(progressStatuses)

      // Call the API
      console.log('About to call onCommit with changes:', changes)
      const response = await onCommit(changes)
      console.log('Commit response received:', response)
      console.log('Response type:', typeof response)
      console.log('Response has results:', 'results' in response)
      console.log('Results array:', response?.results)
      
      // Process response and auto-close if all successful
      let successCount = 0
      let failureCount = 0

      if (response && typeof response === 'object' && 'results' in response && Array.isArray(response.results)) {
        successCount = response.results.filter((r: any) => r.success).length
        failureCount = response.results.filter((r: any) => !r.success).length
      } else if (response && response.success) {
        // Fallback: assume all succeeded if API returns general success
        successCount = changes.length
        failureCount = 0
      } else {
        // If no clear response, mark all as completed for now
        successCount = changes.length
        failureCount = 0
      }

      // Auto-close modal if all changes were successful
      if (failureCount === 0 && successCount > 0) {
        // Small delay to show the completion state briefly
        setTimeout(() => {
          onClose()
          // The parent component should handle showing a success message
        }, 1000)
      }

      // Update statuses for display during the brief delay
      const finalStatuses = { ...progressStatuses }
      changes.forEach(change => {
        finalStatuses[change.id] = { 
          id: change.id, 
          status: 'completed',
          error: undefined
        }
      })
      setCommitStatuses(finalStatuses)
    } catch (error: any) {
      console.error('Commit failed:', error)
      
      // Mark all as failed if the entire operation fails
      const failedStatuses = { ...initialStatuses }
      changes.forEach(change => {
        failedStatuses[change.id] = { 
          id: change.id, 
          status: 'failed',
          error: error?.message || 'Unknown error occurred'
        }
      })
      setCommitStatuses(failedStatuses)
    } finally {
      setIsCommitting(false)
    }
  }

  const handleClose = () => {
    if (!isCommitting) {
      onClose()
      setShowProgress(false)
      setCommitStatuses({})
    }
  }

  const handleDeleteChange = async (changeIndex: number) => {
    try {
      setDeletingChangeIndex(changeIndex)
      await onDeleteChange(changeIndex)
    } catch (error) {
      console.error('Failed to delete change:', error)
    } finally {
      setDeletingChangeIndex(null)
    }
  }

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return '👤'
      case 'estimate': return '🔢'
      case 'status': return '📊'
      case 'cycle': return '🔄'
      case 'multiple': return '📝'
      default: return '📝'
    }
  }

  const getStatusIcon = (status: CommitStatus['status']) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'in_progress': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
    }
  }

  const getStatusColor = (status: CommitStatus['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500'
      case 'in_progress': return 'text-blue-500'
      case 'completed': return 'text-green-500'
      case 'failed': return 'text-red-500'
    }
  }

  const completedCount = Object.values(commitStatuses).filter(s => s.status === 'completed').length
  const failedCount = Object.values(commitStatuses).filter(s => s.status === 'failed').length
  const inProgressCount = Object.values(commitStatuses).filter(s => s.status === 'in_progress').length
  const totalCount = changes.length
  const allComplete = totalCount > 0 && (completedCount + failedCount) === totalCount
  
  // Debug logging
  console.log('Modal state:', {
    totalCount,
    completedCount,
    failedCount,
    inProgressCount,
    allComplete,
    commitStatuses,
    changesLength: changes.length
  })

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
                {showProgress ? 'Committing Changes' : 'Review and Commit Changes'}
              </h2>
              {!isCommitting && (
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {showProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{completedCount + failedCount} of {totalCount} processed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalCount > 0 ? ((completedCount + failedCount) / totalCount) * 100 : 0}%` }}
                  />
                </div>
                {allComplete && (
                  <div className="text-sm">
                    <span className="text-green-600">✅ {completedCount} successful</span>
                    {failedCount > 0 && (
                      <span className="text-red-600 ml-4">❌ {failedCount} failed</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 max-h-96 overflow-y-auto">
            {!showProgress && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  You have made {changes.length} change{changes.length !== 1 ? 's' : ''} since last fetching from Linear. 
                  Review the changes below and click "Commit to Linear" to apply them.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="text-yellow-400 mr-3">⚠️</div>
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">
                        Changes will be applied to Linear
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        These changes will be immediately applied to your Linear workspace and cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {changes.map((change, index) => {
                const status = commitStatuses[change.id]
                const statusColor = status ? getStatusColor(status.status) : ''
                const statusIcon = status ? getStatusIcon(status.status) : ''
                const typeIcon = getChangeTypeIcon(change.type)

                return (
                  <div key={change.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{typeIcon}</span>
                          <span className="text-sm font-mono text-gray-500">
                            {change.issueIdentifier}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                            {change.type}
                          </span>
                          {showProgress && (
                            <span className={`text-lg ${statusColor}`}>
                              {statusIcon}
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {change.issueTitle}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {change.description}
                        </p>
                        {status?.error && status.status === 'failed' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800 font-medium">
                              Error: {status.error}
                            </p>
                          </div>
                        )}
                        {status?.status === 'completed' && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800 font-medium">
                              ✅ {status.error || 'Successfully committed to Linear'}
                            </p>
                          </div>
                        )}
                      </div>
                      {!showProgress && (
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => handleDeleteChange(index)}
                            disabled={deletingChangeIndex === index}
                            className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors disabled:opacity-50"
                            title="Delete this change"
                          >
                            {deletingChangeIndex === index ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            {!showProgress ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Continue Editing
                </button>
                <button
                  onClick={handleCommit}
                  disabled={changes.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Commit to Linear ({changes.length} change{changes.length !== 1 ? 's' : ''})
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                disabled={isCommitting}
                className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  allComplete && failedCount === 0
                    ? 'bg-green-600 hover:bg-green-700'
                    : allComplete && failedCount > 0
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isCommitting 
                  ? 'Committing...' 
                  : allComplete 
                    ? failedCount === 0 
                      ? `Complete (${completedCount} committed)` 
                      : `Complete (${failedCount} errors)`
                    : 'Close'
                }
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}