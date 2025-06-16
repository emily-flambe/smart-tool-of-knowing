import { useState, useEffect, useCallback, useMemo } from 'react'
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
    enabled: isInitialized && !!planningState
  })

  // Query for active engineers
  const {
    data: activeEngineersData
  } = useQuery({
    queryKey: ['active-engineers'],
    queryFn: planningApi.getActiveEngineers,
    enabled: isInitialized,
    staleTime: 1000 * 60 * 10 // Cache for 10 minutes since this changes slowly
  })

  // Mutation for fetching data
  const fetchDataMutation = useMutation({
    mutationFn: planningApi.fetchData,
    onSuccess: () => {
      setIsInitialized(true)
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
      queryClient.invalidateQueries({ queryKey: ['active-engineers'] })
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

  // Mutation for updating estimates
  const updateEstimateMutation = useMutation({
    mutationFn: ({ issueId, estimate }: {
      issueId: string
      estimate: number
    }) => planningApi.updateEstimate(issueId, estimate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to update estimate:', error)
    }
  })

  // Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: ({ issueId, statusId }: {
      issueId: string
      statusId: string
    }) => planningApi.updateStatus(issueId, statusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to update status:', error)
    }
  })

  // Mutation for updating cycle
  const updateCycleMutation = useMutation({
    mutationFn: ({ issueId, cycleId }: {
      issueId: string
      cycleId: string
    }) => planningApi.updateCycle(issueId, cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to update cycle:', error)
    }
  })

  // Mutation for deleting individual changes
  const deleteChangeMutation = useMutation({
    mutationFn: (changeIndex: number) => planningApi.deleteChange(changeIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] })
    },
    onError: (error: any) => {
      console.error('Failed to delete change:', error)
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
  const processedData = useMemo(() => {
    if (!planningState) return null
    
    console.log('Hook: Recomputing processedData from planning state')
    
    return {
      cycles: planningState.originalData.cycles,
      teamMembers: planningState.originalData.teamMembers,
      activeEngineers: activeEngineersData?.activeEngineers || planningState.originalData.teamMembers,
      backlogIssues: planningState.originalData.issues.filter(issue => {
        // Check if issue is currently assigned to anyone (including local changes)
        const isCurrentlyAssigned = Object.values(planningState.currentAssignments).flat().includes(issue.id)
        return !isCurrentlyAssigned
      }),
      engineerAssignments: Object.fromEntries(
        Object.entries(planningState.currentAssignments).map(([engineerId, issueIds]) => [
          engineerId,
          issueIds.map(issueId => 
            planningState.originalData.issues.find(issue => issue.id === issueId)
          ).filter(Boolean) as LinearIssue[]
        ])
      )
    }
  }, [planningState, activeEngineersData])

  const fetchData = useCallback(async () => {
    await fetchDataMutation.mutateAsync()
  }, [fetchDataMutation])

  const updateAssignment = useCallback(async (
    issueId: string, 
    fromEngineerId?: string, 
    toEngineerId?: string
  ) => {
    console.log('Hook: Starting updateAssignment mutation')
    const result = await updateAssignmentMutation.mutateAsync({ issueId, fromEngineerId, toEngineerId })
    console.log('Hook: Assignment mutation result:', result)
    console.log('Hook: Manually refetching changes...')
    
    // Manually refetch both changes and planning state immediately
    const [changesResult, stateResult] = await Promise.all([
      refetchChanges(),
      refetchState()
    ])
    console.log('Hook: Changes refetched after assignment, result:', changesResult.data)
    console.log('Hook: Planning state refetched after assignment, result:', stateResult.data ? 'success' : 'failed')
    
    return result
  }, [updateAssignmentMutation, refetchChanges, refetchState])

  const resetChanges = useCallback(async () => {
    await resetMutation.mutateAsync()
  }, [resetMutation])

  const updateEstimate = useCallback(async (
    issueId: string, 
    estimate: number
  ) => {
    console.log('Hook: Starting updateEstimate mutation')
    const result = await updateEstimateMutation.mutateAsync({ issueId, estimate })
    console.log('Hook: Mutation result:', result)
    console.log('Hook: Manually refetching changes...')
    
    // Manually refetch both changes and planning state immediately
    const [changesResult, stateResult] = await Promise.all([
      refetchChanges(),
      refetchState()
    ])
    console.log('Hook: Changes refetched after estimate update, result:', changesResult.data)
    console.log('Hook: Planning state refetched after estimate update, result:', stateResult.data ? 'success' : 'failed')
    
    return result
  }, [updateEstimateMutation, refetchChanges, refetchState])

  const updateStatus = useCallback(async (
    issueId: string, 
    statusId: string
  ) => {
    console.log('Hook: Starting updateStatus mutation')
    const result = await updateStatusMutation.mutateAsync({ issueId, statusId })
    console.log('Hook: Mutation result:', result)
    console.log('Hook: Manually refetching changes...')
    
    // Invalidate and refetch both queries to ensure UI updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] }),
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
    ])
    
    // Manually refetch both changes and planning state immediately
    const [changesResult, stateResult] = await Promise.all([
      refetchChanges(),
      refetchState()
    ])
    console.log('Hook: Changes refetched after status update, result:', changesResult.data)
    console.log('Hook: Planning state refetched after status update, result:', stateResult.data ? 'success' : 'failed')
    
    return result
  }, [updateStatusMutation, refetchChanges, refetchState, queryClient])

  const updateCycle = useCallback(async (
    issueId: string, 
    cycleId: string
  ) => {
    console.log('Hook: Starting updateCycle mutation')
    const result = await updateCycleMutation.mutateAsync({ issueId, cycleId })
    console.log('Hook: Cycle mutation result:', result)
    
    // Invalidate and refetch both queries to ensure UI updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['planning-changes'] }),
      queryClient.invalidateQueries({ queryKey: ['planning-state'] })
    ])
    
    // Manually refetch both changes and planning state immediately
    const [changesResult, stateResult] = await Promise.all([
      refetchChanges(),
      refetchState()
    ])
    console.log('Hook: Changes refetched after cycle update, result:', changesResult.data)
    console.log('Hook: Planning state refetched after cycle update, result:', stateResult.data ? 'success' : 'failed')
    
    // Force a re-render by invalidating the planning state query
    if (stateResult.data) {
      console.log('Hook: Cycle update - planning state updated successfully')
    } else {
      console.warn('Hook: Cycle update - planning state refetch failed')
    }
    
    return result
  }, [updateCycleMutation, refetchChanges, refetchState, queryClient])

  const deleteChange = useCallback(async (changeIndex: number) => {
    console.log('Hook: Starting deleteChange mutation for index:', changeIndex)
    const result = await deleteChangeMutation.mutateAsync(changeIndex)
    console.log('Hook: Delete mutation result:', result)
    
    // Manually refetch changes immediately
    const refetchResult = await refetchChanges()
    console.log('Hook: Changes refetched after delete, result:', refetchResult.data)
    
    return result
  }, [deleteChangeMutation, refetchChanges])

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
    isUpdatingEstimate: updateEstimateMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdatingCycle: updateCycleMutation.isPending,
    isResetting: resetMutation.isPending,

    // Errors
    stateError,
    fetchError: fetchDataMutation.error,
    updateError: updateAssignmentMutation.error,
    estimateError: updateEstimateMutation.error,
    statusError: updateStatusMutation.error,
    cycleError: updateCycleMutation.error,
    resetError: resetMutation.error,

    // Actions
    fetchData,
    updateAssignment,
    updateEstimate,
    updateStatus,
    updateCycle,
    deleteChange,
    resetChanges,
    refetchState,
    refetchChanges
  }
}