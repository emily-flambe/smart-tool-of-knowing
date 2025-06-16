import React, { useState } from 'react'
import { LinearIssue } from '../types'
import { TicketCard } from './TicketCard'

interface BacklogPanelProps {
  issues: LinearIssue[]
}

export const BacklogPanel: React.FC<BacklogPanelProps> = ({ issues }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('')

  const projects = Array.from(
    new Set(issues.map(issue => issue.project?.name).filter(Boolean))
  ).sort()

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.identifier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = !selectedProject || issue.project?.name === selectedProject
    return matchesSearch && matchesProject
  })

  return (
    <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backlog</h2>
        
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project} value={project}>{project}</option>
            ))}
          </select>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          {filteredIssues.length} tickets
        </div>
      </div>
      
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {filteredIssues.map((issue) => (
          <TicketCard key={issue.id} issue={issue} />
        ))}
        
        {filteredIssues.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No tickets found
          </div>
        )}
      </div>
    </div>
  )
}