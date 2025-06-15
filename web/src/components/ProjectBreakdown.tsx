import React from 'react'
import { ProjectSummary } from '../types'

interface ProjectBreakdownProps {
  projects: ProjectSummary[]
  totalPoints: number
}

export const ProjectBreakdown: React.FC<ProjectBreakdownProps> = ({
  projects,
  totalPoints,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Breakdown</h2>
      
      <div className="space-y-4">
        {projects.map((project) => {
          const percentage = totalPoints > 0 ? (project.totalPoints / totalPoints) * 100 : 0
          
          return (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-sm" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="text-sm font-medium text-gray-900">{project.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {project.totalPoints} pts ({project.issueCount} issues)
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: project.color,
                    width: `${percentage}%`
                  }}
                />
              </div>
              
              <div className="text-xs text-gray-500 text-right">
                {percentage.toFixed(1)}%
              </div>
            </div>
          )
        })}
        
        {projects.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            No projects in this cycle
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-900">Total</span>
          <span className="text-sm text-gray-600">{totalPoints} story points</span>
        </div>
      </div>
    </div>
  )
}