import React from 'react'
import { LinearIssue, TeamMember, ProjectSummary, PRIORITY_LABELS } from '../types'
import { STATUS_CATEGORIES } from '../utils/statusCategories'

interface FilterState {
  projects: string[]
  statuses: string[]
  assignees: string[]
  priorities: number[]
}

interface FiltersSidebarProps {
  issues: LinearIssue[]
  teamMembers: TeamMember[]
  projects: ProjectSummary[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({
  issues,
  teamMembers,
  projects,
  filters,
  onFiltersChange,
  isCollapsed,
  onToggleCollapse
}) => {
  const toggleFilter = (category: keyof FilterState, value: string | number) => {
    const currentValues = filters[category] as (string | number)[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    
    onFiltersChange({
      ...filters,
      [category]: newValues
    })
  }

  const selectAllForCategory = (category: keyof FilterState) => {
    let allValues: (string | number)[] = []
    
    switch (category) {
      case 'projects':
        allValues = projects.map(p => p.id)
        break
      case 'statuses':
        allValues = STATUS_CATEGORIES.map(s => s.id)
        break
      case 'assignees':
        allValues = ['unassigned', ...teamMembers.map(m => m.id)]
        break
      case 'priorities':
        allValues = Object.keys(PRIORITY_LABELS).map(Number)
        break
    }
    
    onFiltersChange({
      ...filters,
      [category]: allValues
    })
  }

  const clearCategory = (category: keyof FilterState) => {
    onFiltersChange({
      ...filters,
      [category]: []
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      projects: [],
      statuses: [],
      assignees: [],
      priorities: []
    })
  }

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0)

  // Get unique statuses from issues
  const availableStatuses = Array.from(new Set(issues.map(issue => issue.state.name)))

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Show Filters"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586a1 1 0 01-.293.707L9 19.414V14a1 1 0 00-.293-.707L2.293 6.879A1 1 0 012 6.172V4z" />
          </svg>
        </button>
        {hasActiveFilters && (
          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
        )}
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-100 rounded"
              title="Hide Filters"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Projects Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Projects</h3>
            <div className="flex gap-1">
              <button
                onClick={() => selectAllForCategory('projects')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <span className="text-xs text-gray-400">|</span>
              <button
                onClick={() => clearCategory('projects')}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.projects.includes(project.id)}
                  onChange={() => toggleFilter('projects', project.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: project.color || '#6b7280' }}
                  />
                  <span className="text-sm text-gray-700">{project.name}</span>
                  <span className="text-xs text-gray-500">({project.issueCount})</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Status</h3>
            <div className="flex gap-1">
              <button
                onClick={() => selectAllForCategory('statuses')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <span className="text-xs text-gray-400">|</span>
              <button
                onClick={() => clearCategory('statuses')}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {STATUS_CATEGORIES.map((category) => (
              <label key={category.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(category.id)}
                  onChange={() => toggleFilter('statuses', category.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-3 h-3 rounded-full ${category.color}`} />
                  <span className="text-sm text-gray-700">{category.title}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Assignee Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Assignee</h3>
            <div className="flex gap-1">
              <button
                onClick={() => selectAllForCategory('assignees')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <span className="text-xs text-gray-400">|</span>
              <button
                onClick={() => clearCategory('assignees')}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.assignees.includes('unassigned')}
                onChange={() => toggleFilter('assignees', 'unassigned')}
                className="rounded border-gray-300"
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                  ?
                </div>
                <span className="text-sm text-gray-700">Unassigned</span>
              </div>
            </label>
            {teamMembers.map((member) => (
              <label key={member.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.assignees.includes(member.id)}
                  onChange={() => toggleFilter('assignees', member.id)}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700">{member.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Priority</h3>
            <div className="flex gap-1">
              <button
                onClick={() => selectAllForCategory('priorities')}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                All
              </button>
              <span className="text-xs text-gray-400">|</span>
              <button
                onClick={() => clearCategory('priorities')}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(PRIORITY_LABELS).map(([priority, info]) => (
              <label key={priority} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.priorities.includes(Number(priority))}
                  onChange={() => toggleFilter('priorities', Number(priority))}
                  className="rounded border-gray-300"
                />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm">{info.icon}</span>
                  <span className="text-sm text-gray-700">{info.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}