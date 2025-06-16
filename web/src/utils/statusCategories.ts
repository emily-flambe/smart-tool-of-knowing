import { LinearIssue } from '../types'

export interface StatusCategory {
  id: string
  title: string
  color: string
  stateTypes: string[]
  stateNames: string[]
}

export const STATUS_CATEGORIES: StatusCategory[] = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'bg-gray-400',
    stateTypes: ['unstarted'],
    stateNames: ['Todo', 'Backlog', 'New', 'Open']
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    color: 'bg-blue-500',
    stateTypes: ['started'],
    stateNames: ['In Progress', 'Started', 'Active', 'Working']
  },
  {
    id: 'in-review',
    title: 'In Review',
    color: 'bg-purple-500',
    stateTypes: ['started'],
    stateNames: ['In Review', 'Code Review', 'Review', 'Reviewing', 'Testing', 'QA', 'Pending']
  },
  {
    id: 'done-pending',
    title: 'Done Pending',
    color: 'bg-orange-500',
    stateTypes: ['completed'],
    stateNames: ['Done Pending Deployment', 'Ready for Deploy', 'Pending Deploy', 'Staging', 'Done', 'Completed', 'Finished', 'Resolved']
  },
  {
    id: 'done',
    title: 'Done',
    color: 'bg-green-500',
    stateTypes: ['completed'],
    stateNames: ['Deployed', 'Released', 'Merged', 'Closed']
  }
]

export const categorizeIssuesByStatus = (issues: LinearIssue[]): Record<string, LinearIssue[]> => {
  const categorized: Record<string, LinearIssue[]> = {}
  
  // Initialize all categories
  STATUS_CATEGORIES.forEach(category => {
    categorized[category.id] = []
  })
  
  // Debug: Check for duplicate issues in input
  const inputIssueIdCounts = issues.reduce((acc, issue) => {
    acc[issue.id] = (acc[issue.id] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const inputDuplicates = Object.entries(inputIssueIdCounts).filter(([id, count]) => count > 1)
  if (inputDuplicates.length > 0) {
    console.warn('Duplicate issues found in categorizeIssuesByStatus input:', inputDuplicates)
  }
  
  issues.forEach(issue => {
    const stateName = issue.state.name.toLowerCase()
    const stateType = issue.state.type.toLowerCase()
    
    let categoryFound = false
    
    // Check specific categories in priority order to avoid overlaps
    
    // Check for "done" (final states) first - most specific
    if (['deployed', 'released', 'merged', 'closed'].some(name => 
      stateName.includes(name) || name.includes(stateName)
    )) {
      categorized['done'].push(issue)
      categoryFound = true
    }
    // Check for "done-pending" states
    else if (['done pending deployment', 'ready for deploy', 'pending deploy', 'staging'].some(name => 
      stateName.includes(name) || name.includes(stateName)
    ) || (['done', 'completed', 'finished', 'resolved'].some(name => 
      stateName.includes(name) || name.includes(stateName)
    ) && !['deployed', 'released', 'merged', 'closed'].some(name => 
      stateName.includes(name) || name.includes(stateName)
    ))) {
      categorized['done-pending'].push(issue)
      categoryFound = true
    }
    // Check for "in-review" states
    else if (['review', 'testing', 'qa', 'pending'].some(name => 
      stateName.includes(name) || name.includes(stateName)
    )) {
      categorized['in-review'].push(issue)
      categoryFound = true
    }
    // Check for "in-progress" states
    else if (stateType === 'started' || 
      ['in progress', 'active', 'doing', 'started', 'working'].some(name => 
        stateName.includes(name) || name.includes(stateName)
      )) {
      categorized['in-progress'].push(issue)
      categoryFound = true
    }
    // Check for "todo" states
    else if (stateType === 'unstarted' || 
      ['todo', 'backlog', 'new', 'open'].some(name => 
        stateName.includes(name) || name.includes(stateName)
      )) {
      categorized['todo'].push(issue)
      categoryFound = true
    }
    // If still no match, fall back based on state type
    else if (stateType === 'completed') {
      categorized['done'].push(issue)
      categoryFound = true
    }
    
    // If still no match, put in Todo as fallback
    if (!categoryFound) {
      categorized['todo'].push(issue)
    }
  })
  
  // Debug: Check for duplicates in output
  Object.entries(categorized).forEach(([categoryId, categoryIssues]) => {
    const categoryIssueIdCounts = categoryIssues.reduce((acc, issue) => {
      acc[issue.id] = (acc[issue.id] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const categoryDuplicates = Object.entries(categoryIssueIdCounts).filter(([id, count]) => count > 1)
    if (categoryDuplicates.length > 0) {
      console.warn(`Duplicate issues found in ${categoryId} category:`, categoryDuplicates)
    }
  })
  
  return categorized
}

export const getCategoryById = (id: string): StatusCategory | undefined => {
  return STATUS_CATEGORIES.find(category => category.id === id)
}