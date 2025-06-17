import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

// Inline LinearClient to avoid import issues
class SimpleLinearClient {
  private apiKey: string
  private baseUrl = 'https://api.linear.app/graphql'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async query(query: string, variables: Record<string, any> = {}): Promise<any> {
    const authHeader = this.apiKey.startsWith('lin_oauth_') 
      ? `Bearer ${this.apiKey}`
      : this.apiKey

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    const data = await response.json() as any
    
    if (data.errors) {
      throw new Error(`Linear API Error: ${data.errors.map((e: any) => e.message).join(', ')}`)
    }

    return data.data
  }

  async validateApiKey(): Promise<any> {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `
    
    try {
      const data = await this.query(query)
      return data.viewer
    } catch (error) {
      throw new Error('Invalid Linear API key')
    }
  }

  async getRecentCycles(monthsBack: number = 3): Promise<any[]> {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - monthsBack)
    const threeMonthsAgoISO = threeMonthsAgo.toISOString()

    const query = `
      query($startDate: DateTimeOrDuration!) {
        cycles(
          filter: { 
            startsAt: { gte: $startDate }
          }
          first: 50
        ) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            team {
              id
              name
              key
            }
          }
        }
      }
    `
    
    const data = await this.query(query, { startDate: threeMonthsAgoISO })
    
    const currentDate = new Date()
    return data.cycles.nodes
      .map((cycle: any) => {
        const startDate = new Date(cycle.startsAt)
        const endDate = new Date(cycle.endsAt)
        
        let status: 'active' | 'completed' | 'future'
        if (currentDate < startDate) {
          status = 'future'
        } else if (currentDate >= startDate && currentDate <= endDate) {
          status = 'active'
        } else {
          status = 'completed'
        }

        return {
          ...cycle,
          name: cycle.name || `Cycle ${cycle.number}` || `Cycle ${cycle.id.slice(0, 8)}`,
          isActive: status === 'active',
          status,
        }
      })
      .sort((a: any, b: any) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
  }

  async getCompletedCycles(monthsBack: number = 6): Promise<any[]> {
    const cycles = await this.getRecentCycles(monthsBack)
    const currentDate = new Date()
    
    // Filter to only completed cycles and sort by completion date (most recent first)
    return cycles
      .filter(cycle => cycle.status === 'completed')
      .sort((a: any, b: any) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
  }

  async getIssuesInCycle(cycleId: string): Promise<any[]> {
    const query = `
      query($cycleId: String!) {
        cycle(id: $cycleId) {
          issues {
            nodes {
              id
              identifier
              title
              description
              url
              state {
                id
                name
                type
              }
              assignee {
                name
                email
              }
              priority
              estimate
              createdAt
              updatedAt
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              project {
                id
                name
                color
              }
            }
          }
        }
      }
    `

    const data = await this.query(query, { cycleId })
    return data.cycle?.issues?.nodes || []
  }

  async getCompletedIssuesInCycle(cycleId: string): Promise<any[]> {
    const query = `
      query($cycleId: String!) {
        cycle(id: $cycleId) {
          id
          name
          startsAt
          endsAt
          issues {
            nodes {
              id
              identifier
              title
              description
              url
              state {
                id
                name
                type
              }
              assignee {
                name
                email
                id
              }
              priority
              estimate
              createdAt
              updatedAt
              completedAt
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              project {
                id
                name
                color
              }
              history {
                nodes {
                  id
                  createdAt
                  fromState {
                    name
                    type
                  }
                  toState {
                    name
                    type
                  }
                }
              }
            }
          }
        }
      }
    `

    const data = await this.query(query, { cycleId })
    const cycle = data.cycle
    const allIssues = cycle?.issues?.nodes || []

    // Filter to only completed issues (Done, Completed, etc.)
    const completedIssues = allIssues.filter((issue: any) => {
      const stateType = issue.state?.type?.toLowerCase()
      const stateName = issue.state?.name?.toLowerCase()
      return stateType === 'completed' || 
             stateName?.includes('done') || 
             stateName?.includes('completed') ||
             stateName?.includes('closed')
    })

    // Add completion date from history if available
    return completedIssues.map((issue: any) => {
      let completedAt = issue.completedAt || issue.updatedAt

      // Try to find completion date from history
      if (issue.history?.nodes) {
        const completionEvent = issue.history.nodes
          .reverse() // Most recent first
          .find((event: any) => {
            const toStateType = event.toState?.type?.toLowerCase()
            const toStateName = event.toState?.name?.toLowerCase()
            return toStateType === 'completed' || 
                   toStateName?.includes('done') || 
                   toStateName?.includes('completed') ||
                   toStateName?.includes('closed')
          })
        
        if (completionEvent) {
          completedAt = completionEvent.createdAt
        }
      }

      return {
        ...issue,
        completedAt,
        cycle: {
          id: cycle.id,
          name: cycle.name,
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt
        }
      }
    })
  }

  async getTeams(): Promise<any[]> {
    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `
    
    const data = await this.query(query)
    return data.teams.nodes
  }

  async updateIssueAssignee(issueId: string, assigneeId: string | null): Promise<any> {
    const mutation = `
      mutation($issueId: String!, $assigneeId: String) {
        issueUpdate(
          id: $issueId
          input: { assigneeId: $assigneeId }
        ) {
          success
          issue {
            id
            identifier
            title
            assignee {
              id
              name
              email
            }
          }
        }
      }
    `

    try {
      const data = await this.query(mutation, { 
        issueId, 
        assigneeId: assigneeId || null 
      })
      
      if (!data.issueUpdate.success) {
        throw new Error('Linear API returned success: false')
      }
      
      return data.issueUpdate
    } catch (error: any) {
      throw new Error(`Failed to update issue assignee: ${error.message}`)
    }
  }

  async updateIssueEstimate(issueId: string, estimate: number): Promise<any> {
    const mutation = `
      mutation($issueId: String!, $estimate: Int) {
        issueUpdate(
          id: $issueId
          input: { estimate: $estimate }
        ) {
          success
          issue {
            id
            identifier
            title
            estimate
          }
        }
      }
    `

    try {
      // Ensure estimate is an integer
      const intEstimate = Math.round(estimate)
      console.log(`🔧 Linear API: Updating estimate for ${issueId} to ${intEstimate} (rounded from ${estimate})`)
      
      const data = await this.query(mutation, { issueId, estimate: intEstimate })
      console.log(`🔧 Linear API: Full response:`, JSON.stringify(data, null, 2))
      
      if (!data.issueUpdate.success) {
        console.log(`❌ Linear API: Update failed - success: false`)
        console.log(`❌ Linear API: Full data:`, data)
        throw new Error('Linear API returned success: false')
      }
      
      return data.issueUpdate
    } catch (error) {
      console.log(`❌ Linear API: Error caught:`, error)
      console.log(`❌ Linear API: Error type:`, typeof error)
      if (error && typeof error === 'object') {
        console.log(`❌ Linear API: Error properties:`, Object.keys(error))
      }
      if (error && typeof error === 'object') {
        const err = error as any
        if (err.response) {
          console.log(`❌ Linear API: Error response:`, err.response)
          console.log(`❌ Linear API: Error response data:`, err.response.data)
        }
        if (err.extensions) {
          console.log(`❌ Linear API: Error extensions:`, err.extensions)
        }
      }
      throw new Error(`Failed to update issue estimate: ${(error as any)?.message || 'Unknown error'}`)
    }
  }

  async updateIssueStatus(issueId: string, stateId: string): Promise<any> {
    console.log(`🔧 Linear API: updateIssueStatus called with:`, { issueId, stateId })
    console.log(`🔧 Linear API: stateId type: ${typeof stateId}, value: "${stateId}"`)
    
    const mutation = `
      mutation($issueId: String!, $stateId: String!) {
        issueUpdate(
          id: $issueId
          input: { stateId: $stateId }
        ) {
          success
          issue {
            id
            identifier
            title
            state {
              id
              name
              type
            }
          }
        }
      }
    `

    const variables = { issueId, stateId }
    console.log(`🔧 Linear API: GraphQL variables:`, variables)

    try {
      const data = await this.query(mutation, variables)
      
      if (!data.issueUpdate.success) {
        throw new Error('Linear API returned success: false')
      }
      
      return data.issueUpdate
    } catch (error: any) {
      throw new Error(`Failed to update issue status: ${error.message}`)
    }
  }

  async updateIssueCycle(issueId: string, cycleId: string | null): Promise<any> {
    const mutation = `
      mutation($issueId: String!, $cycleId: String) {
        issueUpdate(
          id: $issueId
          input: { cycleId: $cycleId }
        ) {
          success
          issue {
            id
            identifier
            title
            cycle {
              id
              name
              number
            }
          }
        }
      }
    `

    try {
      const data = await this.query(mutation, { issueId, cycleId })
      
      if (!data.issueUpdate.success) {
        throw new Error('Linear API returned success: false')
      }
      
      return data.issueUpdate
    } catch (error: any) {
      throw new Error(`Failed to update issue cycle: ${error.message}`)
    }
  }

  async updateIssueMultiple(issueId: string, updates: {
    assigneeId?: string | null
    stateId?: string
    cycleId?: string | null
    estimate?: number
  }): Promise<any> {
    const mutation = `
      mutation($issueId: String!, $input: IssueUpdateInput!) {
        issueUpdate(
          id: $issueId
          input: $input
        ) {
          success
          issue {
            id
            identifier
            title
            assignee {
              id
              name
              email
            }
            state {
              id
              name
              type
            }
            cycle {
              id
              name
              number
            }
            estimate
          }
        }
      }
    `

    try {
      const data = await this.query(mutation, { issueId, input: updates })
      
      if (!data.issueUpdate.success) {
        throw new Error('Linear API returned success: false')
      }
      
      return data.issueUpdate
    } catch (error: any) {
      throw new Error(`Failed to update issue: ${error.message}`)
    }
  }

  async getUsers(): Promise<any[]> {
    const query = `
      query {
        users {
          nodes {
            id
            name
            email
            active
          }
        }
      }
    `
    
    const data = await this.query(query)
    return data.users.nodes.filter((user: any) => user.active)
  }

  async getUnassignedIssues(): Promise<any[]> {
    const query = `
      query {
        issues(
          filter: { 
            assignee: { null: true }
          }
          first: 100
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            state {
              id
              name
              type
            }
            assignee {
              id
              name
              email
            }
            priority
            estimate
            createdAt
            updatedAt
            labels {
              nodes {
                id
                name
                color
              }
            }
            project {
              id
              name
              color
            }
            cycle {
              id
              name
              number
            }
          }
        }
      }
    `

    const data = await this.query(query)
    return data.issues.nodes
  }

  async getActiveEngineers(): Promise<any[]> {
    console.log('🔍 Starting getActiveEngineers...')
    
    try {
      // Step 1: Get recent cycles
      console.log('📅 Step 1: Getting recent cycles...')
      const recentCycles = await this.getRecentCycles(6)
      console.log(`📅 Found ${recentCycles.length} recent cycles:`, recentCycles.map(c => c.name))
      
      // Step 2: Get all teams/users
      console.log('👥 Step 2: Getting teams...')
      const allTeams = await this.getTeams()
      console.log(`👥 Found ${allTeams.length} teams`)
      const allUsers = allTeams.flatMap(team => team.members?.nodes || [])
      console.log(`👥 Found ${allUsers.length} total users:`, allUsers.map(u => u.name).slice(0, 5))
      
      // Step 3: Get issues from recent cycles
      console.log('📋 Step 3: Getting issues from cycles...')
      const allIssues: any[] = []
      for (const cycle of recentCycles) {
        console.log(`📋 Getting issues for cycle: ${cycle.name}`)
        const cycleIssues = await this.getIssuesInCycle(cycle.id)
        console.log(`📋 Found ${cycleIssues.length} issues in ${cycle.name}`)
        allIssues.push(...cycleIssues)
      }
      console.log(`📋 Total issues from all cycles: ${allIssues.length}`)
      
      // Step 4: Find active engineers
      console.log('🎯 Step 4: Finding active engineers...')
      const activeEngineerIds = new Set<string>()
      allIssues.forEach(issue => {
        if (issue.assignee?.id) {
          activeEngineerIds.add(issue.assignee.id)
        }
      })
      console.log(`🎯 Found ${activeEngineerIds.size} unique engineer IDs with assignments`)
      
      // Step 5: Map to full user objects
      console.log('✨ Step 5: Mapping to user objects...')
      const activeEngineers = allUsers.filter(user => 
        activeEngineerIds.has(user.id)
      ).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }))
      
      console.log(`✅ Final result: ${activeEngineers.length} active engineers`)
      activeEngineers.forEach(e => console.log(`  - ${e.name} (${e.email})`))
      
      return activeEngineers
      
    } catch (error) {
      console.error('❌ Error in getActiveEngineers:', error.message)
      console.error('❌ Stack trace:', error.stack)
      throw error
    }
  }
}

