import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FetchDataButtonProps {
  onFetchData: () => Promise<void>
  hasLocalChanges: boolean
  isLoading: boolean
}

export const FetchDataButton: React.FC<FetchDataButtonProps> = ({
  onFetchData,
  hasLocalChanges,
  isLoading
}) => {
  const [showWarning, setShowWarning] = useState(false)

  const handleClick = () => {
    if (hasLocalChanges && !showWarning) {
      setShowWarning(true)
      return
    }
    setShowWarning(false)
    onFetchData()
  }

  const handleCancel = () => {
    setShowWarning(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          hasLocalChanges
            ? 'bg-orange-600 hover:bg-orange-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Fetching...
          </div>
        ) : (
          <>
            {hasLocalChanges ? '⚠️ ' : '🔄 '}
            Fetch from Linear
          </>
        )}
      </button>

      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute top-full left-0 mt-2 p-4 bg-white rounded-lg shadow-lg border border-orange-200 z-50 min-w-80"
          >
            <div className="flex items-start gap-3">
              <div className="text-orange-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-2">
                  Overwrite Local Changes?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You have local changes that will be lost when fetching fresh data from Linear. 
                  This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleClick}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded"
                  >
                    Fetch Anyway
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}