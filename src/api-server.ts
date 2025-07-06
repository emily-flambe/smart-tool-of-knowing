import express from 'express'
import cors from 'cors'
import { LinearClient } from './linear-client'

const app = express()
app.use(cors())
app.use(express.json())

const linearClient = new LinearClient(process.env.LINEAR_API_KEY || '')

// Get current cycles
app.get('/api/cycles', async (_req, res) => {
  try {
    const cycles = await linearClient.getCurrentCycles()
    res.json(cycles)
  } catch (error) {
    console.error('Error fetching cycles:', error)
    res.status(500).json({ error: 'Failed to fetch cycles' })
  }
})

// Get backlog issues
app.get('/api/backlog', async (_req, res) => {
  try {
    const backlog = await linearClient.getBacklogIssues()
    res.json(backlog)
  } catch (error) {
    console.error('Error fetching backlog:', error)
    res.status(500).json({ error: 'Failed to fetch backlog' })
  }
})

// Get team members
app.get('/api/team-members', async (_req, res) => {
  try {
    const members = await linearClient.getTeamMembers()
    res.json(members)
  } catch (error) {
    console.error('Error fetching team members:', error)
    res.status(500).json({ error: 'Failed to fetch team members' })
  }
})

// Fetch data endpoint
app.post('/api/fetch-data', async (req: any, res: any) => {
  try {
    const { dataType } = req.body
    
    if (!dataType) {
      return res.status(400).json({ error: 'dataType is required' })
    }

    let data
    switch (dataType) {
      case 'cycles':
        data = await linearClient.getCurrentCycles()
        break
      case 'backlog':
        data = await linearClient.getBacklogIssues()
        break
      case 'team-members':
        data = await linearClient.getTeamMembers()
        break
      default:
        return res.status(400).json({ error: 'Invalid dataType' })
    }

    return res.json({ data })
  } catch (error) {
    console.error('Error fetching data:', error)
    return res.status(500).json({ error: 'Failed to fetch data' })
  }
})

// Assignments endpoint
app.post('/api/assignments', async (req: any, res: any) => {
  try {
    const { issueId, assigneeId } = req.body
    
    if (!issueId || !assigneeId) {
      return res.status(400).json({ error: 'issueId and assigneeId are required' })
    }

    // This would typically update the assignment in Linear
    // For now, just return success
    return res.json({ success: true, issueId, assigneeId })
  } catch (error) {
    console.error('Error updating assignment:', error)
    return res.status(500).json({ error: 'Failed to update assignment' })
  }
})

export { app }