// Initialize Linear client if API key is available
let linearClient: SimpleLinearClient | null = null
if (process.env.LINEAR_API_KEY) {
  linearClient = new SimpleLinearClient(process.env.LINEAR_API_KEY)
  console.log('✅ Linear API Key configured and SimpleLinearClient initialized')
} else {
  console.log('❌ Linear API Key not found in environment variables')
}

const app = express()
const port = process.env.PORT || 3001

// Define types for planning state
interface PlanningState {
  lastFetched: string
  originalData: {
    cycles: any[]
    issues: any[]
    teamMembers: any[]
  }
  currentAssignments: { [key: string]: string[] }
  localChanges: any[]
}

interface HealthResponse {
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

app.use(cors())
app.use(express.json())

// Root API endpoint
app.get('/api/', (req: any, res: any) => {
  res.json({
    message: '🚀 Smart Tool of Knowing API Server is running!',
    status: 'online',
    version: '1.1.0',
    endpoints: {
      health: '/api/health',
      testLinear: '/api/test-linear',
      fetchData: 'POST /api/fetch-data',
      planningState: '/api/planning-state',
      cycles: '/api/cycles',
      backlog: '/api/backlog',
      teamMembers: '/api/team-members',
      assignments: 'POST /api/assignments',
      changes: '/api/changes',
      reset: 'POST /api/reset'
    },
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/api/health', async (req: any, res: any) => {
  try {
    // Basic API server health
    const health: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'running',
      endpoints: 'available'
    }

    // Check Linear connection if configured
    try {
      if (linearClient) {
        health.linear = {
          configured: true,
          status: 'ready',
          message: 'Linear API key configured and LinearClient ready'
        }
      } else {
        health.linear = {
          configured: false,
          status: 'not_configured',
          message: 'Linear API key not configured. Run "team setup" to configure.'
        }
      }
    } catch (error: any) {
      health.linear = {
        configured: false,
        status: 'error',
        message: error.message
      }
    }

    res.json(health)
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Test Linear connection specifically
app.get('/api/test-linear', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        success: false,
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key',
        helpUrl: 'https://linear.app/settings/api'
      })
    }

    console.log('🔍 Testing Linear API connection...')
    
    // Test real Linear API connection
    const viewer = await linearClient.validateApiKey()
    
    console.log('✅ Linear API connection successful:', viewer.name)
    
    res.json({
      success: true,
      message: 'Linear connection successful',
      data: {
        user: viewer.name,
        email: viewer.email,
        userId: viewer.id,
        apiVersion: 'v1'
      }
    })
  } catch (error: any) {
    console.error('❌ Linear API connection failed:', error.message)
    res.status(500).json({
      success: false,
      error: 'Linear connection failed',
      message: error.message,
      details: error.stack
    })
  }
})

