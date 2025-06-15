import React, { useState, useMemo } from 'react'
import { LinearCycle, LinearIssue, TeamMember, ProjectSummary } from './types'
import { CycleSelector } from './components/CycleSelector'
import { EngineerColumn } from './components/EngineerColumn'
import { BacklogPanel } from './components/BacklogPanel'
import { ProjectBreakdown } from './components/ProjectBreakdown'

// Mock data for demonstration
const mockCycles: LinearCycle[] = [
  {
    id: '1',
    name: 'Sprint 24',
    number: 24,
    startsAt: '2025-06-15T00:00:00Z',
    endsAt: '2025-06-29T00:00:00Z',
    issues: []
  },
  {
    id: '2',
    name: 'Sprint 25',
    number: 25,
    startsAt: '2025-06-30T00:00:00Z',
    endsAt: '2025-07-13T00:00:00Z',
    issues: []
  }
]

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: '2', name: 'Bob Chen', email: 'bob@example.com' },
  { id: '3', name: 'Carol Davis', email: 'carol@example.com' },
]

const mockBacklogIssues: LinearIssue[] = [
  {
    id: '1',
    identifier: 'ENG-123',
    title: 'Implement user authentication flow',
    priority: 2,
    estimate: 5,
    state: { id: '1', name: 'to do', type: 'unstarted' },
    project: { id: '1', name: 'Auth System', color: '#3b82f6' },
    assignee: undefined,
    labels: []
  },
  {
    id: '2',
    identifier: 'ENG-124',
    title: 'Add password reset functionality',
    priority: 3,
    estimate: 3,
    state: { id: '1', name: 'to do', type: 'unstarted' },
    project: { id: '1', name: 'Auth System', color: '#3b82f6' },
    labels: []
  },
  {
    id: '3',
    identifier: 'ENG-125',
    title: 'Optimize database queries for dashboard',
    priority: 1,
    estimate: 8,
    state: { id: '1', name: 'to do', type: 'unstarted' },
    project: { id: '2', name: 'Performance', color: '#10b981' },
    labels: []
  },
  {
    id: '4',
    identifier: 'ENG-126',
    title: 'Fix responsive design issues on mobile',
    priority: 2,
    estimate: 2,
    state: { id: '1', name: 'to do', type: 'unstarted' },
    project: { id: '3', name: 'UI/UX', color: '#f59e0b' },
    labels: []
  },
  {
    id: '5',
    identifier: 'ENG-127',
    title: 'Add unit tests for payment processing',
    priority: 4,
    estimate: 5,
    state: { id: '1', name: 'to do', type: 'unstarted' },
    project: { id: '4', name: 'Testing', color: '#8b5cf6' },
    labels: []
  }
]

function App() {
  const [selectedCycle, setSelectedCycle] = useState<LinearCycle | null>(null)
  const [engineerAssignments, setEngineerAssignments] = useState<Record<string, LinearIssue[]>>({
    '1': [],
    '2': [],
    '3': []
  })
  const [backlogIssues, setBacklogIssues] = useState<LinearIssue[]>(mockBacklogIssues)

  const handleDropTicket = (issue: LinearIssue, engineerId: string) => {
    // Remove from backlog if it's there
    setBacklogIssues(prev => prev.filter(i => i.id !== issue.id))
    
    // Remove from other engineers
    setEngineerAssignments(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(id => {
        updated[id] = updated[id].filter(i => i.id !== issue.id)
      })
      
      // Add to target engineer
      updated[engineerId] = [...updated[engineerId], issue]
      
      return updated
    })
  }

  const projectSummaries: ProjectSummary[] = useMemo(() => {
    const projectMap = new Map<string, ProjectSummary>()
    
    Object.values(engineerAssignments).flat().forEach(issue => {
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
  }, [engineerAssignments])

  const totalCyclePoints = useMemo(() => 
    Object.values(engineerAssignments).flat().reduce((sum, issue) => sum + (issue.estimate || 0), 0),
    [engineerAssignments]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Linear Cycle Planning</h1>
          <p className="text-gray-600">Drag and drop tickets to plan your upcoming sprint</p>
        </header>

        <CycleSelector
          cycles={mockCycles}
          selectedCycle={selectedCycle}
          onSelectCycle={setSelectedCycle}
        />

        <div className="flex gap-6">
          <BacklogPanel issues={backlogIssues} />
          
          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Assignments</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {mockTeamMembers.map((engineer) => (
                  <EngineerColumn
                    key={engineer.id}
                    engineer={engineer}
                    issues={engineerAssignments[engineer.id] || []}
                    onDropTicket={handleDropTicket}
                  />
                ))}
              </div>
            </div>
            
            <ProjectBreakdown
              projects={projectSummaries}
              totalPoints={totalCyclePoints}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App