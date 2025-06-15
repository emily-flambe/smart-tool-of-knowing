import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planningApi, PlanningState, ChangeDetail } from '../api/client'
import { LinearIssue, TeamMember } from '../types'

export const usePlanningData = () => {
  const queryClient = useQueryClient()
  const [isInitialized, setIsInitialized] = useState(false)

  // Query for planning state
  const {
    data: planningState,
    isLoading: isLoadingState,
    error: stateError,
    refetch: refetchState
  } = useQuery({
    queryKey: ['planning-state'],
    queryFn: planningApi.getPlanningState,
    enabled: isInitialized,
    retry: false
  })

  // Query for changes
  const {
    data: changesData,
    refetch: refetchChanges
  } = useQuery({
    queryKey: ['planning-changes'],
    queryFn: planningApi.getChanges,
    enabled: isInitialized && !!planningState,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Mutation for fetching data
  const fetchDataMutation = useMutation({
    mutationFn: planningApi.fetchData,
    onSuccess: () => {
      setIsInitialized(true)
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to fetch data:', error)
    }
  })

  // Mutation for updating assignments
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ issueId, fromEngineerId, toEngineerId }: {
      issueId: string
      fromEngineerId?: string
      toEngineerId?: string
    }) => planningApi.updateAssignment(issueId, fromEngineerId, toEngineerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to update assignment:', error)
    }
  })

  // Mutation for reset
  const resetMutation = useMutation({
    mutationFn: planningApi.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to reset:', error)
    }
  })

  // Initialize by checking if data exists
  useEffect(() => {
    const checkInitialState = async () => {
      try {
        await planningApi.getPlanningState()
        setIsInitialized(true)
      } catch (error) {
        // No existing state, user needs to fetch data first
        setIsInitialized(false)
      }
    }
    
    checkInitialState()
  }, [])

  // Process current data for UI
  const processedData = planningState ? {
    cycles: planningState.originalData.cycles,
    teamMembers: planningState.originalData.teamMembers,
    backlogIssues: planningState.originalData.issues.filter(issue => 
      !Object.values(planningState.currentAssignments).flat().includes(issue.id)
    ),
    engineerAssignments: Object.fromEntries(
      Object.entries(planningState.currentAssignments).map(([engineerId, issueIds]) => [
        engineerId,
        issueIds.map(issueId => 
          planningState.originalData.issues.find(issue => issue.id === issueId)
        ).filter(Boolean) as LinearIssue[]
      ])
    )
  } : null

  const fetchData = useCallback(async () => {
    await fetchDataMutation.mutateAsync()
  }, [fetchDataMutation])

  const updateAssignment = useCallback(async (
    issueId: string, 
    fromEngineerId?: string, 
    toEngineerId?: string
  ) => {
    await updateAssignmentMutation.mutateAsync({ issueId, fromEngineerId, toEngineerId })
  }, [updateAssignmentMutation])

  const resetChanges = useCallback(async () => {
    await resetMutation.mutateAsync()
  }, [resetMutation])

  return {
    // Data
    isInitialized,
    planningState,
    processedData,
    changes: changesData?.changes || [],
    lastFetched: changesData?.lastFetched || planningState?.lastFetched,
    hasLocalChanges: (changesData?.totalChanges || 0) > 0,

    // Loading states
    isLoadingState,
    isFetchingData: fetchDataMutation.isPending,
    isUpdatingAssignment: updateAssignmentMutation.isPending,
    isResetting: resetMutation.isPending,

    // Errors
    stateError,
    fetchError: fetchDataMutation.error,
    updateError: updateAssignmentMutation.error,
    resetError: resetMutation.error,

    // Actions
    fetchData,
    updateAssignment,
    resetChanges,
    refetchState,
    refetchChanges
  }
}