// Mock API endpoints for now - will integrate with Linear later
app.get('/api/cycles', (req: any, res: any) => {
  res.json([
    {
      id: '1',
      name: 'Sprint 24',
      number: 24,
      startsAt: '2025-06-15T00:00:00Z',
      endsAt: '2025-06-29T00:00:00Z',
      issues: []
    }
  ])
})

app.get('/api/completed-cycles', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    console.log('🔍 Fetching completed cycles from Linear API...')
    const completedCycles = await linearClient.getCompletedCycles()
    
    const formattedCycles = completedCycles.map(cycle => ({
      id: cycle.id,
      name: cycle.name,
      number: cycle.number,
      startedAt: cycle.startsAt,
      completedAt: cycle.endsAt,
      team: cycle.team
    }))

    res.json({
      cycles: formattedCycles
    })
  } catch (error: any) {
    console.error('❌ Error fetching completed cycles:', error)
    res.status(500).json({
      error: 'Failed to fetch completed cycles',
      message: error.message
    })
  }
})

app.get('/api/cycle-review/:cycleId', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    const { cycleId } = req.params
    console.log(`🔍 Fetching cycle review data for cycle ${cycleId}...`)
    
    const completedIssues = await linearClient.getCompletedIssuesInCycle(cycleId)
    
    if (completedIssues.length === 0) {
      return res.json({
        cycle: null,
        stats: {
          totalIssues: 0,
          totalPoints: 0,
          totalPRs: 0,
          uniqueContributors: 0,
          velocity: 0
        },
        issues: [],
        pullRequests: []
      })
    }

    // Get cycle info from the first issue (they all share the same cycle data)
    const cycleInfo = completedIssues[0].cycle

    // Calculate aggregate statistics
    const totalIssues = completedIssues.length
    const totalPoints = completedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
    const uniqueContributors = new Set(
      completedIssues
        .filter(issue => issue.assignee?.id)
        .map(issue => issue.assignee.id)
    ).size

    // Calculate velocity (points per week)
    const cycleStart = new Date(cycleInfo.startsAt)
    const cycleEnd = new Date(cycleInfo.endsAt)
    const cycleDurationWeeks = Math.max(1, (cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24 * 7))
    const velocity = Math.round((totalPoints / cycleDurationWeeks) * 10) / 10 // Round to 1 decimal

    // Format issues for response
    const formattedIssues = completedIssues.map(issue => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      estimate: issue.estimate || 0,
      assignee: issue.assignee ? {
        id: issue.assignee.id,
        name: issue.assignee.name,
        email: issue.assignee.email
      } : null,
      project: issue.project ? {
        id: issue.project.id,
        name: issue.project.name,
        color: issue.project.color
      } : null,
      labels: issue.labels?.nodes || [],
      completedAt: issue.completedAt,
      url: issue.url,
      linkedPRs: [] // Will be populated by GitHub integration
    }))

    // Group data for easier frontend consumption
    const issuesByProject = formattedIssues.reduce((acc: any, issue) => {
      const projectKey = issue.project?.name || 'No Project'
      if (!acc[projectKey]) {
        acc[projectKey] = {
          project: issue.project,
          issues: [],
          totalPoints: 0
        }
      }
      acc[projectKey].issues.push(issue)
      acc[projectKey].totalPoints += issue.estimate
      return acc
    }, {})

    const issuesByEngineer = formattedIssues.reduce((acc: any, issue) => {
      const engineerKey = issue.assignee?.name || 'Unassigned'
      if (!acc[engineerKey]) {
        acc[engineerKey] = {
          assignee: issue.assignee,
          issues: [],
          totalPoints: 0
        }
      }
      acc[engineerKey].issues.push(issue)
      acc[engineerKey].totalPoints += issue.estimate
      return acc
    }, {})

    res.json({
      cycle: {
        id: cycleInfo.id,
        name: cycleInfo.name,
        startedAt: cycleInfo.startsAt,
        completedAt: cycleInfo.endsAt
      },
      stats: {
        totalIssues,
        totalPoints,
        totalPRs: 0, // Will be populated by GitHub integration
        uniqueContributors,
        velocity
      },
      issues: formattedIssues,
      issuesByProject,
      issuesByEngineer,
      pullRequests: [] // Will be populated by GitHub integration
    })

  } catch (error: any) {
    console.error('❌ Error fetching cycle review data:', error)
    res.status(500).json({
      error: 'Failed to fetch cycle review data',
      message: error.message
    })
  }
})

