import React from 'react'

interface ErrorMessageProps {
  error: any
  title?: string
  showDetails?: boolean
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error, 
  title = 'Error',
  showDetails = false 
}) => {
  if (!error) return null

  const getErrorMessage = (error: any): string => {
    if (error?.code === 'ERR_NETWORK') {
      return 'Unable to connect to the API server. Make sure it\'s running on port 3001.'
    }
    
    if (error?.message) {
      return error.message
    }
    
    if (typeof error === 'string') {
      return error
    }
    
    return 'An unexpected error occurred'
  }

  const getErrorSuggestion = (error: any): string | null => {
    if (error?.code === 'ERR_NETWORK') {
      return 'Try running: npm run api-server'
    }
    
    if (error?.response?.status === 500) {
      return 'Check that Linear API is configured correctly'
    }
    
    return null
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="text-red-500 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-medium text-red-800 mb-1">{title}</h3>
          <p className="text-sm text-red-700 mb-2">
            {getErrorMessage(error)}
          </p>
          
          {getErrorSuggestion(error) && (
            <div className="bg-red-100 rounded-md p-2 mb-2">
              <p className="text-xs text-red-600 font-mono">
                {getErrorSuggestion(error)}
              </p>
            </div>
          )}
          
          {showDetails && error && (
            <details className="mt-2">
              <summary className="text-xs text-red-600 cursor-pointer">
                Technical details
              </summary>
              <pre className="text-xs text-red-500 mt-1 overflow-auto max-h-32 bg-red-100 p-2 rounded">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}