import request from 'supertest'
import { app } from '../../simple-api-server'

const mockFetch = require('node-fetch') as jest.MockedFunction<any>

describe('Cycle Review API Integration Tests', () => {
  const originalEnv = process.env.LINEAR_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.LINEAR_API_KEY = 'test-api-key'
  })

  afterAll(() => {
    if (originalEnv) {
      process.env.LINEAR_API_KEY = originalEnv
    }
  })

  describe('GET /api/completed-cycles', () => {
    it('should return completed cycles with proper structure', async () => {
      const mockCyclesResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cycle-1',
                name: 'Sprint 24',
                number: 24,
                startedAt: '2024-01-01T00:00:00Z',
                completedAt: '2024-01-14T00:00:00Z',
                team: {
                  id: 'team-1',
                  name: 'Engineering'
                }
              },
              {
                id: 'cycle-2',
                name: 'Sprint 23',
                number: 23,
                startedAt: '2023-12-18T00:00:00Z',
                completedAt: '2023-12-31T00:00:00Z',
                team: {
                  id: 'team-1',
                  name: 'Engineering'
                }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCyclesResponse
      })

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(200)

      expect(response.body).toHaveProperty('cycles')
      expect(Array.isArray(response.body.cycles)).toBe(true)
      expect(response.body.cycles).toHaveLength(2)

      const cycle = response.body.cycles[0]
      expect(cycle).toHaveProperty('id', 'cycle-1')
      expect(cycle).toHaveProperty('name', 'Sprint 24')
      expect(cycle).toHaveProperty('number', 24)
      expect(cycle).toHaveProperty('startedAt')
      expect(cycle).toHaveProperty('completedAt')
      expect(cycle).toHaveProperty('team')
      expect(cycle.team).toHaveProperty('name', 'Engineering')
    })

    it('should handle Linear API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'API key invalid' }]
        })
      })

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('API key invalid')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Network error')
    })

    it('should filter out incomplete cycles', async () => {
      const mockCyclesResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cycle-1',
                name: 'Sprint 24',
                number: 24,
                startedAt: '2024-01-01T00:00:00Z',
                completedAt: '2024-01-14T00:00:00Z',
                team: { id: 'team-1', name: 'Engineering' }
              },
              {
                id: 'cycle-2',
                name: 'Sprint 25',
                number: 25,
                startedAt: '2024-01-15T00:00:00Z',
                completedAt: null, // Incomplete cycle
                team: { id: 'team-1', name: 'Engineering' }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCyclesResponse
      })

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(200)

      expect(response.body.cycles).toHaveLength(1)
      expect(response.body.cycles[0].id).toBe('cycle-1')
    })
  })

  describe('GET /api/cycle-review/:cycleId', () => {
    const mockCycleData = {
      id: 'cycle-1',
      name: 'Sprint 24',
      number: 24,
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-14T00:00:00Z',
      team: { id: 'team-1', name: 'Engineering' }
    }

    const mockIssues = [
      {
        id: 'issue-1',
        identifier: 'ENG-123',
        title: 'Implement user authentication',
        description: 'Add login and registration functionality',
        estimate: 5,
        priority: 1,
        assignee: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com'
        },
        project: {
          id: 'project-1',
          name: 'Backend API'
        },
        labels: {
          nodes: [
            { id: 'label-1', name: 'feature' }
          ]
        },
        completedAt: '2024-01-10T12:00:00Z'
      },
      {
        id: 'issue-2',
        identifier: 'ENG-124',
        title: 'Fix login bug',
        description: 'Users cannot log in with email',
        estimate: 2,
        priority: 2,
        assignee: {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com'
        },
        project: {
          id: 'project-1',
          name: 'Backend API'
        },
        labels: {
          nodes: [
            { id: 'label-2', name: 'bug' }
          ]
        },
        completedAt: '2024-01-12T15:30:00Z'
      }
    ]

    beforeEach(() => {
      // Mock the cycle data fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: mockCycleData
          }
        })
      })

      // Mock the issues fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: {
              issues: {
                nodes: mockIssues
              }
            }
          }
        })
      })
    })

    it('should return comprehensive cycle review data', async () => {
      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body).toHaveProperty('cycle')
      expect(response.body).toHaveProperty('stats')
      expect(response.body).toHaveProperty('issuesByProject')
      expect(response.body).toHaveProperty('issuesByEngineer')
      expect(response.body).toHaveProperty('completedIssues')
      expect(response.body).toHaveProperty('pullRequests')

      // Verify cycle data
      expect(response.body.cycle).toMatchObject({
        id: 'cycle-1',
        name: 'Sprint 24',
        number: 24
      })

      // Verify stats calculation
      expect(response.body.stats).toMatchObject({
        totalIssues: 2,
        totalPoints: 7,
        uniqueContributors: 2,
        velocity: expect.any(Number)
      })

      // Verify issues are included
      expect(response.body.completedIssues).toHaveLength(2)
      expect(response.body.completedIssues[0]).toMatchObject({
        id: 'issue-1',
        identifier: 'ENG-123',
        title: 'Implement user authentication'
      })
    })

    it('should group issues by project correctly', async () => {
      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body.issuesByProject).toHaveProperty('Backend API')
      expect(response.body.issuesByProject['Backend API']).toHaveProperty('issues')
      expect(response.body.issuesByProject['Backend API']).toHaveProperty('totalPoints', 7)
      expect(response.body.issuesByProject['Backend API'].issues).toHaveLength(2)
    })

    it('should group issues by engineer correctly', async () => {
      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body.issuesByEngineer).toHaveProperty('John Doe')
      expect(response.body.issuesByEngineer).toHaveProperty('Jane Smith')
      
      expect(response.body.issuesByEngineer['John Doe']).toMatchObject({
        totalPoints: 5,
        issueCount: 1
      })
      
      expect(response.body.issuesByEngineer['Jane Smith']).toMatchObject({
        totalPoints: 2,
        issueCount: 1
      })
    })

    it('should calculate velocity correctly', async () => {
      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      // Cycle is 2 weeks (14 days), total points = 7
      // Velocity = 7 points / 2 weeks = 3.5 points per week
      expect(response.body.stats.velocity).toBeCloseTo(3.5, 1)
    })

    it('should handle missing cycle gracefully', async () => {
      mockFetch.mockReset()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Cycle not found' }]
        })
      })

      const response = await request(app)
        .get('/api/cycle-review/nonexistent-cycle')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Cycle not found')
    })

    it('should handle cycles with no completed issues', async () => {
      mockFetch.mockReset()
      
      // Mock cycle data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: mockCycleData
          }
        })
      })

      // Mock empty issues response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: {
              issues: {
                nodes: []
              }
            }
          }
        })
      })

      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body.stats).toMatchObject({
        totalIssues: 0,
        totalPoints: 0,
        uniqueContributors: 0,
        velocity: 0
      })
      
      expect(response.body.completedIssues).toHaveLength(0)
      expect(response.body.issuesByProject).toEqual({})
      expect(response.body.issuesByEngineer).toEqual({})
    })

    it('should handle issues without estimates', async () => {
      const issuesWithoutEstimates = [
        {
          ...mockIssues[0],
          estimate: null
        },
        {
          ...mockIssues[1],
          estimate: undefined
        }
      ]

      mockFetch.mockReset()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycle: mockCycleData }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: {
              issues: {
                nodes: issuesWithoutEstimates
              }
            }
          }
        })
      })

      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body.stats.totalPoints).toBe(0)
      expect(response.body.stats.velocity).toBe(0)
    })

    it('should handle issues without assignees', async () => {
      const issuesWithoutAssignees = [
        {
          ...mockIssues[0],
          assignee: null
        }
      ]

      mockFetch.mockReset()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycle: mockCycleData }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: {
              issues: {
                nodes: issuesWithoutAssignees
              }
            }
          }
        })
      })

      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body.issuesByEngineer).toHaveProperty('Unassigned')
      expect(response.body.issuesByEngineer['Unassigned']).toMatchObject({
        totalPoints: 5,
        issueCount: 1
      })
    })

    it('should include placeholder for future GitHub integration', async () => {
      const response = await request(app)
        .get('/api/cycle-review/cycle-1')
        .expect(200)

      expect(response.body).toHaveProperty('pullRequests')
      expect(Array.isArray(response.body.pullRequests)).toBe(true)
      // Currently empty as GitHub integration is not implemented
      expect(response.body.pullRequests).toHaveLength(0)
    })
  })
})