app.get('/api/backlog', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    console.log('🚀 Fetching unassigned issues from Linear API...')
    const unassignedIssues = await linearClient.getUnassignedIssues()
    
    // Process issues the same way as in fetch-data
    const processedIssues = unassignedIssues.map((issue: any) => ({
      ...issue,
      priority: issue.priority || 3,
      project: issue.project ? {
        ...issue.project,
        color: issue.project.color || '#6b7280'
      } : null
    }))

    console.log(`✅ Found ${processedIssues.length} unassigned issues`)
    res.json(processedIssues)
  } catch (error: any) {
    console.error('❌ Failed to fetch backlog:', error.message)
    res.status(500).json({ 
      error: 'Failed to fetch backlog',
      message: error.message 
    })
  }
})

app.get('/api/team-members', (req: any, res: any) => {
  res.json([
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: '2', name: 'Bob Chen', email: 'bob@example.com' },
    { id: '3', name: 'Carol Davis', email: 'carol@example.com' }
  ])
})

// Get active engineers from recent cycles
app.get('/api/active-engineers', async (req: any, res: any) => {
  console.log('🚀 Active engineers endpoint called')
  try {
    if (!linearClient) {
      console.log('❌ No linear client configured')
      return res.status(400).json({
        success: false,
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    console.log('🔄 Calling linearClient.getActiveEngineers()')
    let activeEngineers = await linearClient.getActiveEngineers()
    console.log(`📊 LinearClient returned ${activeEngineers.length} engineers`)
    
    // TEMPORARY FALLBACK: If no active engineers found via Linear API, extract from current planning state
    if (activeEngineers.length === 0 && planningState) {
      console.log('🔄 Fallback: Extracting engineers from current planning state')
      const engineerIds = new Set<string>()
      
      // Get engineer IDs from current assignments
      Object.keys(planningState.currentAssignments).forEach(engineerId => {
        if (planningState.currentAssignments[engineerId].length > 0) {
          engineerIds.add(engineerId)
        }
      })
      
      // Also get from issues directly
      planningState.originalData.issues.forEach(issue => {
        if (issue.assignee?.id) {
          engineerIds.add(issue.assignee.id)
        }
      })
      
      console.log(`🔄 Found ${engineerIds.size} engineer IDs from planning state:`, Array.from(engineerIds))
      
      // Create engineer objects from IDs (using email as both id and email)
      activeEngineers = Array.from(engineerIds).map(engineerId => ({
        id: engineerId,
        name: engineerId.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        email: engineerId,
        avatarUrl: null
      }))
      
      console.log(`🔄 Fallback created ${activeEngineers.length} engineers:`, activeEngineers.map(e => e.name))
    }
    
    console.log(`✅ Active engineers endpoint returning ${activeEngineers.length} engineers`)
    
    res.json({
      activeEngineers,
      totalCount: activeEngineers.length
    })
  } catch (error: any) {
    console.error('❌ Error in active engineers endpoint:', error)
    res.status(500).json({ 
      error: 'Failed to fetch active engineers',
      message: error.message 
    })
  }
})

// Temporary planning state storage
let planningState: PlanningState | null = null

app.post('/api/fetch-data', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        success: false,
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    console.log('🚀 Fetching real data from Linear API...')
    
    // Fetch real data from Linear
    const [cycles, teams, users, unassignedIssues] = await Promise.all([
      linearClient.getRecentCycles(3),
      linearClient.getTeams(),
      linearClient.getUsers(),
      linearClient.getUnassignedIssues()
    ])

    console.log(`📊 Found ${cycles.length} cycles, ${teams.length} teams, ${users.length} users, and ${unassignedIssues.length} unassigned issues`)

    // Get issues for all cycles
    const allIssues = []
    for (const cycle of cycles) {
      console.log(`📝 Fetching issues for cycle: ${cycle.name}`)
      const cycleIssues = await linearClient.getIssuesInCycle(cycle.id)
      
      // Add default colors for projects, normalize priorities, and add cycle info
      const processedIssues = cycleIssues.map((issue: any) => {
        
        return {
          ...issue,
          priority: issue.priority || 3, // Default to medium priority if null/undefined
          project: issue.project ? {
            ...issue.project,
            color: issue.project.color || '#6b7280' // Default gray color
          } : null,
          cycle: {
            id: cycle.id,
            name: cycle.name,
            number: cycle.number
          }
        }
      })
      
      allIssues.push(...processedIssues)
    }

    // Add unassigned issues (normalize them the same way)
    const processedUnassignedIssues = unassignedIssues.map((issue: any) => {
      
      return {
        ...issue,
        priority: issue.priority || 3, // Default to medium priority if null/undefined
        project: issue.project ? {
          ...issue.project,
          color: issue.project.color || '#6b7280' // Default gray color
        } : null
        // Note: unassigned issues may or may not have cycles
      }
    })
    
    allIssues.push(...processedUnassignedIssues)

    console.log(`✅ Found ${allIssues.length} total issues`)

    // Extract unique team members from issues
    const uniqueMembers = new Map()
    allIssues.forEach((issue: any) => {
      if (issue.assignee) {
        uniqueMembers.set(issue.assignee.email, {
          id: issue.assignee.email, // Use email as ID
          name: issue.assignee.name,
          email: issue.assignee.email
        })
      }
    })

    const teamMembers = Array.from(uniqueMembers.values())
    console.log(`👥 Found ${teamMembers.length} unique team members`)

    // Initialize assignments and populate with actual assignees
    const currentAssignments: { [key: string]: string[] } = {}
    teamMembers.forEach((member: any) => {
      currentAssignments[member.id] = []
    })

    // Populate assignments based on actual assignees
    allIssues.forEach((issue: any) => {
      if (issue.assignee && issue.assignee.email) {
        const assigneeId = issue.assignee.email
        if (currentAssignments[assigneeId]) {
          currentAssignments[assigneeId].push(issue.id)
        }
      }
    })

    console.log('📋 Assignment distribution:')
    teamMembers.forEach((member: any) => {
      const assignedCount = currentAssignments[member.id].length
      console.log(`  ${member.name}: ${assignedCount} issues`)
    })

    planningState = {
      lastFetched: new Date().toISOString(),
      originalData: {
        cycles,
        issues: allIssues,
        teamMembers,
        // users // Store Linear users for ID mapping if needed later
      },
      currentAssignments,
      localChanges: []
    }
    
    console.log('💾 Successfully stored planning state')
    
    res.json({
      success: true,
      message: `Successfully loaded ${allIssues.length} issues, ${cycles.length} cycles, and ${teamMembers.length} team members from Linear`,
      lastFetched: planningState.lastFetched,
      counts: {
        issues: allIssues.length,
        cycles: cycles.length,
        teamMembers: teamMembers.length
      }
    })
  } catch (error: any) {
    console.error('❌ Failed to fetch Linear data:', error.message)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Linear data',
      message: error.message,
      details: error.stack
    })
  }
})

