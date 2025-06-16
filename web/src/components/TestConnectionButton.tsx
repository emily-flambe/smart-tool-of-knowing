import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { planningApi, HealthCheckResponse, LinearTestResponse } from '../api/client'

interface TestConnectionButtonProps {
  className?: string
}

export const TestConnectionButton: React.FC<TestConnectionButtonProps> = ({ className = '' }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    health?: HealthCheckResponse
    linearTest?: LinearTestResponse
    error?: any
  } | null>(null)

  const runTests = async () => {
    setIsLoading(true)
    setResult(null)

    try {
      // Test API server health
      const health = await planningApi.healthCheck()
      
      // Test Linear connection
      let linearTest: LinearTestResponse | undefined
      try {
        linearTest = await planningApi.testLinear()
      } catch (error: any) {
        // If Linear test fails, capture the error response
        linearTest = error.response?.data || {
          success: false,
          error: 'Connection failed',
          message: error.message
        }
      }

      setResult({ health, linearTest })
    } catch (error) {
      console.error('Connection test failed:', error)
      setResult({ error })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return '✅'
      case 'connected': return '✅'
      case 'not_configured': return '⚠️'
      case 'error': return '❌'
      default: return '🔍'
    }
  }

  const getStatusColor = (success: boolean | undefined, status?: string) => {
    if (success === false || status === 'error') return 'text-red-600'
    if (success === true || status === 'ok') return 'text-green-600'
    return 'text-yellow-600'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <button
        onClick={runTests}
        disabled={isLoading}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Testing...
          </div>
        ) : (
          '🔍 Test Connection'
        )}
      </button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-3"
        >
          <h3 className="font-medium text-gray-900">Connection Test Results</h3>

          {/* API Server Health */}
          {result.health && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{getStatusIcon(result.health.status)}</span>
                <span className="text-sm font-medium">API Server</span>
                <span className={`text-sm ${getStatusColor(result.health.status === 'ok')}`}>
                  {result.health.status === 'ok' ? 'Running' : 'Error'}
                </span>
              </div>
              
              {result.health.linear && (
                <div className="ml-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <span>{getStatusIcon(result.health.linear.status)}</span>
                    <span className="text-sm">Linear Configuration</span>
                    <span className={`text-sm ${getStatusColor(result.health.linear.configured)}`}>
                      {result.health.linear.configured ? 'Configured' : 'Not Configured'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">
                    {result.health.linear.message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Linear API Test */}
          {result.linearTest && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{result.linearTest.success ? '✅' : '❌'}</span>
                <span className="text-sm font-medium">Linear API</span>
                <span className={`text-sm ${getStatusColor(result.linearTest.success)}`}>
                  {result.linearTest.success ? 'Connected' : 'Failed'}
                </span>
              </div>
              
              <p className="text-xs text-gray-600 ml-6">
                {result.linearTest.message}
              </p>

              {result.linearTest.data && (
                <div className="ml-6 text-xs text-gray-500 space-y-1">
                  <div>User: {result.linearTest.data.user}</div>
                  <div>Workspace: {result.linearTest.data.workspace}</div>
                </div>
              )}

              {result.linearTest.error && !result.linearTest.success && (
                <div className="ml-6 p-2 bg-red-50 rounded text-xs text-red-700">
                  <div className="font-medium">Error: {result.linearTest.error}</div>
                  {result.linearTest.helpUrl && (
                    <div className="mt-1">
                      <a 
                        href={result.linearTest.helpUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        Get Linear API Key →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* General Error */}
          {result.error && (
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <span>❌</span>
                <span className="text-sm font-medium text-red-800">Connection Failed</span>
              </div>
              <p className="text-xs text-red-700">
                Could not connect to API server. Make sure it's running on port 3001.
              </p>
              <div className="mt-2 text-xs text-red-600 font-mono">
                Try: make api
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 border-t pt-2">
            Tested at {new Date().toLocaleTimeString()}
          </div>
        </motion.div>
      )}
    </div>
  )
}