import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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
    } catch (error: any) {
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
    if (!data.cycle) {
      console.warn(`No cycle data found for cycleId: ${cycleId}`)
      return []
    }
    if (!data.cycle.issues?.nodes) {
      console.warn(`No issues found in cycle ${cycleId}`)
      return []
    }
    return data.cycle.issues.nodes
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
              attachments {
                nodes {
                  id
                  title
                  url
                  createdAt
                  creator {
                    name
                  }
                  metadata
                }
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
    if (!cycle) {
      console.warn(`No cycle data found for cycleId: ${cycleId}`)
      return []
    }
    const allIssues = cycle.issues?.nodes
    if (!allIssues) {
      console.warn(`No issues found in cycle ${cycleId}`)
      return []
    }

    // Filter to only issues with "Done" status (exact match)
    const completedIssues = allIssues.filter((issue: any) => {
      const stateName = issue.state?.name?.toLowerCase()
      const isDone = stateName === 'done'
      
      if (!isDone) {
        console.debug(`Issue ${issue.identifier} has status "${issue.state?.name}" - excluding from cycle review (only "Done" issues shown)`)
      }
      
      return isDone
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

      // Process attachments to extract GitHub PRs
      const attachments = issue.attachments?.nodes
      if (!attachments) {
        console.debug(`No attachments found for issue ${issue.identifier}`)
      }
      const linkedPRs = this.extractGitHubPRsFromAttachments(attachments || [])

      return {
        ...issue,
        completedAt,
        linkedPRs,
        cycle: {
          id: cycle.id,
          name: cycle.name,
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt
        }
      }
    })
  }

  async getCycleIssues(cycleId: string, statusTypes?: string[]): Promise<any[]> {
    const query = `
      query($cycleId: String!, $first: Int) {
        cycle(id: $cycleId) {
          issues(first: $first) {
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
              attachments {
                nodes {
                  id
                  title
                  url
                  subtitle
                }
              }
            }
          }
        }
      }
    `
    
    const data = await this.query(query, { cycleId, first: 100 })
    
    if (!data.cycle) {
      throw new Error(`Cycle with ID ${cycleId} not found`)
    }
    
    let issues = data.cycle.issues.nodes
    
    // Filter by status types if provided
    if (statusTypes && statusTypes.length > 0) {
      const filterTypes = statusTypes.map(type => type.toLowerCase())
      issues = issues.filter((issue: any) => {
        const stateType = issue.state.type?.toLowerCase()
        const stateName = issue.state.name?.toLowerCase()
        return filterTypes.includes(stateType) || filterTypes.includes(stateName)
      })
    }
    
    // Extract GitHub PRs from attachments for each issue
    for (const issue of issues) {
      issue.linkedPRs = this.extractGitHubPRsFromAttachments(issue.attachments?.nodes || [])
    }
    
    return issues
  }

  async testSingleIssueAttachments(issueId: string): Promise<any> {
    const query = `
      query($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          title
          attachments {
            nodes {
              id
              title
              url
              createdAt
              creator {
                name
              }
            }
          }
        }
      }
    `
    
    const data = await this.query(query, { issueId })
    console.log(`Test attachments for issue ${data.issue?.identifier}:`, data.issue?.attachments?.nodes)
    return data.issue
  }

  private extractGitHubPRsFromAttachments(attachments: any[]): any[] {
    if (!attachments || attachments.length === 0) {
      return []
    }
    return attachments
      .filter(attachment => {
        // Filter for GitHub pull request URLs
        const url = attachment.url || ''
        return url.includes('github.com') && url.includes('/pull/')
      })
      .map(attachment => {
        const url = attachment.url || ''
        
        // Extract PR number from URL
        const prNumberMatch = url.match(/\/pull\/(\d+)/)
        const prNumber = prNumberMatch ? parseInt(prNumberMatch[1]) : null
        
        // Extract repo and org from URL
        const repoMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull/)
        const org = repoMatch ? repoMatch[1] : null
        const repo = repoMatch ? repoMatch[2] : null

        return {
          id: attachment.id,
          title: attachment.title || `PR #${prNumber}`,
          url: attachment.url,
          number: prNumber,
          org,
          repo,
          createdAt: attachment.createdAt,
          creator: attachment.creator?.name,
          metadata: attachment.metadata
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
      
    } catch (error: any) {
      console.error('❌ Error in getActiveEngineers:', error.message)
      console.error('❌ Stack trace:', error.stack)
      throw error
    }
  }

  async searchGitHubPRsForIssue(issueIdentifier: string): Promise<any[]> {
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      console.debug('GITHUB_TOKEN not set, skipping GitHub search')
      return []
    }

    const searchPatterns = [
      `"${issueIdentifier}" in:title`,
      `"${issueIdentifier}" in:body`,
      `"Fixes ${issueIdentifier}"`,
      `"Closes ${issueIdentifier}"`
    ]

    const allPRs: any[] = []
    const seenPRs = new Set<string>()

    for (const pattern of searchPatterns) {
      try {
        const { stdout } = await execAsync(
          `gh pr list --state merged --search "${pattern}" --json number,title,url,author,mergedAt,additions,deletions,files,body,headRefName --limit 50`,
          { env: { ...process.env, GH_TOKEN: githubToken } }
        )

        if (stdout.trim()) {
          const prs = JSON.parse(stdout)
          for (const pr of prs) {
            const prId = pr.url
            if (!seenPRs.has(prId)) {
              seenPRs.add(prId)
              
              // Calculate confidence
              let confidence = 0.5
              if (pr.title && pr.title.includes(issueIdentifier)) confidence += 0.3
              if (pr.body && pr.body.toLowerCase().includes(`fixes ${issueIdentifier.toLowerCase()}`)) confidence += 0.2
              if (pr.headRefName && pr.headRefName.includes(issueIdentifier)) confidence += 0.1
              
              allPRs.push({
                ...pr,
                confidence: Math.min(confidence, 0.95),
                linkedIssues: [issueIdentifier]
              })
            }
          }
        }
      } catch (error) {
        console.error(`Error searching GitHub for pattern "${pattern}":`, error)
      }
    }

    return allPRs.sort((a, b) => b.confidence - a.confidence)
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
      cycles: '/api/cycles',
      completedCycles: '/api/completed-cycles',
      reviewableCycles: '/api/reviewable-cycles',
      cycleReview: '/api/cycle-review/:cycleId',
      backlog: '/api/backlog',
      teamMembers: '/api/team-members',
      activeEngineers: '/api/active-engineers',
      newsletter: 'POST /api/newsletter/generate'
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
app.get('/api/test-attachments/:issueId', async (req: any, res: any) => {
  try {
    const { issueId } = req.params
    const result = await linearClient.testSingleIssueAttachments(issueId)
    res.json({ success: true, result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

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

app.get('/api/reviewable-cycles', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    console.log('🔍 Fetching reviewable cycles (completed + active) from Linear API...')
    
    // Get recent cycles (includes both completed and active)
    const recentCycles = await linearClient.getRecentCycles(6) // Get last 6 months
    
    // Filter to get completed cycles and current active cycle
    const now = new Date()
    const reviewableCycles = recentCycles.filter(cycle => {
      const startDate = new Date(cycle.startsAt)
      const endDate = new Date(cycle.endsAt)
      
      // Include if completed OR currently active
      const isCompleted = cycle.status === 'completed'
      const isActive = cycle.status === 'active' && now >= startDate && now <= endDate
      
      return isCompleted || isActive
    })
    
    // Sort by start date (most recent first)
    reviewableCycles.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    
    const formattedCycles = reviewableCycles.map(cycle => ({
      id: cycle.id,
      name: cycle.name,
      number: cycle.number,
      startedAt: cycle.startsAt,
      completedAt: cycle.endsAt,
      team: cycle.team,
      status: cycle.status, // Include status to distinguish active vs completed
      isActive: cycle.status === 'active'
    }))

    console.log(`✅ Found ${formattedCycles.length} reviewable cycles (${formattedCycles.filter(c => c.isActive).length} active, ${formattedCycles.filter(c => !c.isActive).length} completed)`)

    res.json({
      cycles: formattedCycles
    })
  } catch (error: any) {
    console.error('❌ Error fetching reviewable cycles:', error)
    res.status(500).json({
      error: 'Failed to fetch reviewable cycles',
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
      console.log(`No completed issues found for cycle ${cycleId}`)
      return res.json({
        cycle: null,
        stats: {
          totalIssues: 0, // No completed issues found
          totalPoints: 0, // No story points completed
          totalPRs: 0, // No PRs linked
          uniqueContributors: 0, // No contributors found
          velocity: 0 // No velocity data available
        },
        issues: [],
        pullRequests: []
      })
    }

    // Get cycle info from the first issue (they all share the same cycle data)
    const cycleInfo = completedIssues[0].cycle

    // Calculate aggregate statistics
    const totalIssues = completedIssues.length
    const totalPoints = completedIssues.reduce((sum, issue) => {
      const estimate = issue.estimate
      if (estimate === null || estimate === undefined) {
        console.debug(`Issue ${issue.identifier} has no estimate - treating as 0 points`)
        return sum + 0
      }
      return sum + estimate
    }, 0)
    // Calculate PR statistics
    let totalPRs = 0
    let totalAdditions = 0
    let totalDeletions = 0
    let totalFilesChanged = 0
    
    const pullRequests: any[] = []
    const seenPRUrls = new Set<string>()
    
    // Collect all unique PRs and their stats
    for (const issue of completedIssues) {
      if (issue.linkedPRs && issue.linkedPRs.length > 0) {
        for (const pr of issue.linkedPRs) {
          if (!seenPRUrls.has(pr.url)) {
            seenPRUrls.add(pr.url)
            totalPRs++
            
            // Add to total statistics
            totalAdditions += pr.additions || 0
            totalDeletions += pr.deletions || 0
            totalFilesChanged += pr.filesChanged || 0
            
            pullRequests.push({
              ...pr,
              linkedIssues: [issue.identifier],
              stats: {
                additions: pr.additions || 0,
                deletions: pr.deletions || 0,
                filesChanged: pr.filesChanged || 0
              }
            })
          }
        }
      }
    }
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
      linkedPRs: issue.linkedPRs || []
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
        totalPRs,
        totalAdditions,
        totalDeletions,
        totalFilesChanged,
        uniqueContributors,
        velocity
      },
      issues: formattedIssues,
      issuesByProject,
      issuesByEngineer,
      pullRequests
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
    const activeEngineers = await linearClient.getActiveEngineers()
    console.log(`📊 LinearClient returned ${activeEngineers.length} engineers`)
    
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

// Newsletter generation endpoint
app.post('/api/newsletter/generate', async (req: express.Request, res: express.Response) => {
  console.log('📰 Newsletter generation request received')
  
  try {
    if (!linearClient) {
      return res.status(400).json({
        success: false,
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    // Get the most recently completed cycle
    const cycles = await linearClient.getRecentCycles(6) // Look back 6 months
    const completedCycles = cycles.filter(cycle => cycle.status === 'completed')
      .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
    
    if (completedCycles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No completed cycles found',
        message: 'No completed cycles available for newsletter generation'
      })
    }

    const latestCycle = completedCycles[0]
    console.log(`📊 Generating newsletter for cycle: ${latestCycle.name}`)

    // Get completed issues from the latest cycle
    const completedIssues = await linearClient.getCycleIssues(latestCycle.id, ['done', 'completed'])
    
    // Get GitHub stats (mock for now - could integrate with GitHub API later)
    const githubStats = {
      totalPRs: Math.floor(Math.random() * 20) + 5, // Mock data
      totalCommits: Math.floor(Math.random() * 100) + 20 // Mock data
    }

    // Generate AI summary using existing AI service (mock for now)
    let summary = null
    let projectSummaries: Record<string, string> = {}
    try {
      // Generate overall summary
      summary = generateCycleSummary(completedIssues, latestCycle)
      
      // Generate project-specific summaries
      projectSummaries = generateProjectSummaries(completedIssues)
    } catch (error: any) {
      console.warn('⚠️ AI summary generation failed:', error instanceof Error ? error.message : 'Unknown error')
      // Continue without summary
    }

    const newsletterData = {
      completedIssues: completedIssues.map(issue => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        description: issue.description || '',
        url: issue.url,
        assignee: issue.assignee ? { name: issue.assignee.name } : null,
        project: issue.project ? {
          name: issue.project.name,
          color: issue.project.color
        } : null,
        estimate: issue.estimate || 0,
        linkedPRs: issue.linkedPRs || [] // Now using real linked PR data from Linear
      })),
      cycleInfo: {
        name: latestCycle.name,
        startDate: latestCycle.startsAt,
        endDate: latestCycle.endsAt
      },
      githubStats,
      summary,
      projectSummaries
    }

    console.log(`✅ Newsletter generated successfully with ${completedIssues.length} completed issues`)
    res.json({
      success: true,
      data: newsletterData
    })

  } catch (error: any) {
    console.error('❌ Failed to generate newsletter:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate newsletter',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    })
  }
})

app.get('/api/cycle-review/:cycleId/github-data', async (req: any, res: any) => {
  try {
    if (!linearClient) {
      return res.status(400).json({
        error: 'Linear API key not configured',
        message: 'Run "team setup" to configure your Linear API key'
      })
    }

    const { cycleId } = req.params
    console.log(`🔍 Fetching GitHub data for cycle ${cycleId}...`)
    
    const completedIssues = await linearClient.getCompletedIssuesInCycle(cycleId)
    
    // Collect all PRs - both from attachments and GitHub search
    const allPRs: any[] = []
    const seenPRUrls = new Set<string>()
    
    for (const issue of completedIssues) {
      // First, add PRs from Linear attachments (highest confidence)
      if (issue.linkedPRs && issue.linkedPRs.length > 0) {
        for (const pr of issue.linkedPRs) {
          if (!seenPRUrls.has(pr.url)) {
            seenPRUrls.add(pr.url)
            allPRs.push({
              ...pr,
              linkedIssues: [issue.identifier],
              author: pr.creator || 'Unknown',
              mergedAt: pr.createdAt || null,
              confidence: 1.0, // 100% confidence for Linear attachments
              stats: {
                additions: pr.additions || 0,
                deletions: pr.deletions || 0,
                filesChanged: pr.filesChanged || 0
              }
            })
          }
        }
      }
      
      // Then search GitHub for additional PRs that might be related
      const githubPRs = await linearClient.searchGitHubPRsForIssue(issue.identifier)
      for (const pr of githubPRs) {
        if (!seenPRUrls.has(pr.url)) {
          seenPRUrls.add(pr.url)
          
          // Extract repo info from URL
          const repoMatch = pr.url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/)
          const [, org, repo] = repoMatch || ['', '', '']
          
          allPRs.push({
            id: `${org}/${repo}#${pr.number}`,
            number: pr.number,
            title: pr.title,
            url: pr.url,
            org,
            repo,
            linkedIssues: pr.linkedIssues,
            author: pr.author?.login || 'Unknown',
            mergedAt: pr.mergedAt,
            confidence: pr.confidence,
            creator: pr.author?.login,
            stats: {
              additions: pr.additions || 0,
              deletions: pr.deletions || 0,
              filesChanged: pr.files?.length || 0
            }
          })
        }
      }
    }
    
    // Sort by confidence (highest first)
    allPRs.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    
    console.log(`✅ Found ${allPRs.length} PRs (${allPRs.filter(pr => pr.confidence === 1).length} from Linear, ${allPRs.filter(pr => pr.confidence < 1).length} from GitHub search)`)
    
    res.json({
      pullRequests: allPRs
    })
  } catch (error: any) {
    console.error('❌ Error fetching GitHub data:', error)
    res.status(500).json({
      error: 'Failed to fetch GitHub data',
      message: error.message
    })
  }
})

// Enhanced AI summary generation based on issue content
function generateCycleSummary(issues: any[], cycle: any): string {
  const totalIssues = issues.length
  const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0)
  
  // Analyze issue content for themes
  const themes = analyzeIssueThemes(issues)
  const workTypes = categorizeWorkTypes(issues)
  
  const projectCounts = issues.reduce((acc, issue) => {
    const projectName = issue.project?.name || 'No Project'
    acc[projectName] = (acc[projectName] || 0) + 1
    return acc
  }, {})
  
  const topProjects = Object.entries(projectCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([name, count]) => `${name} (${count} issues)`)
  
  // Build contextual summary
  let summary = `Completed ${totalIssues} issues totaling ${totalPoints} story points across ${Object.keys(projectCounts).length} projects.`
  
  if (themes.length > 0) {
    summary += ` Key themes this cycle: ${themes.slice(0, 3).join(', ')}.`
  }
  
  if (workTypes.length > 0) {
    summary += ` Work included ${workTypes.join(', ')}.`
  }
  
  summary += ` Major focus areas: ${topProjects.join(', ')}.`
  
  return summary
}

// Generate enhanced project-specific summaries based on issue content
function generateProjectSummaries(issues: any[]): Record<string, string> {
  const projectGroups = issues.reduce((acc, issue) => {
    const projectName = issue.project?.name || 'No Project'
    if (!acc[projectName]) {
      acc[projectName] = []
    }
    acc[projectName].push(issue)
    return acc
  }, {} as Record<string, any[]>)
  
  const summaries: Record<string, string> = {}
  
  for (const [projectName, projectIssues] of Object.entries(projectGroups)) {
    const issues = projectIssues as any[]
    const issueCount = issues.length
    const totalPoints = issues.reduce((sum: number, issue: any) => sum + (issue.estimate || 0), 0)
    
    // Analyze issue content for this project
    const projectThemes = analyzeIssueThemes(issues)
    const workTypes = categorizeWorkTypes(issues)
    
    // Group by assignee
    const assigneeCounts = issues.reduce((acc: Record<string, number>, issue: any) => {
      const assigneeName = issue.assignee?.name || 'Unassigned'
      acc[assigneeName] = (acc[assigneeName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topContributors = Object.entries(assigneeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 2)
      .map(([name, count]) => `${name} (${count})`)
    
    // Find notable issues (high point values or interesting titles)
    const notableIssues = issues
      .filter(issue => (issue.estimate || 0) >= 5 || hasInterestingTitle(issue.title))
      .slice(0, 2)
      .map(issue => issue.title)
    
    // Count linked PRs for development activity context
    const totalLinkedPRs = issues.reduce((count, issue) => count + (issue.linkedPRs?.length || 0), 0)
    
    // Generate contextual summary
    let summary = `Completed ${issueCount} issue${issueCount > 1 ? 's' : ''} (${totalPoints} points).`
    
    if (workTypes.length > 0) {
      summary += ` Work focused on ${workTypes.join(' and ')}.`
    }
    
    if (projectThemes.length > 0) {
      summary += ` Key areas: ${projectThemes.slice(0, 2).join(', ')}.`
    }
    
    if (notableIssues.length > 0) {
      summary += ` Notable deliverables: ${notableIssues.join('; ')}.`
    }
    
    if (totalLinkedPRs > 0) {
      summary += ` Included ${totalLinkedPRs} linked PR${totalLinkedPRs > 1 ? 's' : ''}.`
    }
    
    if (topContributors.length > 0) {
      summary += ` Contributors: ${topContributors.join(', ')}.`
    }
    
    summaries[projectName] = summary
  }
  
  return summaries
}

// Helper function to analyze themes from issue titles and descriptions
function analyzeIssueThemes(issues: any[]): string[] {
  const allText = issues.map(issue => {
    const title = issue.title || ''
    const description = issue.description || ''
    return `${title} ${description}`.toLowerCase()
  }).join(' ')
  
  // Common tech/product themes to look for
  const themeKeywords = {
    'authentication': ['auth', 'login', 'signup', 'register', 'password', 'oauth', 'jwt', 'token'],
    'UI/UX improvements': ['ui', 'ux', 'design', 'layout', 'styling', 'responsive', 'mobile', 'accessibility'],
    'performance': ['performance', 'speed', 'optimization', 'cache', 'lazy', 'bundle', 'memory'],
    'API development': ['api', 'endpoint', 'rest', 'graphql', 'webhook', 'integration'],
    'database': ['database', 'db', 'sql', 'query', 'migration', 'schema', 'index'],
    'testing': ['test', 'testing', 'spec', 'jest', 'cypress', 'unit', 'integration'],
    'bug fixes': ['fix', 'bug', 'error', 'issue', 'crash', 'broken', 'repair'],
    'security': ['security', 'vulnerability', 'secure', 'encrypt', 'sanitize', 'xss', 'csrf'],
    'infrastructure': ['deploy', 'ci', 'cd', 'docker', 'aws', 'server', 'infrastructure'],
    'analytics': ['analytics', 'tracking', 'metrics', 'logging', 'monitoring', 'observability']
  }
  
  const foundThemes: string[] = []
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    const score = keywords.reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = allText.match(regex)
      return count + (matches ? matches.length : 0)
    }, 0)
    
    if (score > 0) {
      foundThemes.push(theme)
    }
  })
  
  return foundThemes.sort((a, b) => {
    // Simple scoring based on keyword frequency
    const scoreA = themeKeywords[a as keyof typeof themeKeywords].reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = allText.match(regex)
      return count + (matches ? matches.length : 0)
    }, 0)
    const scoreB = themeKeywords[b as keyof typeof themeKeywords].reduce((count, keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = allText.match(regex)
      return count + (matches ? matches.length : 0)
    }, 0)
    return scoreB - scoreA
  })
}

// Helper function to categorize work types
function categorizeWorkTypes(issues: any[]): string[] {
  const workTypes: string[] = []
  const titles = issues.map(issue => issue.title || '').join(' ').toLowerCase()
  
  if (titles.includes('feature') || titles.includes('add') || titles.includes('implement')) {
    workTypes.push('new features')
  }
  if (titles.includes('fix') || titles.includes('bug') || titles.includes('error')) {
    workTypes.push('bug fixes')
  }
  if (titles.includes('refactor') || titles.includes('cleanup') || titles.includes('improve')) {
    workTypes.push('improvements')
  }
  if (titles.includes('test') || titles.includes('spec')) {
    workTypes.push('testing')
  }
  if (titles.includes('doc') || titles.includes('readme')) {
    workTypes.push('documentation')
  }
  if (titles.includes('update') || titles.includes('upgrade')) {
    workTypes.push('updates')
  }
  
  return workTypes
}

// Helper function to identify interesting issue titles
function hasInterestingTitle(title: string): boolean {
  if (!title) return false
  
  const interestingKeywords = [
    'feature', 'new', 'implement', 'add', 'create', 'build',
    'refactor', 'redesign', 'improve', 'enhance', 'optimize',
    'integration', 'migration', 'upgrade', 'launch', 'release'
  ]
  
  const titleLower = title.toLowerCase()
  return interestingKeywords.some(keyword => titleLower.includes(keyword)) || 
         title.length > 40 || // Longer titles tend to be more descriptive
         title.includes('API') || title.includes('UI')
}

app.listen(port, () => {
  console.log(`🚀 Smart Tool of Knowing API server running on port ${port}`)
  console.log(`📡 API endpoints available at http://localhost:${port}/api/*`)
})

export { app }