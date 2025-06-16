import React, { useMemo, useState, useRef, useEffect } from 'react'
import { useDrop } from 'react-dnd'
import { LinearIssue, ProjectSummary } from '../types'
import { TicketCard } from './TicketCard'

interface UnplannedBacklogPanelProps {
  unplannedIssues: LinearIssue[]
  projects: ProjectSummary[]
  isCollapsed: boolean
  onToggleCollapse: () => void
  onDropTicket?: (issue: LinearIssue) => void
  onUpdateEstimate?: (issueId: string, estimate: number) => void
}

export const UnplannedBacklogPanel: React.FC<UnplannedBacklogPanelProps> = ({
  unplannedIssues,
  projects,
  isCollapsed,
  onToggleCollapse,
  onDropTicket,
  onUpdateEstimate
}) => {
  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Initialize project filter when projects change (only on first load)
  useEffect(() => {
    if (projects.length > 0 && selectedProjects.length === 0) {
      setSelectedProjects(['all', ...projects.map(p => p.id), 'no-project'])
    }
  }, [projects]) // Remove selectedProjects from dependency array to prevent re-initialization

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleProjectToggle = (projectId: string) => {
    if (projectId === 'all') {
      if (selectedProjects.includes('all')) {
        // Unchecking "All Projects" - clear everything
        setSelectedProjects([])
      } else {
        // Checking "All Projects" - select everything
        setSelectedProjects(['all', ...projects.map(p => p.id), 'no-project'])
      }
    } else {
      const newSelected = selectedProjects.includes(projectId)
        ? selectedProjects.filter(id => id !== projectId && id !== 'all')
        : [...selectedProjects.filter(id => id !== 'all'), projectId]
      setSelectedProjects(newSelected)
    }
  }
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }
  // Group issues by cycle status and then by project, applying project filter
  const groupedData = useMemo(() => {
    const now = new Date()
    
    // Apply project filter
    const filteredIssues = unplannedIssues.filter(issue => {
      if (selectedProjects.includes('all')) return true
      if (!issue.project?.id) return selectedProjects.includes('no-project')
      return selectedProjects.includes(issue.project.id)
    })
    
    // Separate future cycle issues from truly unplanned issues
    const futureCycleIssues = filteredIssues.filter(issue => issue.cycle?.id)
    const trulyUnplannedIssues = filteredIssues.filter(issue => !issue.cycle?.id)
    
    // Group future cycle issues by project
    const groupFutureCycleByProject = (issues: LinearIssue[]) => {
      const grouped: Record<string, LinearIssue[]> = { 'no-project': [] }
      
      projects.forEach(project => {
        grouped[project.id] = []
      })
      
      issues.forEach(issue => {
        if (issue.project?.id && grouped[issue.project.id]) {
          grouped[issue.project.id].push(issue)
        } else {
          grouped['no-project'].push(issue)
        }
      })
      
      // Remove empty groups except no-project
      Object.keys(grouped).forEach(key => {
        if (key !== 'no-project' && grouped[key].length === 0) {
          delete grouped[key]
        }
      })
      
      return grouped
    }
    
    return {
      futureCycle: groupFutureCycleByProject(futureCycleIssues),
      unplanned: groupFutureCycleByProject(trulyUnplannedIssues)
    }
  }, [unplannedIssues, projects, selectedProjects])

  const totalUnplannedCount = unplannedIssues.length
  const totalUnplannedPoints = unplannedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)

  const [{ isOver }, drop] = useDrop({
    accept: 'ticket',
    drop: (item: { issue: LinearIssue }) => {
      if (onDropTicket) {
        onDropTicket(item.issue)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  })

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Show Not Planned"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
        </button>
        {totalUnplannedCount > 0 && (
          <div className="mt-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {totalUnplannedCount > 99 ? '99+' : totalUnplannedCount}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={drop}
      className={`w-80 bg-white border-r border-gray-200 flex flex-col ${
        isOver ? 'bg-blue-50 border-blue-300' : ''
      }`}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Backlog++</h2>
            <p className="text-sm text-gray-500">
              {totalUnplannedCount} unplanned {totalUnplannedCount === 1 ? 'ticket' : 'tickets'} • {totalUnplannedPoints} {totalUnplannedPoints === 1 ? 'point' : 'points'}
            </p>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-gray-100 rounded"
            title="Hide Backlog"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
        
        {/* Project Filter Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
          >
            <span className="text-gray-700">
              {selectedProjects.includes('all') 
                ? 'All Projects' 
                : selectedProjects.length === 0
                ? 'No projects selected'
                : `${selectedProjects.length} project${selectedProjects.length === 1 ? '' : 's'} selected`
              }
            </span>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${
                filterDropdownOpen ? 'rotate-180' : 'rotate-0'
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {filterDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-64 overflow-y-auto">
              <div className="p-2 space-y-1">
                {/* All Projects Option */}
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes('all')}
                    onChange={() => handleProjectToggle('all')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-900">All Projects</span>
                </label>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                {/* No Project Option */}
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProjects.includes('no-project')}
                    onChange={() => handleProjectToggle('no-project')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gray-400" />
                    <span className="text-sm text-gray-900">No Project</span>
                  </div>
                </label>
                
                {/* Project Options */}
                {projects.map(project => (
                  <label key={project.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProjects.includes(project.id)}
                      onChange={() => handleProjectToggle(project.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-sm" 
                        style={{ backgroundColor: project.color || '#6b7280' }}
                      />
                      <span className="text-sm text-gray-900">{project.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {totalUnplannedCount === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="mb-3">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-sm">All tickets are planned</p>
          </div>
        ) : (
          <div className="p-4 space-y-8">
            {/* Future Cycle Issues */}
            {Object.keys(groupedData.futureCycle).length > 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => toggleSection('future-cycles')}
                  className="w-full flex items-center gap-2 pb-2 border-b border-gray-200 hover:bg-gray-50 -mx-4 px-4 py-2 text-left"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Future Cycles</h3>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ml-auto ${
                      collapsedSections['future-cycles'] ? '-rotate-90' : 'rotate-0'
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {!collapsedSections['future-cycles'] && (
                  <div className="space-y-4">
                    {Object.entries(groupedData.futureCycle).map(([projectId, projectIssues]) => {
                      if (projectIssues.length === 0) return null
                      
                      const project = projectId === 'no-project' 
                        ? null 
                        : projects.find(p => p.id === projectId)
                      const projectPoints = projectIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                      const projectSectionId = `future-project-${projectId}`
                      
                      return (
                        <div key={`future-${projectId}`} className="ml-4">
                          <button
                            onClick={() => toggleSection(projectSectionId)}
                            className="w-full flex items-center gap-2 py-2 hover:bg-gray-50 -mx-2 px-2 rounded text-left"
                          >
                            {project ? (
                              <>
                                <div 
                                  className="w-3 h-3 rounded-sm" 
                                  style={{ backgroundColor: project.color || '#6b7280' }}
                                />
                                <h4 className="font-medium text-gray-900">{project.name}</h4>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-sm bg-gray-400" />
                                <h4 className="font-medium text-gray-900">No Project</h4>
                              </>
                            )}
                            <span className="text-sm text-gray-500">
                              ({projectIssues.length} {projectIssues.length === 1 ? 'ticket' : 'tickets'} • {projectPoints} {projectPoints === 1 ? 'point' : 'points'})
                            </span>
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ml-auto ${
                                collapsedSections[projectSectionId] ? '-rotate-90' : 'rotate-0'
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {!collapsedSections[projectSectionId] && (
                            <div className="space-y-2 mt-2 ml-4">
                              {projectIssues.map((issue) => (
                                <TicketCard 
                                  key={`future-${issue.id}`} 
                                  issue={issue} 
                                  onUpdateEstimate={onUpdateEstimate}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            
            {/* Unplanned Issues */}
            {Object.keys(groupedData.unplanned).length > 0 && (
              <div className="space-y-4">
                <button
                  onClick={() => toggleSection('unplanned')}
                  className="w-full flex items-center gap-2 pb-2 border-b border-gray-200 hover:bg-gray-50 -mx-4 px-4 py-2 text-left"
                >
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-gray-900">Unplanned</h3>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ml-auto ${
                      collapsedSections['unplanned'] ? '-rotate-90' : 'rotate-0'
                    }`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {!collapsedSections['unplanned'] && (
                  <div className="space-y-4">
                    {Object.entries(groupedData.unplanned).map(([projectId, projectIssues]) => {
                      if (projectIssues.length === 0) return null
                      
                      const project = projectId === 'no-project' 
                        ? null 
                        : projects.find(p => p.id === projectId)
                      const projectPoints = projectIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
                      const projectSectionId = `unplanned-project-${projectId}`
                      
                      return (
                        <div key={`unplanned-${projectId}`} className="ml-4">
                          <button
                            onClick={() => toggleSection(projectSectionId)}
                            className="w-full flex items-center gap-2 py-2 hover:bg-gray-50 -mx-2 px-2 rounded text-left"
                          >
                            {project ? (
                              <>
                                <div 
                                  className="w-3 h-3 rounded-sm" 
                                  style={{ backgroundColor: project.color || '#6b7280' }}
                                />
                                <h4 className="font-medium text-gray-900">{project.name}</h4>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-sm bg-gray-400" />
                                <h4 className="font-medium text-gray-900">No Project</h4>
                              </>
                            )}
                            <span className="text-sm text-gray-500">
                              ({projectIssues.length} {projectIssues.length === 1 ? 'ticket' : 'tickets'} • {projectPoints} {projectPoints === 1 ? 'point' : 'points'})
                            </span>
                            <svg 
                              className={`w-4 h-4 text-gray-400 transition-transform ml-auto ${
                                collapsedSections[projectSectionId] ? '-rotate-90' : 'rotate-0'
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {!collapsedSections[projectSectionId] && (
                            <div className="space-y-2 mt-2 ml-4">
                              {projectIssues.map((issue) => (
                                <TicketCard 
                                  key={`unplanned-${issue.id}`} 
                                  issue={issue} 
                                  onUpdateEstimate={onUpdateEstimate}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}