import { LinearClient } from '../../linear-client'
import { SimpleLinearClient } from '../../simple-api-server'

// Mock node-fetch for controlled testing
jest.mock('node-fetch')

const mockFetch = require('node-fetch') as jest.MockedFunction<any>

describe.skip('Linear Client Cycle Integration Tests', () => {
  let linearClient: LinearClient
  let simpleLinearClient: SimpleLinearClient
  const originalEnv = process.env.LINEAR_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.LINEAR_API_KEY = 'test-api-key'
    linearClient = new LinearClient('test-api-key')
    simpleLinearClient = new SimpleLinearClient('test-api-key')
  })

  afterAll(() => {
    if (originalEnv) {
      process.env.LINEAR_API_KEY = originalEnv
    }
  })

  describe('LinearClient.getRecentCycles', () => {
    it('should fetch recent cycles with correct GraphQL query', async () => {
      const mockResponse = {
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
                },
                issues: {
                  nodes: [
                    { completedAt: '2024-01-10T00:00:00Z' },
                    { completedAt: '2024-01-12T00:00:00Z' }
                  ]
                }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const cycles = await linearClient.getRecentCycles(3)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linear.app/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('cycles')
        })
      )

      expect(cycles).toHaveLength(1)
      expect(cycles[0]).toMatchObject({
        id: 'cycle-1',
        name: 'Sprint 24',
        number: 24,
        status: 'completed'
      })
    })

    it('should determine cycle status correctly', async () => {
      const mockResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cycle-1',
                name: 'Completed Cycle',
                number: 24,
                startedAt: '2024-01-01T00:00:00Z',
                completedAt: '2024-01-14T00:00:00Z',
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [{ completedAt: '2024-01-10T00:00:00Z' }] }
              },
              {
                id: 'cycle-2',
                name: 'In Progress Cycle',
                number: 25,
                startedAt: '2024-01-15T00:00:00Z',
                completedAt: null,
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [{ completedAt: null }] }
              },
              {
                id: 'cycle-3',
                name: 'Not Started Cycle',
                number: 26,
                startedAt: '2024-02-01T00:00:00Z',
                completedAt: null,
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [] }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const cycles = await linearClient.getRecentCycles(3)

      expect(cycles).toHaveLength(3)
      expect(cycles.find(c => c.id === 'cycle-1')?.status).toBe('completed')
      expect(cycles.find(c => c.id === 'cycle-2')?.status).toBe('active')
      expect(cycles.find(c => c.id === 'cycle-3')?.status).toBe('planned')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Invalid API key' }]
        })
      })

      await expect(linearClient.getRecentCycles(3)).rejects.toThrow('Invalid API key')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'))

      await expect(linearClient.getRecentCycles(3)).rejects.toThrow('Network timeout')
    })
  })

  describe('LinearClient.getIssuesInCycle', () => {
    it('should fetch issues for a specific cycle', async () => {
      const mockResponse = {
        data: {
          cycle: {
            id: 'cycle-1',
            name: 'Sprint 24',
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  title: 'Test issue',
                  estimate: 5,
                  assignee: {
                    id: 'user-1',
                    name: 'John Doe'
                  },
                  project: {
                    id: 'project-1',
                    name: 'Backend'
                  }
                }
              ]
            }
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const issues = await linearClient.getIssuesInCycle('cycle-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining('cycle-1')
        })
      )

      expect(issues).toHaveLength(1)
      expect(issues[0]).toMatchObject({
        id: 'issue-1',
        identifier: 'ENG-123',
        title: 'Test issue'
      })
    })

    it('should handle cycles with no issues', async () => {
      const mockResponse = {
        data: {
          cycle: {
            id: 'cycle-1',
            name: 'Sprint 24',
            issues: {
              nodes: []
            }
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const issues = await linearClient.getIssuesInCycle('cycle-1')

      expect(issues).toHaveLength(0)
    })

    it('should handle non-existent cycles', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Cycle not found' }]
        })
      })

      await expect(linearClient.getIssuesInCycle('nonexistent-cycle')).rejects.toThrow('Cycle not found')
    })
  })

  describe('SimpleLinearClient.getCompletedCycles', () => {
    it('should return only completed cycles', async () => {
      const mockResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cycle-1',
                name: 'Completed Cycle',
                number: 24,
                startedAt: '2024-01-01T00:00:00Z',
                completedAt: '2024-01-14T00:00:00Z',
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [{ completedAt: '2024-01-10T00:00:00Z' }] }
              },
              {
                id: 'cycle-2',
                name: 'Active Cycle',
                number: 25,
                startedAt: '2024-01-15T00:00:00Z',
                completedAt: null,
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [{ completedAt: null }] }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const completedCycles = await simpleLinearClient.getCompletedCycles()

      expect(completedCycles).toHaveLength(1)
      expect(completedCycles[0]).toMatchObject({
        id: 'cycle-1',
        name: 'Completed Cycle',
        status: 'completed'
      })
    })

    it('should handle no completed cycles', async () => {
      const mockResponse = {
        data: {
          cycles: {
            nodes: [
              {
                id: 'cycle-1',
                name: 'Active Cycle',
                number: 25,
                startedAt: '2024-01-15T00:00:00Z',
                completedAt: null,
                team: { id: 'team-1', name: 'Engineering' },
                issues: { nodes: [] }
              }
            ]
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const completedCycles = await simpleLinearClient.getCompletedCycles()

      expect(completedCycles).toHaveLength(0)
    })
  })

  describe('SimpleLinearClient.getCompletedIssuesInCycle', () => {
    it('should return only completed issues with completion dates', async () => {
      const mockCycleResponse = {
        data: {
          cycle: {
            id: 'cycle-1',
            name: 'Sprint 24',
            number: 24,
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-14T00:00:00Z',
            team: { id: 'team-1', name: 'Engineering' }
          }
        }
      }

      const mockIssuesResponse = {
        data: {
          cycle: {
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  title: 'Completed Issue',
                  state: { name: 'Done' },
                  completedAt: '2024-01-10T00:00:00Z',
                  estimate: 5,
                  assignee: {
                    id: 'user-1',
                    name: 'John Doe'
                  },
                  project: {
                    id: 'project-1',
                    name: 'Backend'
                  },
                  labels: { nodes: [] }
                },
                {
                  id: 'issue-2',
                  identifier: 'ENG-124',
                  title: 'In Progress Issue',
                  state: { name: 'In Progress' },
                  completedAt: null,
                  estimate: 3,
                  assignee: {
                    id: 'user-2',
                    name: 'Jane Smith'
                  },
                  project: {
                    id: 'project-1',
                    name: 'Backend'
                  },
                  labels: { nodes: [] }
                }
              ]
            }
          }
        }
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockCycleResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockIssuesResponse })

      const completedIssues = await simpleLinearClient.getCompletedIssuesInCycle('cycle-1')

      expect(completedIssues).toHaveLength(1)
      expect(completedIssues[0]).toMatchObject({
        id: 'issue-1',
        identifier: 'ENG-123',
        title: 'Completed Issue',
        completedAt: '2024-01-10T00:00:00Z'
      })
    })

    it('should handle cycles with no completed issues', async () => {
      const mockCycleResponse = {
        data: {
          cycle: {
            id: 'cycle-1',
            name: 'Sprint 24',
            number: 24,
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-14T00:00:00Z',
            team: { id: 'team-1', name: 'Engineering' }
          }
        }
      }

      const mockIssuesResponse = {
        data: {
          cycle: {
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  title: 'In Progress Issue',
                  state: { name: 'In Progress' },
                  completedAt: null,
                  estimate: 5,
                  assignee: { id: 'user-1', name: 'John Doe' },
                  project: { id: 'project-1', name: 'Backend' },
                  labels: { nodes: [] }
                }
              ]
            }
          }
        }
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockCycleResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockIssuesResponse })

      const completedIssues = await simpleLinearClient.getCompletedIssuesInCycle('cycle-1')

      expect(completedIssues).toHaveLength(0)
    })

    it('should determine completion status correctly based on cycle dates', async () => {
      const mockCycleResponse = {
        data: {
          cycle: {
            id: 'cycle-1',
            name: 'Sprint 24',
            number: 24,
            startedAt: '2024-01-01T00:00:00Z',
            completedAt: '2024-01-14T00:00:00Z',
            team: { id: 'team-1', name: 'Engineering' }
          }
        }
      }

      const mockIssuesResponse = {
        data: {
          cycle: {
            issues: {
              nodes: [
                {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  title: 'Issue completed within cycle',
                  state: { name: 'Done' },
                  completedAt: '2024-01-10T00:00:00Z', // Within cycle
                  estimate: 5,
                  assignee: { id: 'user-1', name: 'John Doe' },
                  project: { id: 'project-1', name: 'Backend' },
                  labels: { nodes: [] }
                },
                {
                  id: 'issue-2',
                  identifier: 'ENG-124',
                  title: 'Issue completed after cycle',
                  state: { name: 'Done' },
                  completedAt: '2024-01-20T00:00:00Z', // After cycle end
                  estimate: 3,
                  assignee: { id: 'user-2', name: 'Jane Smith' },
                  project: { id: 'project-1', name: 'Backend' },
                  labels: { nodes: [] }
                }
              ]
            }
          }
        }
      }

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockCycleResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockIssuesResponse })

      const completedIssues = await simpleLinearClient.getCompletedIssuesInCycle('cycle-1')

      expect(completedIssues).toHaveLength(1)
      expect(completedIssues[0].id).toBe('issue-1')
    })
  })
})