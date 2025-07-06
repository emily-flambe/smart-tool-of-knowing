/**
 * GitHub Cycle Integration Tests
 * 
 * These tests validate the GitHub integration functionality for cycle reviews by:
 * 1. Testing the public extract() method instead of private methods
 * 2. Using proper UnifiedContent structure with GitHubContent types
 * 3. Mocking axios properly (since GitHubExtractor uses axios, not node-fetch)
 * 4. Testing pull request matching logic for Linear issue identifiers
 * 5. Validating structured data extraction for cycle-related workflows
 */

import { GitHubExtractor } from '../../extractors/github-extractor'
import { UnifiedContent, GitHubContent } from '../../unified-types'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

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
    process.env.GITHUB_REPOS = 'test-org/repo1'
    githubExtractor = new GitHubExtractor('test-github-token', ['test-org/repo1'])
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
    const linearIssues = [
      { identifier: 'ENG-123', title: 'Implement authentication' },
      { identifier: 'ENG-124', title: 'Fix login bug' }
    ]

    it('should fetch pull requests and convert to unified content', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add user authentication (ENG-123)',
          body: 'Implements login and registration for ENG-123',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [{ name: 'enhancement', color: '0366d6' }],
          base: { ref: 'main' },
          head: { ref: 'feature/eng-123-authentication' }
        },
        {
          id: 2,
          number: 124,
          title: 'fix: Resolve login issue',
          body: 'Fixes the bug described in ENG-124 where users cannot log in',
          state: 'closed',
          merged_at: '2024-01-12T15:30:00Z',
          created_at: '2024-01-11T09:00:00Z',
          updated_at: '2024-01-12T15:30:00Z',
          closed_at: '2024-01-12T15:30:00Z',
          user: { login: 'jane-smith', html_url: 'https://github.com/jane-smith' },
          html_url: 'https://github.com/test-org/repo1/pull/124',
          assignees: [{ login: 'john-doe', html_url: 'https://github.com/john-doe' }],
          labels: [{ name: 'bug', color: 'd73a4a' }],
          base: { ref: 'main' },
          head: { ref: 'bugfix/login-issue' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-12T15:30:00Z',
        pushed_at: '2024-01-12T15:30:00Z',
        language: 'JavaScript',
        topics: ['backend', 'api'],
        private: false,
        default_branch: 'main'
      }

      const mockCommits = [
        {
          sha: 'abc123',
          commit: {
            message: 'Add authentication feature',
            author: {
              name: 'John Doe',
              email: 'john@example.com',
              date: '2024-01-10T10:00:00Z'
            }
          },
          author: {
            login: 'john-doe',
            html_url: 'https://github.com/john-doe'
          },
          html_url: 'https://github.com/test-org/repo1/commit/abc123'
        }
      ]

      // Mock all API calls that the extractor makes
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: mockCommits, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()

      // Filter to get only pull requests
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      ) as GitHubContent[]

      expect(pullRequests).toHaveLength(2)
      
      // Check first PR
      const pr1 = pullRequests.find(pr => pr.metadata.sourceMetadata.number === 123)
      expect(pr1).toBeDefined()
      expect(pr1!.metadata.title).toBe('#123: feat: Add user authentication (ENG-123)')
      expect(pr1!.content).toBe('Implements login and registration for ENG-123')
      expect(pr1!.metadata.sourceMetadata).toMatchObject({
        owner: 'test-org',
        repository: 'repo1',
        number: 123,
        branch: 'feature/eng-123-authentication',
        baseBranch: 'main'
      })

      // Check second PR
      const pr2 = pullRequests.find(pr => pr.metadata.sourceMetadata.number === 124)
      expect(pr2).toBeDefined()
      expect(pr2!.metadata.title).toBe('#124: fix: Resolve login issue')
      expect(pr2!.content).toBe('Fixes the bug described in ENG-124 where users cannot log in')
    })

    it('should match pull requests to Linear issues by identifier in title', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add authentication (ENG-123)',
          body: 'Authentication implementation',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        pushed_at: '2024-01-10T12:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      )
      
      // Test issue matching logic (this would be implemented in cycle review service)
      const matchedPRs = pullRequests.filter(pr => 
        linearIssues.some(issue => 
          pr.metadata.title.includes(issue.identifier) || 
          pr.content.includes(issue.identifier)
        )
      )

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].metadata.title).toContain('ENG-123')
    })

    it('should match pull requests to Linear issues by identifier in body', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add authentication system',
          body: 'This PR implements the authentication system for ENG-123',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        pushed_at: '2024-01-10T12:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      )
      
      const matchedPRs = pullRequests.filter(pr => 
        linearIssues.some(issue => 
          pr.metadata.title.includes(issue.identifier) || 
          pr.content.includes(issue.identifier)
        )
      )

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].content).toContain('ENG-123')
    })

    it('should match pull requests by branch name patterns', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add authentication system',
          body: 'Authentication implementation',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/eng-123-authentication' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        pushed_at: '2024-01-10T12:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      ) as GitHubContent[]
      
      // Test branch name matching logic
      const matchedPRs = pullRequests.filter(pr => {
        const branchName = pr.metadata.sourceMetadata?.branch?.toLowerCase() || ''
        return linearIssues.some(issue => 
          branchName.includes(issue.identifier.toLowerCase())
        )
      })

      expect(matchedPRs).toHaveLength(1)
      expect(matchedPRs[0].metadata.sourceMetadata.branch).toBe('feature/eng-123-authentication')
    })

    it('should handle GitHub API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Unauthorized'))

      await expect(githubExtractor.extract()).rejects.toThrow('GitHub extraction failed')
    })

    it('should handle rate limiting', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: {
          status: 403,
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1640995200'
          },
          statusText: 'Forbidden'
        }
      })

      await expect(githubExtractor.extract()).rejects.toThrow('GitHub extraction failed')
    })

    it('should extract PR statistics correctly', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add authentication (ENG-123)',
          body: 'Authentication implementation',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-10T12:00:00Z',
        pushed_at: '2024-01-10T12:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      ) as GitHubContent[]
      
      const pr = pullRequests[0]

      expect(pr.metadata.sourceMetadata).toMatchObject({
        number: 123,
        branch: 'feature/auth',
        baseBranch: 'main'
      })
      expect(pr.structuredData?.mergedAt).toBe('2024-01-10T12:00:00Z')
      expect(pr.structuredData?.author).toMatchObject({
        name: 'john-doe',
        url: 'https://github.com/john-doe'
      })
    })
  })

  describe('Future GitHub Integration for Cycle Review', () => {
    it('should support filtering PRs by date range for cycle periods', async () => {
      const cycleStart = new Date('2024-01-01')
      const cycleEnd = new Date('2024-01-14')

      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'PR within cycle',
          body: '',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z', // Within cycle
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/repo1/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth' }
        },
        {
          id: 2,
          number: 124,
          title: 'PR outside cycle',
          body: '',
          state: 'closed',
          merged_at: '2024-01-20T12:00:00Z', // After cycle
          created_at: '2024-01-18T10:00:00Z',
          updated_at: '2024-01-20T12:00:00Z',
          closed_at: '2024-01-20T12:00:00Z',
          user: { login: 'jane-smith', html_url: 'https://github.com/jane-smith' },
          html_url: 'https://github.com/test-org/repo1/pull/124',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/other' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-20T12:00:00Z',
        pushed_at: '2024-01-20T12:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      ) as GitHubContent[]
      
      // Filter by cycle date range
      const cyclePRs = pullRequests.filter(pr => {
        const mergedAt = pr.structuredData?.mergedAt ? new Date(pr.structuredData.mergedAt) : null
        return mergedAt && mergedAt >= cycleStart && mergedAt <= cycleEnd
      })

      expect(cyclePRs).toHaveLength(1)
      expect(cyclePRs[0].metadata.title).toBe('#123: PR within cycle')
    })

    it('should support linking multiple PRs to a single Linear issue', async () => {
      const mockPRs = [
        {
          id: 1,
          number: 123,
          title: 'feat: Add authentication API (ENG-123)',
          body: 'Backend implementation for ENG-123',
          state: 'closed',
          merged_at: '2024-01-10T12:00:00Z',
          created_at: '2024-01-08T10:00:00Z',
          updated_at: '2024-01-10T12:00:00Z',
          closed_at: '2024-01-10T12:00:00Z',
          user: { login: 'john-doe', html_url: 'https://github.com/john-doe' },
          html_url: 'https://github.com/test-org/backend/pull/123',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth-backend' }
        },
        {
          id: 2,
          number: 45,
          title: 'feat: Add authentication UI (ENG-123)',
          body: 'Frontend implementation for ENG-123',
          state: 'closed',
          merged_at: '2024-01-11T14:00:00Z',
          created_at: '2024-01-09T10:00:00Z',
          updated_at: '2024-01-11T14:00:00Z',
          closed_at: '2024-01-11T14:00:00Z',
          user: { login: 'jane-smith', html_url: 'https://github.com/jane-smith' },
          html_url: 'https://github.com/test-org/frontend/pull/45',
          assignees: [],
          labels: [],
          base: { ref: 'main' },
          head: { ref: 'feature/auth-frontend' }
        }
      ]

      const mockRepo = {
        id: 12345,
        name: 'repo1',
        full_name: 'test-org/repo1',
        description: 'Test repository',
        html_url: 'https://github.com/test-org/repo1',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2024-01-11T14:00:00Z',
        pushed_at: '2024-01-11T14:00:00Z',
        language: 'JavaScript',
        topics: [],
        private: false,
        default_branch: 'main'
      }

      // Mock all API calls
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/repos/test-org/repo1/commits')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1/pulls')) {
          return Promise.resolve({ data: mockPRs, status: 200 })
        } else if (url.includes('/repos/test-org/repo1/issues')) {
          return Promise.resolve({ data: [], status: 200 })
        } else if (url.includes('/repos/test-org/repo1')) {
          return Promise.resolve({ data: mockRepo, status: 200 })
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`))
      })

      const unifiedContent = await githubExtractor.extract()
      const pullRequests = unifiedContent.filter(
        content => content.metadata.contentType === 'github-pull-request'
      )
      
      // Group PRs by Linear issue
      const issueGrouped = pullRequests.reduce((acc, pr) => {
        const titleMatches = pr.metadata.title.match(/ENG-\d+/)
        const contentMatches = pr.content.match(/ENG-\d+/)
        const matches = titleMatches || contentMatches
        if (matches) {
          const issueId = matches[0]
          if (!acc[issueId]) acc[issueId] = []
          acc[issueId].push(pr)
        }
        return acc
      }, {} as Record<string, UnifiedContent[]>)

      expect(issueGrouped['ENG-123']).toHaveLength(2)
      expect(issueGrouped['ENG-123'][0].metadata.title).toContain('authentication API')
      expect(issueGrouped['ENG-123'][1].metadata.title).toContain('authentication UI')
    })
  })
})