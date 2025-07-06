import { LinearClient } from '../linear-client';
import { LinearViewer } from '../types';

// Mock node-fetch for controlled testing
jest.mock('node-fetch');

const mockFetch = require('node-fetch') as jest.MockedFunction<any>;

describe('LinearClient', () => {
  let client: LinearClient;
  const mockApiKey = 'lin_api_test_key';
  const mockOAuthKey = 'lin_oauth_test_key';

  beforeEach(() => {
    client = new LinearClient(mockApiKey);
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(client).toBeInstanceOf(LinearClient);
    });
  });

  describe('query method', () => {
    it('should make POST request with correct headers for regular API key', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { test: 'data' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const query = 'query { viewer { id } }';
      const variables = { test: 'variable' };

      await client['query'](query, variables);

      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mockApiKey,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });
    });

    it('should use Bearer token for OAuth keys', async () => {
      const oauthClient = new LinearClient(mockOAuthKey);
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { test: 'data' } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await oauthClient['query']('query { viewer { id } }');

      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockOAuthKey}`,
        },
        body: JSON.stringify({
          query: 'query { viewer { id } }',
          variables: {},
        }),
      });
    });

    it('should throw error when API returns errors', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          errors: [
            { message: 'Authentication failed' },
            { message: 'Rate limit exceeded' }
          ]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client['query']('query { viewer { id } }')).rejects.toThrow(
        'Linear API Error: Authentication failed, Rate limit exceeded'
      );
    });

    it('should return data when successful', async () => {
      const expectedData = { viewer: { id: '123', name: 'Test User' } };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: expectedData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client['query']('query { viewer { id name } }');

      expect(result).toEqual(expectedData);
    });
  });

  describe('validateApiKey', () => {
    it('should return viewer data when API key is valid', async () => {
      const mockViewer: LinearViewer = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { viewer: mockViewer } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.validateApiKey();

      expect(result).toEqual(mockViewer);
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql', 
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('viewer')
        })
      );
    });

    it('should throw error when API key is invalid', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Authentication failed' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(client.validateApiKey()).rejects.toThrow('Invalid Linear API key');
    });
  });

  describe('getCurrentCycles', () => {
    it('should return formatted current cycles', async () => {
      const mockCyclesData = {
        cycles: {
          nodes: [
            {
              id: 'cycle1',
              name: 'Sprint 1',
              number: 1,
              startsAt: '2024-01-01T00:00:00Z',
              endsAt: '2024-01-14T23:59:59Z',
              team: {
                id: 'team1',
                name: 'Engineering',
                key: 'ENG'
              }
            },
            {
              id: 'cycle2',
              name: null,
              number: 2,
              startsAt: '2024-01-15T00:00:00Z',
              endsAt: '2024-01-28T23:59:59Z',
              team: {
                id: 'team2',
                name: 'Design',
                key: 'DES'
              }
            }
          ]
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockCyclesData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getCurrentCycles();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'cycle1',
        name: 'Sprint 1',
        number: 1,
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T23:59:59Z',
        team: {
          id: 'team1',
          name: 'Engineering',
          key: 'ENG'
        }
      });
      expect(result[1].name).toBe('Cycle 2'); // Should use number as fallback
    });
  });

  describe('getRecentCycles', () => {
    const mockDate = new Date('2024-06-15T00:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return cycles with status calculations', async () => {
      const mockCyclesData = {
        cycles: {
          nodes: [
            {
              id: 'cycle1',
              name: 'Active Cycle',
              number: 1,
              startsAt: '2024-06-01T00:00:00Z',
              endsAt: '2024-06-30T23:59:59Z',
              team: { id: 'team1', name: 'Engineering', key: 'ENG' }
            },
            {
              id: 'cycle2',
              name: 'Completed Cycle',
              number: 2,
              startsAt: '2024-05-01T00:00:00Z',
              endsAt: '2024-05-31T23:59:59Z',
              team: { id: 'team2', name: 'Design', key: 'DES' }
            },
            {
              id: 'cycle3',
              name: 'Future Cycle',
              number: 3,
              startsAt: '2024-07-01T00:00:00Z',
              endsAt: '2024-07-31T23:59:59Z',
              team: { id: 'team3', name: 'Product', key: 'PRD' }
            }
          ]
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockCyclesData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getRecentCycles(3);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('future'); // Most recent by start date
      expect(result[0].isActive).toBe(false);
      expect(result[1].status).toBe('active');
      expect(result[1].isActive).toBe(true);
      expect(result[2].status).toBe('completed');
      expect(result[2].isActive).toBe(false);

      // Verify the query was called with correct date parameter
      const expectedDate = new Date('2024-03-15T00:00:00Z').toISOString(); // 3 months back
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining(expectedDate)
        })
      );
    });

    it('should use default 3 months when no parameter provided', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { cycles: { nodes: [] } } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getRecentCycles();

      const expectedDate = new Date('2024-03-15T00:00:00Z').toISOString();
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining(expectedDate)
        })
      );
    });
  });

  describe('getIssuesInCycle', () => {
    it('should return issues for a specific cycle', async () => {
      const mockIssuesData = {
        cycle: {
          issues: {
            nodes: [
              {
                id: 'issue1',
                identifier: 'ENG-123',
                title: 'Fix login bug',
                description: 'Users cannot log in',
                state: { name: 'In Progress', type: 'started' },
                assignee: { name: 'John Doe', email: 'john@example.com' },
                priority: 1,
                estimate: 3,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
                labels: { nodes: [{ id: 'label1', name: 'bug', color: '#ff0000' }] },
                project: { id: 'project1', name: 'Authentication' }
              }
            ]
          }
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockIssuesData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesInCycle('cycle1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockIssuesData.cycle.issues.nodes[0]);
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining('cycle1')
        })
      );
    });

    it('should return empty array when cycle has no issues', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { cycle: { issues: { nodes: [] } } } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesInCycle('empty-cycle');

      expect(result).toEqual([]);
    });

    it('should return empty array when cycle is not found', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { cycle: null } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesInCycle('nonexistent-cycle');

      expect(result).toEqual([]);
    });
  });

  describe('getIssuesByProject', () => {
    it('should return issues for a specific project', async () => {
      const mockIssuesData = {
        project: {
          issues: {
            nodes: [
              {
                id: 'issue1',
                identifier: 'PROJ-456',
                title: 'Implement feature',
                description: 'Add new functionality',
                state: { name: 'Todo', type: 'unstarted' },
                assignee: { name: 'Jane Smith', email: 'jane@example.com' },
                priority: 2,
                estimate: 5,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                labels: { nodes: [{ id: 'label2', name: 'feature', color: '#00ff00' }] },
                project: { id: 'project1', name: 'New Features' }
              }
            ]
          }
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockIssuesData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesByProject('project1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockIssuesData.project.issues.nodes[0]);
    });
  });

  describe('getProjects', () => {
    it('should return all projects', async () => {
      const mockProjectsData = {
        projects: {
          nodes: [
            {
              id: 'project1',
              name: 'Authentication System',
              description: 'User authentication and authorization',
              state: 'active',
              startDate: '2024-01-01',
              targetDate: '2024-03-01'
            },
            {
              id: 'project2',
              name: 'Dashboard Redesign',
              description: 'Modern UI overhaul',
              state: 'planned',
              startDate: '2024-02-01',
              targetDate: '2024-04-01'
            }
          ]
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockProjectsData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getProjects();

      expect(result).toEqual(mockProjectsData.projects.nodes);
      expect(result).toHaveLength(2);
    });
  });

  describe('getTeams', () => {
    it('should return all teams', async () => {
      const mockTeamsData = {
        teams: {
          nodes: [
            { id: 'team1', name: 'Engineering', key: 'ENG' },
            { id: 'team2', name: 'Design', key: 'DES' },
            { id: 'team3', name: 'Product', key: 'PRD' }
          ]
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockTeamsData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getTeams();

      expect(result).toEqual(mockTeamsData.teams.nodes);
      expect(result).toHaveLength(3);
    });
  });

  describe('getIssuesForTeam', () => {
    it('should return issues for a specific team with default limit', async () => {
      const mockIssuesData = {
        team: {
          issues: {
            nodes: [
              {
                id: 'issue1',
                identifier: 'ENG-789',
                title: 'Database optimization',
                description: 'Improve query performance',
                state: { name: 'Done', type: 'completed' },
                assignee: { name: 'Alice Johnson', email: 'alice@example.com' },
                priority: 3,
                estimate: 8,
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-10T00:00:00Z',
                labels: { nodes: [{ id: 'label3', name: 'performance', color: '#0000ff' }] },
                project: { id: 'project2', name: 'Infrastructure' }
              }
            ]
          }
        }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: mockIssuesData })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesForTeam('team1');

      expect(result).toEqual(mockIssuesData.team.issues.nodes);
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining('"first":50')
        })
      );
    });

    it('should respect custom limit parameter', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { team: { issues: { nodes: [] } } } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await client.getIssuesForTeam('team1', 25);

      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining('"first":25')
        })
      );
    });

    it('should return empty array when team has no issues', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { team: { issues: { nodes: [] } } } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssuesForTeam('empty-team');

      expect(result).toEqual([]);
    });
  });

  describe('getIssue', () => {
    it('should return a specific issue', async () => {
      const mockIssue = {
        id: 'issue1',
        identifier: 'TEST-123',
        title: 'Single issue test',
        description: 'Test description',
        state: { name: 'In Review', type: 'started' },
        assignee: { name: 'Test User', email: 'test@example.com' },
        priority: 1,
        estimate: 2,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
        labels: { nodes: [{ id: 'label1', name: 'test', color: '#purple' }] },
        project: { id: 'project1', name: 'Test Project' }
      };
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { issue: mockIssue } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssue('issue1');

      expect(result).toEqual(mockIssue);
      expect(mockFetch).toHaveBeenCalledWith('https://api.linear.app/graphql',
        expect.objectContaining({
          body: expect.stringContaining('issue1')
        })
      );
    });

    it('should return null when issue is not found', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({ data: { issue: null } })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssue('nonexistent-issue');

      expect(result).toBeNull();
    });

    it('should return null when API throws error', async () => {
      const mockResponse = {
        json: jest.fn().mockResolvedValue({
          errors: [{ message: 'Issue not found' }]
        })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await client.getIssue('error-issue');

      expect(result).toBeNull();
    });
  });
});