app.get('/api/planning-state', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ error: 'No planning data available. Fetch data first.' })
  }
  res.json(planningState)
})

app.post('/api/assignments', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ error: 'No planning data available. Fetch data first.' })
  }

  const { issueId, fromEngineerId, toEngineerId } = req.body
  
  if (!issueId) {
    return res.status(400).json({ error: 'Missing required field: issueId' })
  }

  console.log(`🔄 Assignment update request:`, { issueId, fromEngineerId, toEngineerId })

  // Find the issue in our data
  const issue = planningState.originalData.issues.find(i => i.id === issueId)
  if (!issue) {
    return res.status(404).json({ error: `Issue ${issueId} not found` })
  }

  // Update the current assignments state
  // Remove from old engineer if specified
  if (fromEngineerId && planningState.currentAssignments[fromEngineerId]) {
    const oldIssues = planningState.currentAssignments[fromEngineerId]
    planningState.currentAssignments[fromEngineerId] = oldIssues.filter(id => id !== issueId)
    console.log(`🔄 Removed issue ${issueId} from engineer ${fromEngineerId}`)
  } else {
    // If no fromEngineerId specified, find and remove from any current assignment
    Object.keys(planningState.currentAssignments).forEach(engineerId => {
      const issues = planningState.currentAssignments[engineerId]
      if (issues.includes(issueId)) {
        planningState.currentAssignments[engineerId] = issues.filter(id => id !== issueId)
        console.log(`🔄 Found and removed issue ${issueId} from engineer ${engineerId}`)
      }
    })
  }

  // Add to new engineer if specified
  if (toEngineerId) {
    if (!planningState.currentAssignments[toEngineerId]) {
      planningState.currentAssignments[toEngineerId] = []
    }
    // Only add if not already assigned to this engineer
    if (!planningState.currentAssignments[toEngineerId].includes(issueId)) {
      planningState.currentAssignments[toEngineerId].push(issueId)
      console.log(`🔄 Added issue ${issueId} to engineer ${toEngineerId}`)
    }
  }

  // Track the change in localChanges
  const changeRecord = {
    type: 'assignment' as const,
    issueId,
    fromEngineerId,
    toEngineerId,
    timestamp: new Date().toISOString()
  }

  planningState.localChanges.push(changeRecord)
  console.log(`📝 Tracked assignment change:`, changeRecord)
  console.log(`📝 Total local changes: ${planningState.localChanges.length}`)

  res.json({ 
    success: true,
    message: 'Assignment updated',
    change: changeRecord
  })
})

