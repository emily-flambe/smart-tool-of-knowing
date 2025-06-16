import React from 'react'
import { TeamMember } from '../types'

interface EngineerSummary {
  id: string
  name: string
  email: string
  totalPoints: number
  issueCount: number
  color: string
}

interface EngineerBreakdownProps {
  engineers: EngineerSummary[]
  totalPoints: number
}

export const EngineerBreakdown: React.FC<EngineerBreakdownProps> = ({
  engineers,
  totalPoints,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Engineer Breakdown</h2>
      
      <div className="space-y-4">
        {engineers.map((engineer) => {
          const percentage = totalPoints > 0 ? (engineer.totalPoints / totalPoints) * 100 : 0
          
          return (
            <div key={engineer.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: engineer.color }}
                  />
                  <span className="text-sm font-medium text-gray-900">{engineer.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {engineer.totalPoints} pts ({engineer.issueCount} issues)
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    backgroundColor: engineer.color,
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
        
        {engineers.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-4">
            No engineers assigned to this cycle
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