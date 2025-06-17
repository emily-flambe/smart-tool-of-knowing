import axios from 'axios'
import { LinearCycle, LinearIssue, TeamMember } from '../types'

const API_BASE = 'http://localhost:3001/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface PlanningState {
  lastFetched: string
  originalData: {
    cycles: LinearCycle[]
    issues: LinearIssue[]
    teamMembers: TeamMember[]
  }
  currentAssignments: Record<string, string[]>
  localChanges: Array<{
    type: 'assignment' | 'unassignment'
    issueId: string
    fromEngineerId?: string
    toEngineerId?: string
    timestamp: string
  }>
}

export interface ChangeDetail {
  type: 'assignment' | 'unassignment' | 'estimate' | 'status' | 'cycle' | 'multiple'
  issueId: string
  fromEngineerId?: string
  toEngineerId?: string
  timestamp: string
  issue: { id: string; identifier: string; title: string } | null
  fromEngineer: { id: string; name: string } | null
  toEngineer: { id: string; name: string } | null
  // New fields for extended functionality
  estimate?: number
  previousEstimate?: number
  stateId?: string
  previousStateId?: string
  cycleId?: string
  previousCycleId?: string
}

export interface ChangesResponse {
  totalChanges: number
  changes: ChangeDetail[]
  lastFetched: string
}

export interface CommitChangeDetail {
  id: string
  type: 'assignment' | 'estimate' | 'status' | 'cycle' | 'multiple'
  description: string
  issueIdentifier: string
  issueTitle: string
  fromAssignee?: string
  toAssignee?: string
  estimate?: number
  stateId?: string
  previousStateId?: string
  cycleId?: string
  previousCycleId?: string
  assigneeId?: string
}

export interface CommitChangesResponse {
  success: boolean
  message: string
  results: Array<{
    id: string
    success: boolean
    message?: string
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

export interface HealthCheckResponse {
  status: string
  timestamp: string
  server: string
  endpoints: string
  linear?: {
    configured: boolean
    status: string
    message: string
  }
}

export interface LinearTestResponse {
  success: boolean
  error?: string
  message: string
  helpUrl?: string
  data?: {
    user: string
    workspace: string
    apiVersion: string
  }
}

export const planningApi = {
  // Health check
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await api.get('/health')
    return response.data
  },

  // Test Linear connection
  async testLinear(): Promise<LinearTestResponse> {
    const response = await api.get('/test-linear')
    return response.data
  },

  // Get active engineers from recent cycles
  async getActiveEngineers(): Promise<{ activeEngineers: TeamMember[]; cyclesAnalyzed: number; totalIssuesAnalyzed: number }> {
    const response = await api.get('/active-engineers')
    return response.data
  },
  // Fetch fresh data from Linear
  async fetchData() {
    const response = await api.post('/fetch-data')
    return response.data
  },

  // Get current planning state
  async getPlanningState(): Promise<PlanningState> {
    const response = await api.get('/planning-state')
    return response.data
  },

  // Update assignment
  async updateAssignment(issueId: string, fromEngineerId?: string, toEngineerId?: string) {
    const response = await api.post('/assignments', {
      issueId,
      fromEngineerId,
      toEngineerId
    })
    return response.data
  },

  // Get changes diff
  async getChanges(): Promise<ChangesResponse> {
    const response = await api.get('/changes')
    return response.data
  },

  // Reset to original state
  async reset() {
    const response = await api.post('/reset')
    return response.data
  },

  // Update estimate
  async updateEstimate(issueId: string, estimate: number) {
    console.log('API Client: Making updateEstimate request with:', { issueId, estimate })
    const response = await api.post('/update-estimate', {
      issueId,
      estimate
    })
    console.log('API Client: Response status:', response.status)
    console.log('API Client: Response data:', response.data)
    return response.data
  },

  // Update issue status
  async updateStatus(issueId: string, statusId: string) {
    console.log('API Client: Making updateStatus request with:', { issueId, statusId })
    const response = await api.post('/update-status', {
      issueId,
      statusId
    })
    console.log('API Client: Response status:', response.status)
    console.log('API Client: Response data:', response.data)
    return response.data
  },

  // Update issue cycle
  async updateCycle(issueId: string, cycleId: string) {
    console.log('API Client: Making updateCycle request with:', { issueId, cycleId })
    const response = await api.post('/update-cycle', {
      issueId,
      cycleId
    })
    console.log('API Client: Response status:', response.status)
    console.log('API Client: Response data:', response.data)
    return response.data
  },

  // Commit changes to Linear
  async commitChanges(changes: CommitChangeDetail[]): Promise<CommitChangesResponse> {
    const response = await api.post('/commit-changes', { changes })
    return response.data
  },

  async deleteChange(changeIndex: number): Promise<any> {
    console.log('API Client: Deleting change at index:', changeIndex)
    const response = await api.delete(`/changes/${changeIndex}`)
    console.log('API Client: Delete response:', response.data)
    return response.data
  },

  // Direct Linear API calls (fallback)
  async getCycles(): Promise<LinearCycle[]> {
    const response = await api.get('/cycles')
    return response.data
  },

  async getCycleIssues(cycleId: string): Promise<LinearIssue[]> {
    const response = await api.get(`/cycles/${cycleId}/issues`)
    return response.data
  },

  async getBacklog(): Promise<LinearIssue[]> {
    const response = await api.get('/backlog')
    return response.data
  },

  async getTeamMembers(): Promise<TeamMember[]> {
    const response = await api.get('/team-members')
    return response.data
  },

  async generateNewsletter(): Promise<any> {
    const response = await api.post('/newsletter/generate')
    console.log('Newsletter API response:', response.data)
    // API returns { success: true, data: actualNewsletterData }
    if (response.data.success) {
      return response.data.data
    } else {
      throw new Error(response.data.message || 'Failed to generate newsletter')
    }
  }
}