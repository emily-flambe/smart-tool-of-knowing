import request from 'supertest'
import { app } from '../../simple-api-server'

// Mock node-fetch for controlled testing
jest.mock('node-fetch')

const mockFetch = require('node-fetch') as jest.MockedFunction<any>

describe.skip('Cycle Review End-to-End Integration Tests', () => {
  const originalEnv = {
    LINEAR_API_KEY: process.env.LINEAR_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_ORG: process.env.GITHUB_ORG
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.LINEAR_API_KEY = 'test-linear-key'
    process.env.GITHUB_TOKEN = 'test-github-token'
    process.env.GITHUB_ORG = 'test-org'
  })

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value) {
        process.env[key] = value
      } else {
        delete process.env[key]
      }
    })
  })

  describe('Complete Cycle Review Workflow', () => {
    const mockCompletedCycle = {
      id: 'cycle-123',
      name: 'Sprint 24 - Q1 2024',
      number: 24,
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-14T23:59:59Z',
      team: {
        id: 'team-1',
        name: 'Engineering Team'
      }
    }

    const mockCompletedIssues = [
      {
        id: 'issue-1',
        identifier: 'ENG-100',
        title: 'Implement user authentication system',
        description: 'Add login, registration, and password reset functionality',
        priority: 1,
        estimate: 8,
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@company.com'
        },
        project: {
          id: 'project-1',
          name: 'Core Platform',
          color: '#3b82f6'
        },
        labels: {
          nodes: [
            { id: 'label-1', name: 'feature', color: '#10b981' },
            { id: 'label-2', name: 'backend', color: '#f59e0b' }
          ]
        },
        state: { name: 'Done' },
        completedAt: '2024-01-10T15:30:00Z'
      },
      {
        id: 'issue-2',
        identifier: 'ENG-101',
        title: 'Fix authentication redirect bug',
        description: 'Users are not redirected properly after login',
        priority: 2,
        estimate: 3,
        assignee: {
          id: 'user-2',
          name: 'Bob Smith',
          email: 'bob@company.com'
        },
        project: {
          id: 'project-1',
          name: 'Core Platform',
          color: '#3b82f6'
        },
        labels: {
          nodes: [
            { id: 'label-3', name: 'bug', color: '#ef4444' },
            { id: 'label-4', name: 'frontend', color: '#8b5cf6' }
          ]
        },
        state: { name: 'Done' },
        completedAt: '2024-01-12T09:15:00Z'
      },
      {
        id: 'issue-3',
        identifier: 'ENG-102',
        title: 'Add user profile management',
        description: 'Allow users to update their profile information',
        priority: 3,
        estimate: 5,
        assignee: {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@company.com'
        },
        project: {
          id: 'project-2',
          name: 'User Experience',
          color: '#ec4899'
        },
        labels: {
          nodes: [
            { id: 'label-1', name: 'feature', color: '#10b981' },
            { id: 'label-5', name: 'ui-ux', color: '#06b6d4' }
          ]
        },
        state: { name: 'Done' },
        completedAt: '2024-01-13T14:45:00Z'
      }
    ]

    beforeEach(() => {
      // Mock completed cycles endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycles: {
              nodes: [mockCompletedCycle]
            }
          }
        })
      })
    })

    it('should complete full cycle review workflow with comprehensive data', async () => {
      // Step 1: Get completed cycles
      const cyclesResponse = await request(app)
        .get('/api/completed-cycles')
        .expect(200)

      expect(cyclesResponse.body.cycles).toHaveLength(1)
      expect(cyclesResponse.body.cycles[0]).toMatchObject({
        id: 'cycle-123',
        name: 'Sprint 24 - Q1 2024',
        number: 24
      })

      const cycleId = cyclesResponse.body.cycles[0].id

      // Mock cycle review data - single call that includes cycle info AND issues
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            cycle: {
              ...mockCompletedCycle,
              issues: {
                nodes: mockCompletedIssues
              }
            }
          }
        })
      })

      // Step 2: Get detailed cycle review
      const reviewResponse = await request(app)
        .get(`/api/cycle-review/${cycleId}`)
        .expect(200)

      // Verify comprehensive response structure
      expect(reviewResponse.body).toHaveProperty('cycle')
      expect(reviewResponse.body).toHaveProperty('stats')
      expect(reviewResponse.body).toHaveProperty('issuesByProject')
      expect(reviewResponse.body).toHaveProperty('issuesByEngineer')
      expect(reviewResponse.body).toHaveProperty('completedIssues')
      expect(reviewResponse.body).toHaveProperty('pullRequests')

      // Verify cycle metadata
      expect(reviewResponse.body.cycle).toMatchObject({
        id: 'cycle-123',
        name: 'Sprint 24 - Q1 2024',
        number: 24,
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-14T23:59:59Z'
      })

      // Verify aggregate statistics
      expect(reviewResponse.body.stats).toMatchObject({
        totalIssues: 3,
        totalPoints: 16, // 8 + 3 + 5
        uniqueContributors: 2, // Alice and Bob
        velocity: expect.any(Number)
      })

      // Verify velocity calculation (16 points over 2 weeks = 8 points/week)
      expect(reviewResponse.body.stats.velocity).toBeCloseTo(8, 1)

      // Verify project grouping
      expect(reviewResponse.body.issuesByProject).toHaveProperty('Core Platform')
      expect(reviewResponse.body.issuesByProject).toHaveProperty('User Experience')

      expect(reviewResponse.body.issuesByProject['Core Platform']).toMatchObject({
        totalPoints: 11, // 8 + 3
        issueCount: 2,
        issues: expect.arrayContaining([
          expect.objectContaining({ identifier: 'ENG-100' }),
          expect.objectContaining({ identifier: 'ENG-101' })
        ])
      })

      expect(reviewResponse.body.issuesByProject['User Experience']).toMatchObject({
        totalPoints: 5,
        issueCount: 1,
        issues: expect.arrayContaining([
          expect.objectContaining({ identifier: 'ENG-102' })
        ])
      })

      // Verify engineer grouping
      expect(reviewResponse.body.issuesByEngineer).toHaveProperty('Alice Johnson')
      expect(reviewResponse.body.issuesByEngineer).toHaveProperty('Bob Smith')

      expect(reviewResponse.body.issuesByEngineer['Alice Johnson']).toMatchObject({
        totalPoints: 13, // 8 + 5
        issueCount: 2,
        issues: expect.arrayContaining([
          expect.objectContaining({ identifier: 'ENG-100' }),
          expect.objectContaining({ identifier: 'ENG-102' })
        ])
      })

      expect(reviewResponse.body.issuesByEngineer['Bob Smith']).toMatchObject({
        totalPoints: 3,
        issueCount: 1,
        issues: expect.arrayContaining([
          expect.objectContaining({ identifier: 'ENG-101' })
        ])
      })

      // Verify completed issues details
      expect(reviewResponse.body.completedIssues).toHaveLength(3)
      const firstIssue = reviewResponse.body.completedIssues.find((i: any) => i.identifier === 'ENG-100')
      expect(firstIssue).toMatchObject({
        id: 'issue-1',
        identifier: 'ENG-100',
        title: 'Implement user authentication system',
        estimate: 8,
        assignee: { name: 'Alice Johnson' },
        project: { name: 'Core Platform' },
        completedAt: '2024-01-10T15:30:00Z'
      })
    })

    it('should handle mixed project assignments correctly', async () => {
      const mixedProjectIssues = [
        {
          ...mockCompletedIssues[0],
          project: { id: 'project-1', name: 'Backend Services' }
        },
        {
          ...mockCompletedIssues[1],
          project: { id: 'project-2', name: 'Frontend App' }
        },
        {
          ...mockCompletedIssues[2],
          project: { id: 'project-1', name: 'Backend Services' }
        }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { cycle: mockCompletedCycle }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              cycle: {
                issues: { nodes: mixedProjectIssues }
              }
            }
          })
        })

      const response = await request(app)
        .get('/api/cycle-review/cycle-123')
        .expect(200)

      expect(response.body.issuesByProject).toHaveProperty('Backend Services')
      expect(response.body.issuesByProject).toHaveProperty('Frontend App')

      expect(response.body.issuesByProject['Backend Services']).toMatchObject({
        totalPoints: 13, // 8 + 5
        issueCount: 2
      })

      expect(response.body.issuesByProject['Frontend App']).toMatchObject({
        totalPoints: 3,
        issueCount: 1
      })
    })

    it('should handle issues with no estimates gracefully', async () => {
      const issuesWithoutEstimates = [
        { ...mockCompletedIssues[0], estimate: null },
        { ...mockCompletedIssues[1], estimate: 0 },
        { ...mockCompletedIssues[2], estimate: undefined }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { cycle: mockCompletedCycle }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              cycle: {
                issues: { nodes: issuesWithoutEstimates }
              }
            }
          })
        })

      const response = await request(app)
        .get('/api/cycle-review/cycle-123')
        .expect(200)

      expect(response.body.stats).toMatchObject({
        totalIssues: 3,
        totalPoints: 0,
        velocity: 0
      })
    })

    it('should handle unassigned issues correctly', async () => {
      const issuesWithUnassigned = [
        { ...mockCompletedIssues[0], assignee: null },
        { ...mockCompletedIssues[1] }, // Keep assigned
        { ...mockCompletedIssues[2], assignee: null }
      ]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { cycle: mockCompletedCycle }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              cycle: {
                issues: { nodes: issuesWithUnassigned }
              }
            }
          })
        })

      const response = await request(app)
        .get('/api/cycle-review/cycle-123')
        .expect(200)

      expect(response.body.issuesByEngineer).toHaveProperty('Unassigned')
      expect(response.body.issuesByEngineer).toHaveProperty('Bob Smith')

      expect(response.body.issuesByEngineer['Unassigned']).toMatchObject({
        totalPoints: 13, // 8 + 5 from unassigned issues
        issueCount: 2
      })

      expect(response.body.issuesByEngineer['Bob Smith']).toMatchObject({
        totalPoints: 3,
        issueCount: 1
      })
    })

    it('should maintain data consistency across different groupings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { cycle: mockCompletedCycle }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              cycle: {
                issues: { nodes: mockCompletedIssues }
              }
            }
          })
        })

      const response = await request(app)
        .get('/api/cycle-review/cycle-123')
        .expect(200)

      // Calculate totals from different groupings
      const totalPointsByProject = Object.values(response.body.issuesByProject)
        .reduce((sum: number, project: any) => sum + project.totalPoints, 0)

      const totalPointsByEngineer = Object.values(response.body.issuesByEngineer)
        .reduce((sum: number, engineer: any) => sum + engineer.totalPoints, 0)

      const totalIssuesByProject = Object.values(response.body.issuesByProject)
        .reduce((sum: number, project: any) => sum + project.issueCount, 0)

      const totalIssuesByEngineer = Object.values(response.body.issuesByEngineer)
        .reduce((sum: number, engineer: any) => sum + engineer.issueCount, 0)

      // Verify consistency
      expect(totalPointsByProject).toBe(response.body.stats.totalPoints)
      expect(totalPointsByEngineer).toBe(response.body.stats.totalPoints)
      expect(totalIssuesByProject).toBe(response.body.stats.totalIssues)
      expect(totalIssuesByEngineer).toBe(response.body.stats.totalIssues)
      expect(response.body.completedIssues).toHaveLength(response.body.stats.totalIssues)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle Linear API failures gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Rate limit exceeded' }]
        })
      })

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Rate limit exceeded')
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'))

      const response = await request(app)
        .get('/api/completed-cycles')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Request timeout')
    })

    it('should handle invalid cycle IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Cycle not found' }]
        })
      })

      const response = await request(app)
        .get('/api/cycle-review/invalid-cycle-id')
        .expect(500)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Cycle not found')
    })
  })
})