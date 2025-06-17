import React, { useState, useMemo } from 'react'

interface Issue {
  id: string
  identifier: string
  title: string
  url?: string
  assignee?: {
    name: string
  } | null
  project?: {
    name: string
    color?: string
  } | null
  estimate: number
  completedAt: string
  linkedPRs?: Array<{
    id: string
    title: string
    url: string
    number: number
    org: string
    repo: string
    metadata?: {
      status: string
      mergedAt?: string
    }
  }>
}

interface SortableIssuesTableProps {
  issues: Issue[]
}

type SortField = 'identifier' | 'project' | 'assignee' | 'estimate'
type SortDirection = 'asc' | 'desc'

export function SortableIssuesTable({ issues }: SortableIssuesTableProps) {
  const [sortField, setSortField] = useState<SortField>('identifier')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      let aValue: string | number = ''
      let bValue: string | number = ''

      switch (sortField) {
        case 'identifier':
          aValue = a.identifier
          bValue = b.identifier
          break
        case 'project':
          aValue = a.project?.name || ''
          bValue = b.project?.name || ''
          break
        case 'assignee':
          aValue = a.assignee?.name || 'Unassigned'
          bValue = b.assignee?.name || 'Unassigned'
          break
        case 'estimate':
          aValue = a.estimate
          bValue = b.estimate
          break
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const comparison = aValue.toString().localeCompare(bValue.toString())
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [issues, sortField, sortDirection])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-300">↕</span>
    }
    return sortDirection === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 w-full text-left"
    >
      {children}
      {getSortIcon(field)}
    </button>
  )

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-5">
            <SortableHeader field="identifier">Issue</SortableHeader>
          </div>
          <div className="col-span-3">
            <SortableHeader field="project">Project</SortableHeader>
          </div>
          <div className="col-span-3">
            <SortableHeader field="assignee">Assignee</SortableHeader>
          </div>
          <div className="col-span-1 text-right">
            <SortableHeader field="estimate">Points</SortableHeader>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {sortedIssues.slice(0, 50).map((issue) => (
          <div key={issue.id} className="px-4 py-3 hover:bg-gray-50">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-5 min-w-0">
                <div className="text-sm">
                  <a
                    href={issue.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {issue.identifier}
                  </a>
                  <span className="text-gray-900 ml-2">: {issue.title}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Completed {new Date(issue.completedAt).toLocaleDateString()}
                </div>
                {issue.linkedPRs && issue.linkedPRs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {issue.linkedPRs.map((pr) => (
                      <a
                        key={pr.id}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100 border border-green-200"
                        title={pr.title}
                      >
                        <span className="mr-1">🔀</span>
                        PR #{pr.number}
                        {pr.metadata?.status === 'merged' && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-3 text-sm text-gray-600 min-w-0">
                <div className="flex items-center">
                  {issue.project?.color && (
                    <div 
                      className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: issue.project.color }}
                    />
                  )}
                  <span className="truncate">{issue.project?.name || 'No Project'}</span>
                </div>
              </div>
              <div className="col-span-3 text-sm text-gray-600 truncate">
                {issue.assignee?.name || 'Unassigned'}
              </div>
              <div className="col-span-1 text-sm text-gray-900 font-medium text-right">
                {issue.estimate || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {issues.length > 50 && (
        <div className="px-4 py-3 bg-gray-50 border-t text-center text-sm text-gray-600">
          Showing first 50 of {issues.length} issues
        </div>
      )}
    </div>
  )
}