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
  type: 'assignment' | 'unassignment'
  issueId: string
  fromEngineerId?: string
  toEngineerId?: string
  timestamp: string
  issue: { id: string; identifier: string; title: string } | null
  fromEngineer: { id: string; name: string } | null
  toEngineer: { id: string; name: string } | null
}

export interface ChangesResponse {
  totalChanges: number
  changes: ChangeDetail[]
  lastFetched: string
}

export const planningApi = {
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
  }
}