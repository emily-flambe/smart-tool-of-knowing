import React, { useState, useMemo, useEffect } from 'react'
import { LinearCycle, LinearIssue, TeamMember, ProjectSummary, PRIORITY_LABELS } from './types'
import { CycleSelector } from './components/CycleSelector'
import { StatusSection } from './components/StatusSection'
import { ProjectBreakdown } from './components/ProjectBreakdown'
import { EngineerBreakdown } from './components/EngineerBreakdown'
import { FetchDataButton } from './components/FetchDataButton'
import { ErrorMessage } from './components/ErrorMessage'
import { TestConnectionButton } from './components/TestConnectionButton'
import { FiltersSidebar } from './components/FiltersSidebar'
import { UnplannedBacklogPanel } from './components/UnplannedBacklogPanel'
import { CommitChangesModal } from './components/CommitChangesModal'
import { EngineerSection } from './components/EngineerSection'
import { usePlanningData } from './hooks/usePlanningData'
import { STATUS_CATEGORIES, categorizeIssuesByStatus, getCategoryById } from './utils/statusCategories'
import { planningApi, CommitChangeDetail } from './api/client'

interface FilterState {
  projects: string[]
  statuses: string[]
  assignees: string[]
  priorities: number[]
}

function App() {
  const [selectedCycle, setSelectedCycle] = useState<LinearCycle | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [groupByEngineer, setGroupByEngineer] = useState<boolean>(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState<boolean>(false)
  const [backlogCollapsed, setBacklogCollapsed] = useState<boolean>(false)
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [filters, setFilters] = useState<FilterState>({
    projects: [],
    statuses: [],
    assignees: [],
    priorities: []
  })
  
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }
  
  const {
    isInitialized,
    processedData,
    changes,
    lastFetched,
    hasLocalChanges,
    isFetchingData,
    isUpdatingAssignment,
    isUpdatingEstimate,
    isUpdatingStatus,
    isUpdatingCycle,
    stateError,
    fetchError,
    updateError,
    estimateError,
    statusError,
    cycleError,
    resetError,
    fetchData,
    updateAssignment,
    updateEstimate,
    updateStatus,
    updateCycle,
    deleteChange,
    resetChanges
  } = usePlanningData()

  const handleDropTicket = async (issue: LinearIssue, engineerId: string) => {
    // Handle unassignment - if engineerId is 'unassigned', pass undefined to API
    const targetEngineerId = engineerId === 'unassigned' ? undefined : engineerId
    const currentStatusId = issue.state.name.toLowerCase().replace(/\s+/g, '-')
    
    // Use unified handler for assignment-only changes (keep current status)
    await handleUnifiedDrop(issue, targetEngineerId, currentStatusId)
  }

  const handleUpdateEstimate = async (issueId: string, estimate: number) => {
    try {
      console.log('About to update estimate for issue', issueId, 'to', estimate)
      const response = await updateEstimate(issueId, estimate)
      console.log('Update estimate response:', response)
      
      // Give the queries a moment to refresh, then check the state
      setTimeout(() => {
        console.log('Current changes after timeout:', changes)
        console.log('HasLocalChanges after timeout:', hasLocalChanges)
      }, 1000)
      
    } catch (error) {
      console.error('Failed to update estimate:', error)
    }
  }

  // Unified drop handler that compares start state to end state
  const handleUnifiedDrop = async (
    issue: LinearIssue, 
    targetEngineerId: string | undefined,
    targetStatusId: string,
    targetCycleId?: string
  ) => {
    console.log('🎯 Unified drop handler:', {
      issueId: issue.identifier,
      currentState: {
        engineerId: issue.assignee?.id,
        statusId: issue.state.name.toLowerCase().replace(/\s+/g, '-'),
        cycleId: issue.cycle?.id
      },
      targetState: {
        engineerId: targetEngineerId,
        statusId: targetStatusId,
        cycleId: targetCycleId
      }
    })

    try {
      // Compare assignment
      const currentEngineerId = issue.assignee?.id
      if (currentEngineerId !== targetEngineerId) {
        console.log(`📝 Assignment change needed: ${currentEngineerId || 'unassigned'} → ${targetEngineerId || 'unassigned'}`)
        await updateAssignment(issue.id, currentEngineerId, targetEngineerId)
      }

      // Compare status
      const currentStatusId = issue.state.name.toLowerCase().replace(/\s+/g, '-')
      if (currentStatusId !== targetStatusId) {
        console.log(`📝 Status change needed: ${currentStatusId} → ${targetStatusId}`)
        const linearStateId = getLinearStateIdFromStatusId(targetStatusId, issue)
        if (linearStateId && linearStateId !== issue.state.id) {
          console.log(`📝 Calling updateStatus with Linear state ID: ${linearStateId}`)
          await updateStatus(issue.id, linearStateId)
        } else {
          console.log(`⚠️ Skipping status update - no valid Linear state ID found for ${targetStatusId}`)
        }
      }

      // Compare cycle (only if targetCycleId is provided)
      if (targetCycleId && issue.cycle?.id !== targetCycleId) {
        console.log(`📝 Cycle change needed: ${issue.cycle?.id || 'none'} → ${targetCycleId}`)
        await updateCycle(issue.id, targetCycleId)
      }

      console.log('✅ Unified drop completed')
    } catch (error) {
      console.error('❌ Failed to handle unified drop:', error)
    }
  }

  const handleDropStatus = async (issue: LinearIssue, statusId: string) => {
    // Use unified handler for status-only changes
    await handleUnifiedDrop(issue, issue.assignee?.id, statusId)
  }

  const handleDropFromBacklog = async (issue: LinearIssue, statusId: string, engineerId?: string) => {
    const targetEngineerId = (engineerId && engineerId !== 'unassigned') ? engineerId : undefined
    const targetCycleId = selectedCycle?.id
    
    console.log('Drop from backlog - using unified handler')
    
    // Use unified handler for backlog drops (assignment + status + cycle)
    await handleUnifiedDrop(issue, targetEngineerId, statusId, targetCycleId)
  }

  // Helper function to map our status categories to Linear state IDs
  const getLinearStateIdFromStatusId = (statusId: string, issue: LinearIssue): string | null => {
    console.log(`Mapping statusId: ${statusId} for issue: ${issue.identifier}`)
    console.log(`Current issue state: ${issue.state.name} (ID: ${issue.state.id})`)
    
    if (!processedData) {
      console.log(`No processedData available for state lookup`)
      return null
    }
    
    // Get all available Linear states from the data
    // We need to find states from the Linear data, not hardcode them
    const allIssues = [
      ...Object.values(processedData.engineerAssignments).flat(),
      ...processedData.backlogIssues
    ]
    
    // Find all unique states in our data
    const availableStates = new Map<string, { id: string, name: string, type: string }>()
    allIssues.forEach(issueData => {
      if (issueData.state && issueData.state.id) {
        availableStates.set(issueData.state.name.toLowerCase(), {
          id: issueData.state.id,
          name: issueData.state.name,
          type: issueData.state.type
        })
      }
    })
    
    console.log(`Available states:`, Array.from(availableStates.entries()).map(([name, state]) => `${name}: ${state.id}`))
    
    // Map our UI status to Linear state names
    const statusToLinearStateMap: Record<string, string[]> = {
      'todo': ['todo', 'backlog', 'new', 'open'],
      'in-progress': ['in progress', 'started', 'active', 'working'],
      'in-review': ['in review', 'review', 'testing', 'qa'],
      'done-pending': ['done pending', 'ready for deploy', 'staging'],
      'done': ['done', 'completed', 'closed', 'deployed']
    }
    
    const possibleStateNames = statusToLinearStateMap[statusId]
    if (!possibleStateNames) {
      console.log(`No mapping found for statusId: ${statusId}`)
      return null
    }
    
    // Find the first matching state from our available states
    let targetState = null
    for (const stateName of possibleStateNames) {
      const foundState = availableStates.get(stateName)
      if (foundState) {
        targetState = foundState
        break
      }
    }
    
    if (!targetState) {
      console.log(`No matching Linear state found for statusId: ${statusId}`)
      console.log(`Tried: ${possibleStateNames.join(', ')}`)
      return null
    }
    
    // Don't change if already in the target state
    if (issue.state.id === targetState.id) {
      console.log(`Issue already in target state: ${targetState.name}`)
      return null
    }
    
    console.log(`Mapped ${statusId} → ${targetState.name} (ID: ${targetState.id})`)
    return targetState.id
  }

  // Filter data by selected cycle and categorize by status
  const cycleFilteredData = useMemo(() => {
    if (!processedData || !selectedCycle) return processedData
    
    // Filter assignments to only include issues from the selected cycle
    const filteredAssignments: { [key: string]: LinearIssue[] } = {}
    Object.entries(processedData.engineerAssignments).forEach(([engineerId, issues]) => {
      filteredAssignments[engineerId] = issues.filter((issue: LinearIssue) => 
        (issue as any).cycle?.id === selectedCycle.id
      )
    })
    
    // Filter backlog issues to only include those from the selected cycle
    const filteredBacklogIssues = processedData.backlogIssues.filter((issue: any) => 
      issue.cycle?.id === selectedCycle.id
    )
    
    return {
      ...processedData,
      engineerAssignments: filteredAssignments,
      backlogIssues: filteredBacklogIssues,
      // Always preserve the full team members list - don't filter it by cycle
      teamMembers: processedData.teamMembers
    }
  }, [processedData, selectedCycle])

  // Categorize all issues by status, maintaining assignment context
  const categorizedIssues = useMemo(() => {
    if (!cycleFilteredData) return {}
    
    // Collect all issues with proper assignment context
    const allIssuesWithAssignments: LinearIssue[] = []
    const seenIssueIds = new Set<string>()
    
    // Add assigned issues with assignment context
    Object.entries(cycleFilteredData.engineerAssignments).forEach(([engineerId, issues]) => {
      const engineer = cycleFilteredData.teamMembers.find(m => m.id === engineerId)
      
      // Debug logging when engineer is not found
      if (!engineer && issues.length > 0) {
        console.debug(`Engineer not found for ID: ${engineerId} (${issues.length} issues)`)
      }
      
      issues.forEach(issue => {
        // Ensure no duplicates by checking if we've already seen this issue
        if (!seenIssueIds.has(issue.id)) {
          seenIssueIds.add(issue.id)
          allIssuesWithAssignments.push({
            ...issue,
            assignee: engineer ? {
              id: engineer.id,
              name: engineer.name,
              email: engineer.email
            } : issue.assignee
          })
        }
      })
    })
    
    // Add backlog issues (these should remain unassigned)
    cycleFilteredData.backlogIssues.forEach(issue => {
      // Ensure no duplicates by checking if we've already seen this issue
      if (!seenIssueIds.has(issue.id)) {
        seenIssueIds.add(issue.id)
        allIssuesWithAssignments.push(issue)
      }
    })
    
    // Debug logging to catch duplicates
    const issueIdCounts = allIssuesWithAssignments.reduce((acc, issue) => {
      acc[issue.id] = (acc[issue.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const duplicates = Object.entries(issueIdCounts).filter(([id, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn('Duplicate issues found in categorizedIssues:', duplicates)
    }
    
    return categorizeIssuesByStatus(allIssuesWithAssignments)
  }, [cycleFilteredData])

  // Apply filters to categorized issues
  const filteredCategorizedIssues = useMemo(() => {
    if (!categorizedIssues) return {}
    
    const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0)
    
    // If no filters are active, return empty results (show nothing)
    if (!hasActiveFilters) {
      const empty: Record<string, LinearIssue[]> = {}
      Object.keys(categorizedIssues).forEach(categoryId => {
        empty[categoryId] = []
      })
      return empty
    }
    
    const filtered: Record<string, LinearIssue[]> = {}
    
    Object.entries(categorizedIssues).forEach(([categoryId, issues]) => {
      filtered[categoryId] = issues.filter(issue => {
        // Project filter
        if (filters.projects.length > 0) {
          if (!issue.project || !filters.projects.includes(issue.project.id)) return false
        }
        
        // Status filter
        if (filters.statuses.length > 0) {
          if (!filters.statuses.includes(categoryId)) return false
        }
        
        // Assignee filter
        if (filters.assignees.length > 0) {
          const isUnassigned = !issue.assignee?.id
          const assigneeId = issue.assignee?.id
          
          if (isUnassigned && !filters.assignees.includes('unassigned')) return false
          if (!isUnassigned && assigneeId && !filters.assignees.includes(assigneeId)) return false
        }
        
        // Priority filter
        if (filters.priorities.length > 0) {
          if (!filters.priorities.includes(issue.priority)) return false
        }
        
        return true
      })
    })
    
    return filtered
  }, [categorizedIssues, filters])

  // Group issues by engineer when in engineer mode
  const engineerGroupedIssues = useMemo(() => {
    if (!processedData || !groupByEngineer) return {}
    
    // Get all issues from all categories (for current cycle)
    const allFilteredIssues = Object.values(filteredCategorizedIssues).flat()
    
    // Debug: Check for duplicates in allFilteredIssues
    const issueIdCounts = allFilteredIssues.reduce((acc, issue) => {
      acc[issue.id] = (acc[issue.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const duplicates = Object.entries(issueIdCounts).filter(([id, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn('Duplicate issues found in allFilteredIssues:', duplicates)
    }
    
    const grouped: Record<string, LinearIssue[]> = {
      'unassigned': []
    }
    const seenIssueIds = new Set<string>()
    
    // Use ALL team members to ensure every engineer shows up in the planning view
    // even if they have no assignments in the current cycle
    const allEngineers = processedData.teamMembers
    
    // Initialize groups for ALL engineers
    // This ensures all engineers are always visible, regardless of current assignments
    allEngineers.forEach(engineer => {
      grouped[engineer.id] = []
    })
    
    // Group current cycle's issues by engineer with deduplication
    allFilteredIssues.forEach(issue => {
      if (!seenIssueIds.has(issue.id)) {
        seenIssueIds.add(issue.id)
        
        // Debug: Log assignee and team member structure
        if (issue.assignee) {
          console.debug(`Issue ${issue.identifier} assignee:`, {
            id: issue.assignee.id,
            email: issue.assignee.email,
            name: issue.assignee.name
          })
        }
        
        // Try to match by assignee ID first, then by email
        let matchedEngineerId: string | null = null
        
        if (issue.assignee?.id && grouped[issue.assignee.id]) {
          matchedEngineerId = issue.assignee.id
        } else if (issue.assignee?.email) {
          // Look for engineer by email (since our team members use email as ID)
          const engineerByEmail = allEngineers.find(e => e.email === issue.assignee?.email)
          if (engineerByEmail && grouped[engineerByEmail.id]) {
            matchedEngineerId = engineerByEmail.id
          }
        }
        
        if (matchedEngineerId) {
          grouped[matchedEngineerId].push(issue)
          console.debug(`Grouped issue ${issue.identifier} under engineer ${matchedEngineerId}`)
        } else {
          grouped['unassigned'].push(issue)
          console.debug(`Issue ${issue.identifier} assigned to unassigned (no match found)`)
        }
      }
    })
    
    // Keep all engineer groups even if empty (don't remove empty groups)
    // This ensures all engineers are always visible in the planning view
    
    return grouped
  }, [processedData, groupByEngineer, filteredCategorizedIssues])

  const projectSummaries: ProjectSummary[] = useMemo(() => {
    if (!cycleFilteredData) return []
    
    const projectMap = new Map<string, ProjectSummary>()
    
    // Use all issues for project summaries (both assigned and backlog)
    const allIssues = [
      ...Object.values(cycleFilteredData.engineerAssignments).flat(),
      ...cycleFilteredData.backlogIssues
    ]
    
    allIssues.forEach(issue => {
      if (issue.project) {
        const existing = projectMap.get(issue.project.id)
        if (existing) {
          existing.totalPoints += issue.estimate || 0
          existing.issueCount += 1
        } else {
          projectMap.set(issue.project.id, {
            id: issue.project.id,
            name: issue.project.name,
            color: issue.project.color,
            totalPoints: issue.estimate || 0,
            issueCount: 1
          })
        }
      }
    })
    
    return Array.from(projectMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [cycleFilteredData])

  // Generate engineer colors for breakdown visualization
  const generateEngineerColor = (engineerId: string): string => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
      '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
    ]
    let hash = 0
    for (let i = 0; i < engineerId.length; i++) {
      hash = engineerId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const engineerSummaries = useMemo(() => {
    if (!cycleFilteredData) return []
    
    const engineerMap = new Map()
    
    // Process assigned issues
    Object.entries(cycleFilteredData.engineerAssignments).forEach(([engineerId, issues]) => {
      if (engineerId !== 'unassigned' && issues.length > 0) {
        const engineer = cycleFilteredData.teamMembers.find(tm => tm.id === engineerId) ||
                        cycleFilteredData.activeEngineers.find(ae => ae.id === engineerId)
        
        if (engineer) {
          const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
          engineerMap.set(engineerId, {
            id: engineerId,
            name: engineer.name,
            email: engineer.email,
            totalPoints,
            issueCount: issues.length,
            color: generateEngineerColor(engineerId)
          })
        }
      }
    })
    
    return Array.from(engineerMap.values()).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [cycleFilteredData])

  // Create engineers x projects summary table data
  const summaryTableData = useMemo(() => {
    if (!cycleFilteredData || engineerSummaries.length === 0 || projectSummaries.length === 0) return null
    
    const table: Record<string, Record<string, number>> = {}
    const engineerTotals: Record<string, number> = {}
    const projectTotals: Record<string, number> = {}
    let grandTotal = 0
    
    // Initialize table structure
    engineerSummaries.forEach(engineer => {
      table[engineer.id] = {}
      engineerTotals[engineer.id] = 0
      projectSummaries.forEach(project => {
        table[engineer.id][project.id] = 0
      })
    })
    
    // Initialize project totals
    projectSummaries.forEach(project => {
      projectTotals[project.id] = 0
    })
    
    // Populate table with actual data
    Object.entries(cycleFilteredData.engineerAssignments).forEach(([engineerId, issues]) => {
      if (engineerId !== 'unassigned' && table[engineerId]) {
        issues.forEach(issue => {
          if (issue.project && table[engineerId][issue.project.id] !== undefined) {
            const points = issue.estimate || 0
            table[engineerId][issue.project.id] += points
            engineerTotals[engineerId] += points
            projectTotals[issue.project.id] += points
            grandTotal += points
          }
        })
      }
    })
    
    return {
      table,
      engineerTotals,
      projectTotals,
      grandTotal,
      engineers: engineerSummaries,
      projects: projectSummaries
    }
  }, [cycleFilteredData, engineerSummaries, projectSummaries])

  // Helper function to check if an issue is in backlog/todo status
  const isBacklogOrTodoStatus = (issue: LinearIssue): boolean => {
    const stateName = issue.state.name.toLowerCase()
    const stateType = issue.state.type.toLowerCase()
    
    // Check if it matches todo/backlog state names
    const todoStateNames = ['todo', 'backlog', 'new', 'open']
    const matchesStateName = todoStateNames.some(name => 
      stateName.includes(name) || name.includes(stateName)
    )
    
    // Check if it's an unstarted state type
    const isUnstarted = stateType === 'unstarted'
    
    return matchesStateName || isUnstarted
  }

  // Get backlog++ issues (future cycle + unplanned issues, independent of selected cycle)
  const backlogPlusIssues = useMemo(() => {
    if (!processedData) return []
    
    const now = new Date()
    
    // Deduplicate issues first to prevent the same issue appearing in both engineerAssignments and backlogIssues
    const allIssuesWithDuplicates = [
      ...Object.values(processedData.engineerAssignments).flat(),
      ...processedData.backlogIssues
    ]
    
    // Remove duplicates by ID
    const seenIssueIds = new Set<string>()
    const allIssues = allIssuesWithDuplicates.filter(issue => {
      if (seenIssueIds.has(issue.id)) {
        return false
      }
      seenIssueIds.add(issue.id)
      return true
    })
    
    // Get issues from future cycles (cycles that haven't started yet)
    const futureCycleIssues = allIssues.filter(issue => {
      if (!issue.cycle?.id || issue.cycle.id === selectedCycle?.id) return false
      const cycle = processedData.cycles.find(c => c.id === issue.cycle.id)
      const isFutureCycle = cycle && new Date(cycle.startsAt) > now && !cycle.completedAt
      return isFutureCycle && isBacklogOrTodoStatus(issue)
    })
    
    // Get truly unplanned issues (no cycle assigned at all)
    // Exclude any issues that were already included in future cycles
    const futureCycleIssueIds = new Set(futureCycleIssues.map(i => i.id))
    const unplannedIssues = allIssues.filter(issue => 
      !issue.cycle?.id && 
      isBacklogOrTodoStatus(issue) && 
      !futureCycleIssueIds.has(issue.id)
    )
    
    // Combine future cycle issues first, then unplanned
    const result = [...futureCycleIssues, ...unplannedIssues]
    
    // Debug: Check for duplicates in final result
    const resultIssueIdCounts = result.reduce((acc, issue) => {
      acc[issue.id] = (acc[issue.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const resultDuplicates = Object.entries(resultIssueIdCounts).filter(([id, count]) => count > 1)
    if (resultDuplicates.length > 0) {
      console.warn('Duplicate issues found in backlogPlusIssues:', resultDuplicates)
    }
    
    return result
  }, [processedData, selectedCycle])

  const totalCyclePoints = useMemo(() => {
    if (!cycleFilteredData) return 0
    return Object.values(cycleFilteredData.engineerAssignments).flat().reduce((sum, issue) => sum + (issue.estimate || 0), 0)
  }, [cycleFilteredData])

  // Format changes for commit modal
  const formattedChanges: CommitChangeDetail[] = useMemo(() => {
    if (!changes || !processedData) return []
    
    return changes.map((change, index) => {
      // Find the issue from all available issues
      const allIssues = [
        ...Object.values(processedData.engineerAssignments).flat(),
        ...processedData.backlogIssues
      ]
      const issue = allIssues.find(i => i.id === change.issueId)
      
      const fromEngineer = change.fromEngineerId 
        ? processedData.teamMembers.find(m => m.id === change.fromEngineerId)
        : null
      const toEngineer = change.toEngineerId 
        ? processedData.teamMembers.find(m => m.id === change.toEngineerId)
        : null

      let description = ''
      let commitChange: CommitChangeDetail = {
        id: `${change.issueId}-${index}`,
        type: change.type as any,
        description: '',
        issueIdentifier: issue?.identifier || change.issueId,
        issueTitle: issue?.title || 'Unknown Issue'
      }

      if (change.type === 'assignment') {
        if (change.fromEngineerId && change.toEngineerId) {
          description = `Reassign from ${fromEngineer?.name || 'Unknown'} to ${toEngineer?.name || 'Unknown'}`
        } else if (change.toEngineerId) {
          description = `Assign to ${toEngineer?.name || 'Unknown'}`
        } else if (change.fromEngineerId) {
          description = `Unassign from ${fromEngineer?.name || 'Unknown'}`
        }
        commitChange.fromAssignee = fromEngineer?.name
        commitChange.toAssignee = toEngineer?.name
      } else if (change.type === 'estimate') {
        const prevEstimate = change.previousEstimate || 'unset'
        const newEstimate = change.estimate || 0
        description = `Update estimate from ${prevEstimate} to ${newEstimate} points`
        commitChange.estimate = newEstimate
      } else if (change.type === 'status') {
        description = `Change status to new state`
        commitChange.stateId = change.stateId
        commitChange.previousStateId = change.previousStateId
      } else if (change.type === 'cycle') {
        description = `Update cycle assignment`
        commitChange.cycleId = change.cycleId
        commitChange.previousCycleId = change.previousCycleId
      }

      commitChange.description = description
      return commitChange
    })
  }, [changes, processedData])

  const handleCommitChanges = async (changesToCommit: any[]): Promise<any> => {
    try {
      console.log('Committing changes:', changesToCommit)
      const response = await planningApi.commitChanges(changesToCommit)
      console.log('Commit response:', response)
      console.log('Response structure:', {
        success: response.success,
        summary: response.summary,
        results: response.results
      })
      
      // Show success message for any successful commit
      let successCount = 0
      
      if (response.success && response.summary?.successful > 0) {
        successCount = response.summary.successful
        console.log('Using summary.successful:', successCount)
      } else if (response.success && response.results) {
        successCount = response.results.filter((r: any) => r.success).length
        console.log('Using results count:', successCount)
      } else if (response.success) {
        // Fallback: assume at least the number of changes we tried to commit
        successCount = changesToCommit.length
        console.log('Using fallback count:', successCount)
      }
      
      if (successCount > 0) {
        const message = `${successCount} change${successCount !== 1 ? 's' : ''} committed to Linear successfully!`
        console.log('Setting success message:', message)
        setSuccessMessage(message)
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          console.log('Auto-hiding success message')
          setSuccessMessage('')
        }, 5000)
        
        // Refresh the planning state to get updated data
        await fetchData()
        console.log('Changes committed successfully')
      } else {
        console.log('No successful changes detected')
      }
      
      return response
    } catch (error) {
      console.error('Failed to commit changes:', error)
      throw error
    }
  }

  // Set current cycle as default when data loads
  useEffect(() => {
    if (processedData && processedData.cycles.length > 0 && !selectedCycle) {
      const now = new Date()
      
      // Find active cycle (current date falls between start and end)
      const activeCycle = processedData.cycles.find(cycle => {
        const startDate = new Date(cycle.startsAt)
        const endDate = new Date(cycle.endsAt)
        return now >= startDate && now <= endDate && !cycle.completedAt
      })
      
      if (activeCycle) {
        setSelectedCycle(activeCycle)
      } else {
        // If no active cycle, find the next upcoming cycle
        const upcomingCycle = processedData.cycles
          .filter(cycle => new Date(cycle.startsAt) > now && !cycle.completedAt)
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]
        
        if (upcomingCycle) {
          setSelectedCycle(upcomingCycle)
        } else {
          // Fallback to most recent cycle
          const sortedCycles = processedData.cycles
            .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
          setSelectedCycle(sortedCycles[0])
        }
      }
    }
  }, [processedData, selectedCycle])

  // Initialize filters with all options selected when data loads
  useEffect(() => {
    if (processedData && projectSummaries.length > 0) {
      // Check if filters are empty (initial state)
      const hasEmptyFilters = Object.values(filters).every(arr => arr.length === 0)
      
      if (hasEmptyFilters) {
        setFilters({
          projects: projectSummaries.map(p => p.id),
          statuses: STATUS_CATEGORIES.map(s => s.id),
          assignees: ['unassigned', ...processedData.teamMembers.map(m => m.id)],
          priorities: Object.keys(PRIORITY_LABELS).map(Number)
        })
      }
    }
  }, [processedData, projectSummaries, filters])

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Linear Cycle Planning</h1>
          <p className="text-gray-600 mb-6">
            Connect to your Linear workspace to start planning
          </p>
          <div className="space-y-4">
            <FetchDataButton
              onFetchData={fetchData}
              hasLocalChanges={false}
              isLoading={isFetchingData}
            />
            
            <TestConnectionButton />
          </div>
          
          {(stateError || fetchError) && (
            <div className="mt-6 max-w-md">
              <ErrorMessage 
                error={fetchError || stateError}
                title="Connection Failed"
                showDetails={true}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!processedData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading planning data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <FiltersSidebar
        issues={Object.values(categorizedIssues).flat()}
        teamMembers={cycleFilteredData?.teamMembers || []}
        projects={projectSummaries}
        filters={filters}
        onFiltersChange={setFilters}
        isCollapsed={filtersCollapsed}
        onToggleCollapse={() => setFiltersCollapsed(!filtersCollapsed)}
      />
      
      <UnplannedBacklogPanel
        unplannedIssues={backlogPlusIssues}
        projects={projectSummaries}
        isCollapsed={backlogCollapsed}
        onToggleCollapse={() => setBacklogCollapsed(!backlogCollapsed)}
        onUpdateEstimate={handleUpdateEstimate}
      />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    {successMessage}
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setSuccessMessage('')}
                    className="inline-flex text-green-400 hover:text-green-600"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Linear Cycle Planning</h1>
              <p className="text-gray-600">
                Drag and drop tickets to plan your upcoming sprint
                {lastFetched && (
                  <span className="ml-2 text-sm">
                    • Last synced: {new Date(lastFetched).toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <FetchDataButton
                onFetchData={fetchData}
                hasLocalChanges={hasLocalChanges}
                isLoading={isFetchingData}
              />
              
              {hasLocalChanges && (
                <button
                  onClick={() => setShowCommitModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  Review and Commit ({formattedChanges.length})
                </button>
              )}
              
              <TestConnectionButton />
            </div>
          </div>


          {fetchError && (
            <div className="mb-4">
              <ErrorMessage 
                error={fetchError}
                title="Failed to Fetch Data"
                showDetails={false}
              />
            </div>
          )}

          {updateError && (
            <div className="mb-4">
              <ErrorMessage 
                error={updateError}
                title="Failed to Update Assignment"
                showDetails={false}
              />
            </div>
          )}

          {estimateError && (
            <div className="mb-4">
              <ErrorMessage 
                error={estimateError}
                title="Failed to Update Estimate"
                showDetails={false}
              />
            </div>
          )}

          {statusError && (
            <div className="mb-4">
              <ErrorMessage 
                error={statusError}
                title="Failed to Update Status"
                showDetails={false}
              />
            </div>
          )}

          {cycleError && (
            <div className="mb-4">
              <ErrorMessage 
                error={cycleError}
                title="Failed to Update Cycle"
                showDetails={false}
              />
            </div>
          )}

          {resetError && (
            <div className="mb-4">
              <ErrorMessage 
                error={resetError}
                title="Failed to Reset Changes"
                showDetails={false}
              />
            </div>
          )}
        </header>

        <div className="flex items-center justify-between mb-6">
          <CycleSelector
            cycles={processedData.cycles}
            selectedCycle={selectedCycle}
            onSelectCycle={setSelectedCycle}
          />
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Group by:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setGroupByEngineer(false)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  !groupByEngineer 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Status
              </button>
              <button
                onClick={() => setGroupByEngineer(true)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  groupByEngineer 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Engineer
              </button>
            </div>
          </div>
        </div>

        {/* Show either engineer sections or status sections */}
        {processedData && (
          <div className="space-y-6">
            {groupByEngineer ? (
              // Engineer-first grouping
              <>
                {Object.entries(engineerGroupedIssues).map(([engineerId, engineerIssues]) => {
                  // Show ALL engineers, even if they have no issues in current cycle
                  
                  const engineer = engineerId === 'unassigned' 
                    ? null 
                    : processedData?.teamMembers.find(m => m.id === engineerId || m.email === engineerId)
                  
                  // Debug: Log when engineer is not found
                  if (engineerId !== 'unassigned' && !engineer) {
                    console.log(`❌ Engineer not found for ID: ${engineerId}`)
                    console.log('Available team members:', processedData?.teamMembers.map(m => ({ id: m.id, email: m.email, name: m.name })))
                  }
                  
                  // Fallback: Create engineer object from ID if not found in team members
                  const finalEngineer = engineer || (engineerId !== 'unassigned' ? {
                    id: engineerId,
                    name: engineerId.includes('@') 
                      ? engineerId.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : engineerId,
                    email: engineerId.includes('@') ? engineerId : `${engineerId}@unknown.com`
                  } : null)
                  
                  return (
                    <EngineerSection
                      key={engineerId}
                      engineer={finalEngineer}
                      engineerId={engineerId}
                      allIssues={engineerIssues}
                      isCollapsed={collapsedSections[`engineer-${engineerId}`] || false}
                      onToggleCollapse={() => toggleSectionCollapse(`engineer-${engineerId}`)}
                      onDropFromBacklog={handleDropFromBacklog}
                      onUnifiedDrop={handleUnifiedDrop}
                      onUpdateEstimate={handleUpdateEstimate}
                    />
                  )
                })}
              </>
            ) : (
              // Status-first grouping (existing behavior)
              <>
                {STATUS_CATEGORIES.map((category) => (
                  <StatusSection
                    key={category.id}
                    title={category.title}
                    issues={filteredCategorizedIssues[category.id] || []}
                    teamMembers={cycleFilteredData?.teamMembers || []}
                    isCollapsed={collapsedSections[category.id] || false}
                    onToggleCollapse={() => toggleSectionCollapse(category.id)}
                    onDropTicket={handleDropTicket}
                    onDropFromBacklog={handleDropFromBacklog}
                    onDropStatus={handleDropStatus}
                    onUpdateEstimate={handleUpdateEstimate}
                    statusColor={category.color}
                    statusId={category.id}
                    groupByEngineer={false}
                  />
                ))}
              </>
            )}
            
            {/* Breakdowns and Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
              <ProjectBreakdown
                projects={projectSummaries}
                totalPoints={totalCyclePoints}
              />
              
              <EngineerBreakdown
                engineers={engineerSummaries}
                totalPoints={totalCyclePoints}
              />
            </div>
            
            {/* Engineers x Projects Summary Table */}
            {summaryTableData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-6xl">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Engineers × Projects Summary</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-900 text-sm">Engineer</th>
                        {summaryTableData.projects.map(project => (
                          <th key={project.id} className="text-center py-2 px-3 font-medium text-gray-900 text-sm min-w-[80px]">
                            <div className="flex items-center justify-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-sm" 
                                style={{ backgroundColor: project.color || '#1e40af' }}
                              />
                              <span className="truncate">{project.name}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center py-2 px-3 font-semibold text-gray-900 text-sm bg-gray-50">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryTableData.engineers.map(engineer => (
                        <tr key={engineer.id} className="border-b border-gray-100">
                          <td className="py-2 px-3 font-medium text-gray-900 text-sm">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: engineer.color }}
                              />
                              <span className="truncate">{engineer.name}</span>
                            </div>
                          </td>
                          {summaryTableData.projects.map(project => {
                            const points = summaryTableData.table[engineer.id][project.id]
                            return (
                              <td key={project.id} className="text-center py-2 px-3 text-sm text-gray-600">
                                {points > 0 ? points : '-'}
                              </td>
                            )
                          })}
                          <td className="text-center py-2 px-3 text-sm font-semibold text-gray-900 bg-gray-50">
                            {summaryTableData.engineerTotals[engineer.id]}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="py-2 px-3 font-semibold text-gray-900 text-sm">Total</td>
                        {summaryTableData.projects.map(project => (
                          <td key={project.id} className="text-center py-2 px-3 text-sm font-semibold text-gray-900">
                            {summaryTableData.projectTotals[project.id]}
                          </td>
                        ))}
                        <td className="text-center py-2 px-3 text-sm font-bold text-gray-900 bg-gray-100">
                          {summaryTableData.grandTotal}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      
      <CommitChangesModal
        isOpen={showCommitModal}
        onClose={() => setShowCommitModal(false)}
        changes={formattedChanges}
        onCommit={handleCommitChanges}
        onDeleteChange={deleteChange}
      />
    </div>
  )
}

export default App