app.get('/api/changes', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ error: 'No planning data available. Fetch data first.' })
  }

  const changes = planningState.localChanges.map(change => {
    const issue = planningState!.originalData.issues.find(i => i.id === change.issueId)
    const fromEngineer = change.fromEngineerId ? 
      planningState!.originalData.teamMembers.find(m => m.id === change.fromEngineerId) : null
    const toEngineer = change.toEngineerId ? 
      planningState!.originalData.teamMembers.find(m => m.id === change.toEngineerId) : null

    return {
      ...change,
      issue: issue ? { id: issue.id, identifier: issue.identifier, title: issue.title } : null,
      fromEngineer: fromEngineer ? { id: fromEngineer.id, name: fromEngineer.name } : null,
      toEngineer: toEngineer ? { id: toEngineer.id, name: toEngineer.name } : null
    }
  })

  console.log(`📋 Changes endpoint called, returning ${changes.length} changes`)
  console.log(`📋 Raw localChanges:`, planningState.localChanges)
  console.log(`📋 Processed changes:`, changes)

  res.json({
    totalChanges: changes.length,
    changes,
    lastFetched: planningState.lastFetched
  })
})

// Delete individual change endpoint
app.delete('/api/changes/:changeIndex', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ error: 'No planning data available. Fetch data first.' })
  }

  const changeIndex = parseInt(req.params.changeIndex)
  if (isNaN(changeIndex) || changeIndex < 0 || changeIndex >= planningState.localChanges.length) {
    return res.status(400).json({ error: 'Invalid change index' })
  }

  const deletedChange = planningState.localChanges.splice(changeIndex, 1)[0]
  
  console.log(`🗑️ Deleting change at index ${changeIndex}:`, deletedChange)

  // Reverse the change in the current assignments to rollback the UI state
  if (deletedChange.type === 'assignment') {
    const { issueId, fromEngineerId, toEngineerId } = deletedChange
    
    console.log(`🔄 Rolling back assignment change for issue ${issueId}`)
    
    // Remove from the "to" engineer (reverse the assignment)
    if (toEngineerId && planningState.currentAssignments[toEngineerId]) {
      planningState.currentAssignments[toEngineerId] = 
        planningState.currentAssignments[toEngineerId].filter(id => id !== issueId)
      console.log(`🔄 Removed issue ${issueId} from engineer ${toEngineerId} (rollback)`)
    }
    
    // Add back to the "from" engineer (restore original assignment)
    if (fromEngineerId) {
      if (!planningState.currentAssignments[fromEngineerId]) {
        planningState.currentAssignments[fromEngineerId] = []
      }
      if (!planningState.currentAssignments[fromEngineerId].includes(issueId)) {
        planningState.currentAssignments[fromEngineerId].push(issueId)
        console.log(`🔄 Restored issue ${issueId} to engineer ${fromEngineerId} (rollback)`)
      }
    }
  } else if (deletedChange.type === 'estimate') {
    // For estimate changes, we'd need to restore the original estimate
    // This requires tracking the previous estimate value in the change record
    console.log(`🔄 Rolling back estimate change for issue ${deletedChange.issueId}`)
    // TODO: Implement estimate rollback when we track previous estimates
  } else if (deletedChange.type === 'status') {
    // For status changes, restore the original state in the issue data
    const { issueId, previousStateId } = deletedChange
    const issue = planningState.originalData.issues.find(i => i.id === issueId)
    
    if (issue && previousStateId) {
      console.log(`🔄 Rolling back status change for issue ${issueId} to previous state ${previousStateId}`)
      // Restore the original state in the issue object
      issue.state = {
        ...issue.state,
        id: previousStateId,
        name: previousStateId // Will need to be improved with proper state name mapping
      }
      console.log(`🔄 Status rollback completed for issue ${issueId}`)
    }
  } else if (deletedChange.type === 'cycle') {
    // For cycle changes, track the rollback
    const { issueId, previousCycleId } = deletedChange
    const issue = planningState.originalData.issues.find(i => i.id === issueId)
    
    if (issue) {
      console.log(`🔄 Rolling back cycle change for issue ${issueId} to previous cycle ${previousCycleId || 'none'}`)
      // Note: For full rollback, we'd need to restore the cycle in the issue object
      // But since we're tracking changes for commit, this logging is sufficient for now
      console.log(`🔄 Cycle rollback tracked for issue ${issueId}`)
    }
  }
  
  console.log(`🗑️ Change deleted and rolled back. Remaining changes: ${planningState.localChanges.length}`)

  res.json({
    success: true,
    message: 'Change deleted and rolled back',
    deletedChange,
    remainingChanges: planningState.localChanges.length
  })
})

