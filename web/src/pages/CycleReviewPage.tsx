import React, { useState, useEffect } from 'react'
import { LinearCycle } from '../types'
import { CycleSelector } from '../components/CycleSelector'
import { OverviewCards } from '../components/OverviewCards'
import { ErrorMessage } from '../components/ErrorMessage'
import { TestConnectionButton } from '../components/TestConnectionButton'
import { FetchDataButton } from '../components/FetchDataButton'
import { SortableIssuesTable } from '../components/SortableIssuesTable'
import { NewsletterView } from '../components/NewsletterView'
import { useCycleReviewData } from '../hooks/useCycleReviewData'

export function CycleReviewPage() {
  const [selectedCycle, setSelectedCycle] = useState<LinearCycle | null>(null)
  const [availableCycles, setAvailableCycles] = useState<LinearCycle[]>([])
  const [isLoadingCycles, setIsLoadingCycles] = useState(true)
  const [cyclesError, setCyclesError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'newsletter'>('summary')

  const {
    cycleReviewData,
    isLoading: isLoadingReview,
    error: reviewError,
    refetch
  } = useCycleReviewData(selectedCycle?.id || null)

  // Fetch available cycles (completed + active) on mount
  useEffect(() => {
    const fetchReviewableCycles = async () => {
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
          team: cycle.team,
          status: 'completed', // All cycles from completed-cycles are completed
          isActive: false // No active cycles from this endpoint
        }))
        
        setAvailableCycles(cycles)
        
        // Auto-select the most recent completed cycle
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

    fetchReviewableCycles()
  }, [])

  const handleCycleChange = (cycle: LinearCycle) => {
    setSelectedCycle(cycle)
  }

  const handleRefreshData = async () => {
    // Refresh the cycles list
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
        team: cycle.team,
        status: 'completed', // All cycles from completed-cycles are completed
        isActive: false // No active cycles from this endpoint
      }))
      
      setAvailableCycles(cycles)
      
      // If current cycle is still in the list, keep it selected, otherwise select the most recent
      if (selectedCycle && cycles.find((c: LinearCycle) => c.id === selectedCycle.id)) {
        // Keep current selection but trigger a refetch of its data
        refetch()
      } else if (cycles.length > 0) {
        setSelectedCycle(cycles[0])
      }
    } catch (error: any) {
      console.error('Error refreshing cycles:', error)
      setCyclesError(error.message)
    } finally {
      setIsLoadingCycles(false)
    }
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
          error={cyclesError}
          title="Failed to load cycles"
        />
      </div>
    )
  }

  if (availableCycles.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Reviewable Cycles Found</h2>
          <p className="text-gray-600">
            No completed or active cycles were found in your Linear workspace. 
            Create and work on cycles to see their reviews here.
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
                Review completed work and team performance for cycles
                {selectedCycle?.isActive && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (Currently viewing active cycle)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <FetchDataButton
                onFetchData={handleRefreshData}
                hasLocalChanges={false}
                isLoading={isLoadingCycles}
              />
              
              <TestConnectionButton />
              
              <CycleSelector
                cycles={availableCycles}
                selectedCycle={selectedCycle}
                onSelectCycle={handleCycleChange}
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
                cycleReviewData={cycleReviewData || null}
                isLoading={isLoadingReview}
                error={reviewError || null}
              />
            </div>

            {/* Error handling for review data */}
            {reviewError && (
              <div className="mb-6">
                <ErrorMessage
                  error={reviewError}
                  title="Failed to load cycle review data"
                />
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button 
                    onClick={() => setActiveTab('summary')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'summary' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Summary
                  </button>
                  <button 
                    onClick={() => setActiveTab('newsletter')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'newsletter' 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Newsletter View
                  </button>
                </nav>
              </div>
              
              {/* Content Area */}
              <div className="p-6">
                {isLoadingReview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-lg text-gray-600">Loading cycle review data...</div>
                  </div>
                ) : cycleReviewData ? (
                  <>
                    {activeTab === 'summary' && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Cycle Overview</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Cycle:</span>
                                <div className="font-medium">{selectedCycle?.name || `Cycle ${selectedCycle?.number || 'Unknown'}`}</div>
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
                          <SortableIssuesTable issues={cycleReviewData.issues} />
                        </div>
                      </div>
                    )}

                    {activeTab === 'newsletter' && (
                      <NewsletterView issues={cycleReviewData.issues} />
                    )}
                  </>
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