import React, { useState, useEffect } from 'react'
import { LinearCycle } from '../types'
import { CycleSelector } from '../components/CycleSelector'
import { OverviewCards } from '../components/OverviewCards'
import { ErrorMessage } from '../components/ErrorMessage'
import { useCycleReviewData } from '../hooks/useCycleReviewData'

export function CycleReviewPage() {
  const [selectedCycle, setSelectedCycle] = useState<LinearCycle | null>(null)
  const [availableCycles, setAvailableCycles] = useState<LinearCycle[]>([])
  const [isLoadingCycles, setIsLoadingCycles] = useState(true)
  const [cyclesError, setCyclesError] = useState<string | null>(null)

  const {
    cycleReviewData,
    isLoading: isLoadingReview,
    error: reviewError,
    refetch
  } = useCycleReviewData(selectedCycle?.id || null)

  // Fetch available completed cycles on mount
  useEffect(() => {
    const fetchCompletedCycles = async () => {
      try {
        setIsLoadingCycles(true)
        setCyclesError(null)
        
        const response = await fetch('/api/completed-cycles')
        if (!response.ok) {
          throw new Error(`Failed to fetch cycles: ${response.status}`)
        }
        
        const data = await response.json()
        const cycles = data.cycles.map((cycle: any) => ({
          id: cycle.id,
          name: cycle.name,
          number: cycle.number,
          startsAt: cycle.startedAt,
          endsAt: cycle.completedAt,
          team: cycle.team
        }))
        
        setAvailableCycles(cycles)
        
        // Auto-select the most recent cycle
        if (cycles.length > 0) {
          setSelectedCycle(cycles[0])
        }
      } catch (error: any) {
        console.error('Error fetching completed cycles:', error)
        setCyclesError(error.message)
      } finally {
        setIsLoadingCycles(false)
      }
    }

    fetchCompletedCycles()
  }, [])

  const handleCycleChange = (cycle: LinearCycle) => {
    setSelectedCycle(cycle)
  }

  if (isLoadingCycles) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading completed cycles...</div>
      </div>
    )
  }

  if (cyclesError) {
    return (
      <div className="p-6">
        <ErrorMessage 
          title="Failed to load cycles"
          message={cyclesError}
          suggestion="Check your Linear API connection and try refreshing the page."
        />
      </div>
    )
  }

  if (availableCycles.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Completed Cycles Found</h2>
          <p className="text-gray-600">
            No completed cycles were found in your Linear workspace. 
            Complete some cycles to see their reviews here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">
                Review completed work and team performance for past cycles
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <CycleSelector
                cycles={availableCycles}
                selectedCycle={selectedCycle}
                onCycleChange={handleCycleChange}
                showActiveOnly={false}
              />
              
              {/* Export button placeholder */}
              <button
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled
              >
                Export ▼
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!selectedCycle ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Select a cycle to view its review</p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="mb-8">
              <OverviewCards
                cycleReviewData={cycleReviewData}
                isLoading={isLoadingReview}
                error={reviewError}
              />
            </div>

            {/* Error handling for review data */}
            {reviewError && (
              <div className="mb-6">
                <ErrorMessage
                  title="Failed to load cycle review data"
                  message={reviewError}
                  suggestion="Try selecting a different cycle or check your connection."
                  onRetry={() => refetch()}
                />
              </div>
            )}

            {/* Tab Navigation - Placeholder for Phase 3 */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button className="py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm">
                    Summary
                  </button>
                  <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                    By Project
                  </button>
                  <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                    By Engineer
                  </button>
                  <button className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm">
                    Timeline
                  </button>
                </nav>
              </div>
              
              {/* Content Area - Placeholder for Phase 3 */}
              <div className="p-6">
                {isLoadingReview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-lg text-gray-600">Loading cycle review data...</div>
                  </div>
                ) : cycleReviewData ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cycle Overview</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Cycle:</span>
                            <div className="font-medium">{cycleReviewData.cycle?.name || 'Unnamed Cycle'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <div className="font-medium">
                              {cycleReviewData.cycle ? (
                                `${Math.ceil((new Date(cycleReviewData.cycle.completedAt).getTime() - 
                                  new Date(cycleReviewData.cycle.startedAt).getTime()) / (1000 * 60 * 60 * 24))} days`
                              ) : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Started:</span>
                            <div className="font-medium">
                              {cycleReviewData.cycle ? 
                                new Date(cycleReviewData.cycle.startedAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Completed:</span>
                            <div className="font-medium">
                              {cycleReviewData.cycle ? 
                                new Date(cycleReviewData.cycle.completedAt).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Issues Summary */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Completed Issues ({cycleReviewData.stats.totalIssues})
                      </h3>
                      <div className="bg-white border rounded-lg">
                        <div className="px-4 py-3 bg-gray-50 border-b rounded-t-lg">
                          <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                            <span>Issue</span>
                            <span>Project</span>
                            <span>Assignee</span>
                            <span>Points</span>
                          </div>
                        </div>
                        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                          {cycleReviewData.issues.slice(0, 20).map((issue: any) => (
                            <div key={issue.id} className="px-4 py-3 hover:bg-gray-50">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">
                                    {issue.identifier}: {issue.title}
                                  </div>
                                  <div className="text-gray-500 text-xs mt-1">
                                    Completed {new Date(issue.completedAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="ml-4 text-gray-600 min-w-0 flex-shrink-0">
                                  {issue.project?.name || 'No Project'}
                                </div>
                                <div className="ml-4 text-gray-600 min-w-0 flex-shrink-0">
                                  {issue.assignee?.name || 'Unassigned'}
                                </div>
                                <div className="ml-4 text-gray-900 font-medium min-w-0 flex-shrink-0">
                                  {issue.estimate || 0}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {cycleReviewData.issues.length > 20 && (
                          <div className="px-4 py-3 bg-gray-50 border-t text-center text-sm text-gray-600">
                            Showing first 20 of {cycleReviewData.issues.length} issues
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-600">
                    No data available for this cycle
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}