// Update status endpoint
app.post('/api/update-status', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ 
      success: false,
      error: 'No planning data available. Fetch data first.' 
    })
  }

  const { issueId, statusId } = req.body
  
  if (!issueId || !statusId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: issueId and statusId'
    })
  }

  console.log(`🔄 Status update request:`, { issueId, statusId })

  // Find the issue in our data
  const issue = planningState.originalData.issues.find(i => i.id === issueId)
  if (!issue) {
    return res.status(404).json({
      success: false,
      error: `Issue ${issueId} not found`
    })
  }

  const previousStateId = issue.state.id
  const previousStateName = issue.state.name

  console.log(`🔄 Status change from "${previousStateName}" (${previousStateId}) to "${statusId}"`)

  // Update the issue state in local data to reflect the change immediately in UI
  // We need to find the proper state name for the UI, not just use the UUID
  console.log(`🔄 Finding state name for UUID: ${statusId}`)
  
  // Find the state name from all available states in our data
  let stateName = statusId // fallback to UUID if we can't find the name
  
  // Look through all issues to find a state with this ID
  for (const issueData of planningState.originalData.issues) {
    if (issueData.state && issueData.state.id === statusId) {
      stateName = issueData.state.name
      console.log(`🔄 Found state name: ${stateName} for ID: ${statusId}`)
      break
    }
  }
  
  // Update the issue with the new state for immediate UI feedback
  issue.state = {
    ...issue.state,
    id: statusId,
    name: stateName
  }
  console.log(`🔄 Updated local issue state for immediate UI feedback: ${stateName}`)

  // Track the change in localChanges
  const changeRecord = {
    type: 'status' as const,
    issueId,
    stateId: statusId, // This should be the Linear state ID
    previousStateId,
    timestamp: new Date().toISOString()
  }

  planningState.localChanges.push(changeRecord)
  console.log(`📝 Tracked status change:`, changeRecord)
  console.log(`📝 Total local changes: ${planningState.localChanges.length}`)

  res.json({ 
    success: true,
    message: `Updated status for ${issue.identifier}`,
    change: changeRecord
  })
})

// Update cycle endpoint
app.post('/api/update-cycle', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ 
      success: false,
      error: 'No planning data available. Fetch data first.' 
    })
  }

  const { issueId, cycleId } = req.body
  
  if (!issueId || !cycleId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: issueId and cycleId'
    })
  }

  console.log(`🔄 Cycle update request:`, { issueId, cycleId })

  // Find the issue in our data
  const issue = planningState.originalData.issues.find(i => i.id === issueId)
  if (!issue) {
    return res.status(404).json({
      success: false,
      error: `Issue ${issueId} not found`
    })
  }

  const previousCycleId = issue.cycle?.id || null
  
  // Find the target cycle to get its name
  const targetCycle = planningState.originalData.cycles.find(c => c.id === cycleId)
  const cycleName = targetCycle ? targetCycle.name : 'Unknown Cycle'

  console.log(`🔄 Cycle change from "${previousCycleId || 'none'}" to "${cycleId}" (${cycleName})`)

  // Update the issue cycle in our local state for immediate UI feedback
  issue.cycle = {
    id: cycleId,
    name: cycleName,
    number: targetCycle?.number || 0
  }
  console.log(`🔄 Updated local issue cycle for immediate UI feedback: ${cycleName}`)

  // Track the change in localChanges
  const changeRecord = {
    type: 'cycle' as const,
    issueId,
    cycleId,
    previousCycleId,
    timestamp: new Date().toISOString()
  }

  planningState.localChanges.push(changeRecord)
  console.log(`📝 Tracked cycle change:`, changeRecord)
  console.log(`📝 Total local changes: ${planningState.localChanges.length}`)

  res.json({ 
    success: true,
    message: `Updated cycle for ${issue.identifier} to ${cycleName}`,
    change: changeRecord
  })
})

app.post('/api/reset', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ error: 'No planning data available. Fetch data first.' })
  }
  res.json({ message: 'State reset' })
})

// Update estimate endpoint
app.post('/api/update-estimate', (req: any, res: any) => {
  if (!planningState) {
    return res.status(404).json({ 
      success: false,
      error: 'No planning data available. Fetch data first.' 
    })
  }

  const { issueId, estimate } = req.body
  
  if (!issueId || estimate === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: issueId and estimate'
    })
  }

  // Find the issue in our data
  const issue = planningState.originalData.issues.find(i => i.id === issueId)
  if (!issue) {
    return res.status(404).json({
      success: false,
      error: `Issue ${issueId} not found`
    })
  }

  const previousEstimate = issue.estimate
  
  // Record the change
  const change = {
    type: 'estimate',
    issueId,
    estimate: Number(estimate),
    previousEstimate,
    timestamp: new Date().toISOString()
  }

  // Update the issue estimate in our local state
  issue.estimate = Number(estimate)

  // Add to local changes
  planningState.localChanges.push(change)

  console.log(`📝 Updated estimate for ${issue.identifier}: ${previousEstimate} → ${estimate}`)
  console.log(`📝 Total local changes now: ${planningState.localChanges.length}`)
  console.log(`📝 Latest change:`, change)
  console.log(`📝 All changes:`, planningState.localChanges)

  res.json({
    success: true,
    message: `Updated estimate for ${issue.identifier}`,
    change
  })
})

