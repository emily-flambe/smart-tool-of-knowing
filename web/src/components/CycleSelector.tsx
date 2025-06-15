import React from 'react'
import { LinearCycle } from '../types'

interface CycleSelectorProps {
  cycles: LinearCycle[]
  selectedCycle: LinearCycle | null
  onSelectCycle: (cycle: LinearCycle) => void
}

export const CycleSelector: React.FC<CycleSelectorProps> = ({
  cycles,
  selectedCycle,
  onSelectCycle,
}) => {
  return (
    <div className="mb-6">
      <label htmlFor="cycle-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select Cycle
      </label>
      <select
        id="cycle-select"
        value={selectedCycle?.id || ''}
        onChange={(e) => {
          const cycle = cycles.find(c => c.id === e.target.value)
          if (cycle) onSelectCycle(cycle)
        }}
        className="w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Choose a cycle...</option>
        {cycles.map((cycle) => (
          <option key={cycle.id} value={cycle.id}>
            {cycle.name} (#{cycle.number})
          </option>
        ))}
      </select>
      
      {selectedCycle && (
        <div className="mt-2 text-sm text-gray-600">
          {new Date(selectedCycle.startsAt).toLocaleDateString()} - {new Date(selectedCycle.endsAt).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}