import { GitHubExtractor } from '../../extractors/github-extractor'

const mockFetch = require('node-fetch') as jest.MockedFunction<any>

describe('GitHub Cycle Integration Tests', () => {
  let githubExtractor: GitHubExtractor
  const originalEnv = {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_ORG: process.env.GITHUB_ORG,
    GITHUB_REPOS: process.env.GITHUB_REPOS
  }

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-github-token'
    process.env.GITHUB_ORG = 'test-org'
    process.env.GITHUB_REPOS = 'repo1,repo2'
    githubExtractor = new GitHubExtractor()
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

  describe('Pull Request Matching for Cycle Review', () => {
    const cycleStartDate = '2024-01-01T00:00:00Z'
    const cycleEndDate = '2024-01-14T23:59:59Z'
    const linearIssues = [
      { identifier: 'ENG-123', title: 'Implement authentication' },
      { identifier: 'ENG-124', title: 'Fix login bug' }
    ]

    it('should fetch pull requests within cycle date range', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add user authentication (ENG-123)',
          body: 'Implements login and registration for ENG-123',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5,
          head: {
            ref: 'feature/eng-123-authentication'
          }
        },
        {
          id: 'pr-2',
          number: 124,
          title: 'fix: Resolve login issue',
          body: 'Fixes the bug described in ENG-124 where users cannot log in',
          merged_at: '2024-01-12T15:30:00Z',
          user: { login: 'jane-smith' },
          html_url: 'https://github.com/test-org/repo1/pull/124',
          additions: 20,
          deletions: 5,
          changed_files: 2,
          head: {
            ref: 'bugfix/login-issue'
          }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.github.com/repos/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'token test-github-token'
          })
        })
      )

      expect(pullRequests).toHaveLength(2)
      expect(pullRequests[0]).toMatchObject({
        type: 'pull_request',
        title: 'feat: Add user authentication (ENG-123)',
        content: expect.stringContaining('Implements login and registration')
      })
    })

    it('should match pull requests to Linear issues by identifier in title', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add authentication (ENG-123)',
          body: 'Authentication implementation',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5,
          head: { ref: 'feature/auth' }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      
      // Test issue matching logic (this would be implemented in cycle review service)
      const matchedPRs = pullRequests.filter(pr => 
        linearIssues.some(issue => 
          pr.title.includes(issue.identifier) || 
          pr.content.includes(issue.identifier)
        )
      )

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].title).toContain('ENG-123')
    })

    it('should match pull requests to Linear issues by identifier in body', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add authentication system',
          body: 'This PR implements the authentication system for ENG-123',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5,
          head: { ref: 'feature/auth' }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      
      const matchedPRs = pullRequests.filter(pr => 
        linearIssues.some(issue => 
          pr.title.includes(issue.identifier) || 
          pr.content.includes(issue.identifier)
        )
      )

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].content).toContain('ENG-123')
    })

    it('should match pull requests by branch name patterns', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add authentication system',
          body: 'Authentication implementation',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5,
          head: { ref: 'feature/eng-123-authentication' }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      
      // Test branch name matching logic
      const matchedPRs = pullRequests.filter(pr => {
        const branchName = pr.metadata?.head?.ref?.toLowerCase() || ''
        return linearIssues.some(issue => 
          branchName.includes(issue.identifier.toLowerCase())
        )
      })

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].metadata.head.ref).toBe('feature/eng-123-authentication')
    })

    it('should handle GitHub API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(githubExtractor.getRecentPullRequests()).rejects.toThrow()
    })

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: {
          get: (name: string) => {
            if (name === 'X-RateLimit-Remaining') return '0'
            if (name === 'X-RateLimit-Reset') return '1640995200'
            return null
          }
        },
        statusText: 'Forbidden'
      })

      await expect(githubExtractor.getRecentPullRequests()).rejects.toThrow()
    })

    it('should extract PR statistics correctly', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add authentication (ENG-123)',
          body: 'Authentication implementation',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5,
          head: { ref: 'feature/auth' }
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      const pr = pullRequests[0]

      expect(pr.metadata).toMatchObject({
        number: 123,
        additions: 150,
        deletions: 30,
        changed_files: 5,
        user: { login: 'john-doe' },
        merged_at: '2024-01-10T12:00:00Z'
      })
    })
  })

  describe('Future GitHub Integration for Cycle Review', () => {
    it('should support filtering PRs by date range for cycle periods', async () => {
      // This test documents the expected behavior for future implementation
      const cycleStart = new Date('2024-01-01')
      const cycleEnd = new Date('2024-01-14')

      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'PR within cycle',
          merged_at: '2024-01-10T12:00:00Z', // Within cycle
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          additions: 100,
          deletions: 20,
          changed_files: 3
        },
        {
          id: 'pr-2',
          number: 124,
          title: 'PR outside cycle',
          merged_at: '2024-01-20T12:00:00Z', // After cycle
          user: { login: 'jane-smith' },
          html_url: 'https://github.com/test-org/repo1/pull/124',
          additions: 50,
          deletions: 10,
          changed_files: 2
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      
      // Filter by cycle date range
      const cyclePRs = pullRequests.filter(pr => {
        const mergedAt = new Date(pr.metadata.merged_at)
        return mergedAt >= cycleStart && mergedAt <= cycleEnd
      })

      expect(cyclePRs).toHaveLength(1)
      expect(cyclePRs[0].title).toBe('PR within cycle')
    })

    it('should support linking multiple PRs to a single Linear issue', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          number: 123,
          title: 'feat: Add authentication API (ENG-123)',
          body: 'Backend implementation for ENG-123',
          merged_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe' },
          html_url: 'https://github.com/test-org/backend/pull/123',
          additions: 150,
          deletions: 30,
          changed_files: 5
        },
        {
          id: 'pr-2',
          number: 45,
          title: 'feat: Add authentication UI (ENG-123)',
          body: 'Frontend implementation for ENG-123',
          merged_at: '2024-01-11T14:00:00Z',
          user: { login: 'jane-smith' },
          html_url: 'https://github.com/test-org/frontend/pull/45',
          additions: 80,
          deletions: 10,
          changed_files: 3
        }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPRs
      })

      const pullRequests = await githubExtractor.getRecentPullRequests()
      
      // Group PRs by Linear issue
      const issueGrouped = pullRequests.reduce((acc, pr) => {
        const matches = pr.title.match(/ENG-\d+/) || pr.content.match(/ENG-\d+/)
        if (matches) {
          const issueId = matches[0]
          if (!acc[issueId]) acc[issueId] = []
          acc[issueId].push(pr)
        }
        return acc
      }, {} as Record<string, any[]>)

      expect(issueGrouped['ENG-123']).toHaveLength(2)
      expect(issueGrouped['ENG-123'][0].title).toContain('authentication API')
      expect(issueGrouped['ENG-123'][1].title).toContain('authentication UI')
    })
  })
})