// Commit changes to Linear
app.post('/api/commit-changes', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        success: false,
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    if (!planningState) {
      return res.status(404).json({
        success: false,
        error: 'No planning data available',
        message: 'Fetch data first before committing changes'
      })
    }

    const { changes } = req.body
    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Changes array is required'
      })
    }

    console.log(`🚀 Committing ${changes.length} changes to Linear...`)

    const results = []
    for (const change of changes) {
      try {
        console.log(`📝 Processing change: ${change.description}`)
        
        // Get the issue from the change
        const issue = planningState.originalData.issues.find(
          (i: any) => i.identifier === change.issueIdentifier || i.id === change.issueId
        )
        
        if (!issue) {
          results.push({
            id: change.id,
            success: false,
            error: `Issue ${change.issueIdentifier || change.issueId} not found`
          })
          continue
        }

        if (change.type === 'assignment') {
          console.log(`🔄 Updating assignment for ${change.issueIdentifier}`)
          
          // Find the Linear user ID from email
          let linearUserId = null
          if (change.toAssignee) {
            // Map assignee name to email, then email to Linear user ID
            const teamMember = planningState.originalData.teamMembers?.find(
              (member: any) => member.name === change.toAssignee
            )
            if (teamMember) {
              // TODO: Add users back to originalData if needed for ID mapping
              const linearUser = users.find(
                (user: any) => user.email === teamMember.email
              )
              if (linearUser) {
                linearUserId = linearUser.id
              }
            }
          }
          
          try {
            // Make the actual Linear API call
            const updateResult = await linearClient.updateIssueAssignee(issue.id, linearUserId)
            
            results.push({
              id: change.id,
              success: true,
              message: `Successfully updated assignment for ${change.issueIdentifier}`,
              linearResponse: updateResult
            })
            
            console.log(`✅ Successfully committed change: ${change.description}`)
          } catch (linearError) {
            console.error(`❌ Linear API error for ${change.issueIdentifier}:`, linearError.message)
            results.push({
              id: change.id,
              success: false,
              error: `Linear API error: ${linearError.message}`
            })
          }
        } else if (change.type === 'estimate') {
          console.log(`🔢 Updating estimate for ${change.issueIdentifier}`)
          
          try {
            const updateResult = await linearClient.updateIssueEstimate(issue.id, change.estimate)
            
            results.push({
              id: change.id,
              success: true,
              message: `Successfully updated estimate for ${change.issueIdentifier}`,
              linearResponse: updateResult
            })
            
            console.log(`✅ Successfully committed change: ${change.description}`)
          } catch (linearError) {
            console.error(`❌ Linear API error for ${change.issueIdentifier}:`, linearError.message)
            results.push({
              id: change.id,
              success: false,
              error: `Linear API error: ${linearError.message}`
            })
          }
        } else if (change.type === 'status') {
          console.log(`📊 Updating status for ${change.issueIdentifier}`)
          console.log(`📊 Status change details:`, {
            issueId: issue.id,
            stateId: change.stateId,
            changeObject: change
          })
          
          if (!change.stateId) {
            results.push({
              id: change.id,
              success: false,
              error: `Missing stateId in change object`
            })
            continue
          }
          
          try {
            console.log(`📊 Calling Linear API with issueId: ${issue.id}, stateId: ${change.stateId}`)
            const updateResult = await linearClient.updateIssueStatus(issue.id, change.stateId)
            
            results.push({
              id: change.id,
              success: true,
              message: `Successfully updated status for ${change.issueIdentifier}`,
              linearResponse: updateResult
            })
            
            console.log(`✅ Successfully committed change: ${change.description}`)
          } catch (linearError) {
            console.error(`❌ Linear API error for ${change.issueIdentifier}:`, linearError.message)
            results.push({
              id: change.id,
              success: false,
              error: `Linear API error: ${linearError.message}`
            })
          }
        } else if (change.type === 'cycle') {
          console.log(`🔄 Updating cycle for ${change.issueIdentifier}`)
          
          try {
            const updateResult = await linearClient.updateIssueCycle(issue.id, change.cycleId)
            
            results.push({
              id: change.id,
              success: true,
              message: `Successfully updated cycle for ${change.issueIdentifier}`,
              linearResponse: updateResult
            })
            
            console.log(`✅ Successfully committed change: ${change.description}`)
          } catch (linearError) {
            console.error(`❌ Linear API error for ${change.issueIdentifier}:`, linearError.message)
            results.push({
              id: change.id,
              success: false,
              error: `Linear API error: ${linearError.message}`
            })
          }
        } else if (change.type === 'multiple') {
          console.log(`🔧 Updating multiple fields for ${change.issueIdentifier}`)
          
          // Build updates object
          const updates: any = {}
          
          if (change.assigneeId !== undefined) {
            updates.assigneeId = change.assigneeId
          }
          if (change.stateId) {
            updates.stateId = change.stateId
          }
          if (change.cycleId !== undefined) {
            updates.cycleId = change.cycleId
          }
          if (change.estimate !== undefined) {
            updates.estimate = change.estimate
          }
          
          try {
            const updateResult = await linearClient.updateIssueMultiple(issue.id, updates)
            
            results.push({
              id: change.id,
              success: true,
              message: `Successfully updated multiple fields for ${change.issueIdentifier}`,
              linearResponse: updateResult
            })
            
            console.log(`✅ Successfully committed change: ${change.description}`)
          } catch (linearError) {
            console.error(`❌ Linear API error for ${change.issueIdentifier}:`, linearError.message)
            results.push({
              id: change.id,
              success: false,
              error: `Linear API error: ${linearError.message}`
            })
          }
        } else {
          results.push({
            id: change.id,
            success: false,
            error: `Unknown change type: ${change.type}`
          })
        }
      } catch (error) {
        console.error(`❌ Failed to commit change ${change.id}:`, error)
        results.push({
          id: change.id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`📊 Commit summary: ${successCount} successful, ${failureCount} failed`)

    res.json({
      success: true,
      message: `Committed ${successCount} of ${changes.length} changes successfully`,
      results,
      summary: {
        total: changes.length,
        successful: successCount,
        failed: failureCount
      }
    })
  } catch (error) {
    console.error('❌ Failed to commit changes:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to commit changes',
      message: error.message,
      details: error.stack
    })
  }
})

app.listen(port, () => {
  console.log(`🚀 Planning API server running on port ${port}`)
  console.log(`📡 API endpoints available at http://localhost:${port}/api/*`)
})

export { app }