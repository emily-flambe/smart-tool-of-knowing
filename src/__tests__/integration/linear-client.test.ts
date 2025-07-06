import { LinearClient } from '../../linear-client'

// Mock node-fetch for controlled testing
jest.mock('node-fetch')

describe.skip('LinearClient Integration Tests', () => {
  let client: LinearClient
  const mockApiKey = 'test-api-key'

  beforeEach(() => {
    client = new LinearClient(mockApiKey)
    jest.clearAllMocks()
  })

  describe('Constructor', () => {
    it('should create instance with API key', () => {
      expect(client).toBeInstanceOf(LinearClient)
    })

    it('should create instance even with empty API key (validation happens on use)', () => {
      expect(() => new LinearClient('')).not.toThrow()
    })
  })

  describe('API Key Validation', () => {
    it('should validate API key format', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            viewer: {
              id: 'user-123',
              name: 'Test User',
              email: 'test@example.com'
            }
          }
        })
      })

      const result = await client.validateApiKey()
      
      expect(result).toHaveProperty('id', 'user-123')
      expect(result).toHaveProperty('name', 'Test User')
      expect(result).toHaveProperty('email', 'test@example.com')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.linear.app/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': mockApiKey,
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle invalid API key', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Invalid API key' }]
        })
      })

      await expect(client.validateApiKey()).rejects.toThrow('Invalid API key')
    })

    it('should handle network errors', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.validateApiKey()).rejects.toThrow('Network error')
    })
  })

  describe('getCurrentCycles', () => {
    it('should fetch and process current cycles', async () => {
      const mockFetch = require('node-fetch')
      const mockCycles = [
        {
          id: 'cycle-1',
          name: 'Sprint 24',
          number: 24,
          startsAt: '2025-06-15T00:00:00Z',
          endsAt: '2025-06-29T00:00:00Z',
          team: { id: 'team-1', name: 'Engineering', key: 'ENG' },
          issues: {
            nodes: [
              {
                id: 'issue-1',
                identifier: 'ENG-123',
                title: 'Test Issue',
                assignee: { id: 'user-1', name: 'Test User', email: 'test@example.com' }
              }
            ]
          }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycles: { nodes: mockCycles } }
        })
      })

      const result = await client.getCurrentCycles()
      
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('id', 'cycle-1')
      expect(result[0]).toHaveProperty('name', 'Sprint 24')
      // getCurrentCycles returns cycles with issues embedded
      expect(result[0]).toHaveProperty('id', 'cycle-1')
      expect(result[0]).toHaveProperty('name', 'Sprint 24')
    })

    it('should handle empty cycles response', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycles: { nodes: [] } }
        })
      })

      const result = await client.getCurrentCycles()
      expect(result).toEqual([])
    })
  })

  describe('getIssuesForCycle', () => {
    it('should fetch issues for specific cycle', async () => {
      const mockFetch = require('node-fetch')
      const mockIssues = [
        {
          id: 'issue-1',
          identifier: 'ENG-123',
          title: 'Test Issue',
          state: { name: 'In Progress', type: 'started' },
          assignee: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
          priority: 2,
          estimate: 5
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycle: { issues: { nodes: mockIssues } } }
        })
      })

      const result = await client.getIssuesForCycle('cycle-1')
      
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('identifier', 'ENG-123')
      expect(result[0]).toHaveProperty('title', 'Test Issue')
      expect(result[0]).toHaveProperty('assignee')
      expect(result[0].assignee).toHaveProperty('email', 'test@example.com')
    })

    it('should handle cycle not found', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { cycle: null }
        })
      })

      const result = await client.getIssuesForCycle('invalid-cycle')
      expect(result).toEqual([])
    })
  })

  describe('getBacklogIssues', () => {
    it('should fetch unassigned issues', async () => {
      const mockFetch = require('node-fetch')
      const mockIssues = [
        {
          id: 'issue-1',
          identifier: 'ENG-124',
          title: 'Backlog Issue',
          state: { name: 'Backlog', type: 'unstarted' },
          assignee: null,
          priority: 3
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { issues: { nodes: mockIssues } }
        })
      })

      const result = await client.getBacklogIssues()
      
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('identifier', 'ENG-124')
      expect(result[0]).toHaveProperty('assignee', null)
    })
  })

  describe('getTeamMembers', () => {
    it('should fetch team members', async () => {
      const mockFetch = require('node-fetch')
      const mockMembers = [
        {
          id: 'user-1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          active: true
        },
        {
          id: 'user-2',
          name: 'Bob Chen',
          email: 'bob@example.com',
          active: true
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { users: { nodes: mockMembers } }
        })
      })

      const result = await client.getTeamMembers()
      
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('name', 'Alice Johnson')
      expect(result[1]).toHaveProperty('email', 'bob@example.com')
    })

    it('should filter out inactive users', async () => {
      const mockFetch = require('node-fetch')
      const mockMembers = [
        {
          id: 'user-1',
          name: 'Active User',
          email: 'active@example.com',
          active: true
        },
        {
          id: 'user-2',
          name: 'Inactive User',
          email: 'inactive@example.com',
          active: false
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { users: { nodes: mockMembers } }
        })
      })

      const result = await client.getTeamMembers()
      
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('name', 'Active User')
    })
  })

  describe('Update Operations', () => {
    describe('updateIssueAssignee', () => {
      it('should update issue assignee successfully', async () => {
        const mockFetch = require('node-fetch')
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  assignee: { id: 'user-1', name: 'New Assignee' }
                }
              }
            }
          })
        })

        const result = await client.updateIssueAssignee('issue-1', 'user-1')
        
        expect(result.success).toBe(true)
        expect(result.issue.assignee.id).toBe('user-1')
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.linear.app/graphql',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('issueUpdate')
          })
        )
      })

      it('should handle update failure', async () => {
        const mockFetch = require('node-fetch')
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              issueUpdate: {
                success: false
              }
            }
          })
        })

        await expect(client.updateIssueAssignee('issue-1', 'user-1'))
          .rejects.toThrow('Failed to update issue assignee')
      })
    })

    describe('updateIssueEstimate', () => {
      it('should update issue estimate successfully', async () => {
        const mockFetch = require('node-fetch')
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              issueUpdate: {
                success: true,
                issue: {
                  id: 'issue-1',
                  identifier: 'ENG-123',
                  estimate: 8
                }
              }
            }
          })
        })

        const result = await client.updateIssueEstimate('issue-1', 8)
        
        expect(result.success).toBe(true)
        expect(result.issue.estimate).toBe(8)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle GraphQL errors', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          errors: [
            { message: 'Field "invalidField" doesn\'t exist' },
            { message: 'Another error' }
          ]
        })
      })

      await expect(client.getCurrentCycles())
        .rejects.toThrow('Field "invalidField" doesn\'t exist, Another error')
    })

    it('should handle HTTP errors', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(client.getCurrentCycles())
        .rejects.toThrow('HTTP error! status: 401')
    })

    it('should handle malformed JSON responses', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      })

      await expect(client.getCurrentCycles())
        .rejects.toThrow('Invalid JSON')
    })
  })

  describe('Rate Limiting and Retries', () => {
    it('should handle rate limiting gracefully', async () => {
      const mockFetch = require('node-fetch')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      })

      await expect(client.getCurrentCycles())
        .rejects.toThrow('HTTP error! status: 429')
    })
  })
})