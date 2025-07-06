import { LinearExtractor } from '../extractors/linear-extractor';
import { LinearClient } from '../linear-client';
import { LinearIssue, LinearCycle, LinearProject, LinearTeam, LinearViewer } from '../types';
import { UnifiedContent, LinearContent } from '../unified-types';

// Mock the LinearClient
jest.mock('../linear-client');
const MockedLinearClient = LinearClient as jest.MockedClass<typeof LinearClient>;

describe('LinearExtractor', () => {
  let extractor: LinearExtractor;
  let mockClient: jest.Mocked<LinearClient>;
  const mockApiKey = 'test-linear-api-key';

  beforeEach(() => {
    MockedLinearClient.mockClear();
    mockClient = new MockedLinearClient(mockApiKey) as jest.Mocked<LinearClient>;
    extractor = new LinearExtractor(mockApiKey);
    
    // Replace the private client with our mock
    (extractor as any).client = mockClient;
  });

  describe('constructor', () => {
    it('should initialize with correct source and API key', () => {
      expect(extractor.source).toBe('linear');
      expect(MockedLinearClient).toHaveBeenCalledWith(mockApiKey);
    });
  });

  describe('validateConnection', () => {
    it('should return true when client validates successfully', async () => {
      const mockViewer: LinearViewer = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com'
      };
      mockClient.validateApiKey.mockResolvedValue(mockViewer);

      const result = await extractor.validateConnection();

      expect(result).toBe(true);
      expect(mockClient.validateApiKey).toHaveBeenCalledTimes(1);
    });

    it('should return false when client validation fails', async () => {
      mockClient.validateApiKey.mockRejectedValue(new Error('Invalid API key'));

      const result = await extractor.validateConnection();

      expect(result).toBe(false);
      expect(mockClient.validateApiKey).toHaveBeenCalledTimes(1);
    });
  });

  describe('extract', () => {
    const mockTeams: LinearTeam[] = [
      { id: 'team1', name: 'Engineering', key: 'ENG' },
      { id: 'team2', name: 'Design', key: 'DES' }
    ];

    const mockProjects: LinearProject[] = [
      {
        id: 'project1',
        name: 'Authentication System',
        description: 'User auth and authorization',
        state: 'active',
        startDate: '2024-01-01',
        targetDate: '2024-03-01'
      }
    ];

    const mockCycles: LinearCycle[] = [
      {
        id: 'cycle1',
        name: 'Sprint 1',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T23:59:59Z',
        isActive: true,
        status: 'active',
        team: { id: 'team1', name: 'Engineering', key: 'ENG' }
      }
    ];

    const mockIssues: LinearIssue[] = [
      {
        id: 'issue1',
        identifier: 'ENG-123',
        title: 'Fix login bug',
        description: 'Users cannot log in with OAuth',
        url: 'https://linear.app/team/issue/ENG-123',
        state: { name: 'In Progress', type: 'started' },
        assignee: { name: 'John Doe', email: 'john@example.com' },
        priority: 1,
        estimate: 3,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        labels: [{ id: 'label1', name: 'bug', color: '#ff0000' }],
        project: { id: 'project1', name: 'Authentication System', color: '#3b82f6' }
      }
    ];

    beforeEach(() => {
      mockClient.getTeams.mockResolvedValue(mockTeams);
      mockClient.getProjects.mockResolvedValue(mockProjects);
      mockClient.getRecentCycles.mockResolvedValue(mockCycles);
      mockClient.getIssuesForTeam.mockResolvedValue(mockIssues);
    });

    it('should extract all content types successfully', async () => {
      const result = await extractor.extract();

      expect(result).toHaveLength(6); // 2 teams + 1 project + 1 cycle + 2 issues (1 per team)
      expect(mockClient.getTeams).toHaveBeenCalledTimes(1);
      expect(mockClient.getProjects).toHaveBeenCalledTimes(1);
      expect(mockClient.getRecentCycles).toHaveBeenCalledWith(6);
      expect(mockClient.getIssuesForTeam).toHaveBeenCalledTimes(2);
      expect(mockClient.getIssuesForTeam).toHaveBeenCalledWith('team1', 100);
      expect(mockClient.getIssuesForTeam).toHaveBeenCalledWith('team2', 100);
    });

    it('should handle extraction errors', async () => {
      mockClient.getTeams.mockRejectedValue(new Error('API Error'));

      await expect(extractor.extract()).rejects.toThrow('Linear extraction failed: Error: API Error');
    });

    it('should create properly formatted unified content', async () => {
      const result = await extractor.extract();

      // Find team content
      const teamContent = result.find(c => c.metadata.contentType === 'linear-team');
      expect(teamContent).toBeDefined();
      expect(teamContent!.metadata.source).toBe('linear');
      expect(teamContent!.metadata.title).toBe('Engineering');
      expect(teamContent!.keywords).toContain('Engineering');
      expect(teamContent!.keywords).toContain('ENG');

      // Find project content
      const projectContent = result.find(c => c.metadata.contentType === 'linear-project');
      expect(projectContent).toBeDefined();
      expect(projectContent!.metadata.title).toBe('Authentication System');
      expect(projectContent!.structuredData?.status).toBe('active');

      // Find cycle content
      const cycleContent = result.find(c => c.metadata.contentType === 'linear-cycle');
      expect(cycleContent).toBeDefined();
      expect(cycleContent!.metadata.title).toBe('Sprint 1 (Engineering)');
      expect(cycleContent!.structuredData?.status).toBe('active');

      // Find issue content
      const issueContent = result.find(c => c.metadata.contentType === 'linear-issue');
      expect(issueContent).toBeDefined();
      expect(issueContent!.metadata.title).toBe('ENG-123: Fix login bug');
      expect(issueContent!.metadata.parentId).toBe('linear-project-project1');
    });
  });

  describe('incrementalSync', () => {
    it('should perform full sync (incremental not implemented)', async () => {
      mockClient.getTeams.mockResolvedValue([]);
      mockClient.getProjects.mockResolvedValue([]);
      mockClient.getRecentCycles.mockResolvedValue([]);

      const result = await extractor.incrementalSync('2024-01-01T00:00:00Z');

      expect(result).toEqual([]);
      expect(mockClient.getTeams).toHaveBeenCalledTimes(1);
    });
  });

  describe('issueToUnifiedContent', () => {
    it('should convert issue to unified content correctly', () => {
      const mockIssue: LinearIssue = {
        id: 'issue1',
        identifier: 'TEST-456',
        title: 'Test Issue',
        description: 'This is a test issue for unit testing',
        url: 'https://linear.app/team/issue/TEST-456',
        state: { name: 'Todo', type: 'unstarted' },
        assignee: { name: 'Jane Smith', email: 'jane@test.com' },
        priority: 2,
        estimate: 5,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
        labels: [
          { id: 'label1', name: 'feature', color: '#00ff00' },
          { id: 'label2', name: 'high-priority', color: '#ff0000' }
        ],
        project: { id: 'project1', name: 'Test Project', color: '#3b82f6' }
      };

      const result = extractor['issueToUnifiedContent'](mockIssue);

      expect(result.metadata.id).toBe('linear-issue-issue1');
      expect(result.metadata.source).toBe('linear');
      expect(result.metadata.contentType).toBe('linear-issue');
      expect(result.metadata.title).toBe('TEST-456: Test Issue');
      expect(result.metadata.description).toBe('This is a test issue for unit testing');
      expect(result.metadata.url).toBe('https://linear.app/issue/TEST-456');
      expect(result.metadata.parentId).toBe('linear-project-project1');

      expect(result.content).toBe('This is a test issue for unit testing');
      
      expect(result.keywords).toContain('TEST-456');
      expect(result.keywords).toContain('Todo');
      expect(result.keywords).toContain('Jane Smith');
      expect(result.keywords).toContain('Test Project');
      expect(result.keywords).toContain('feature');
      expect(result.keywords).toContain('high-priority');

      expect(result.structuredData?.status).toBe('Todo');
      expect(result.structuredData?.state).toBe('unstarted');
      expect(result.structuredData?.priority).toBe(2);
      expect(result.structuredData?.estimate).toBe(5);
      expect(result.structuredData?.assignees).toHaveLength(1);
      expect(result.structuredData?.assignees?.[0].name).toBe('Jane Smith');
      expect(result.structuredData?.labels).toHaveLength(2);
      expect(result.structuredData?.project?.name).toBe('Test Project');
    });

    it('should handle issue without optional fields', () => {
      const minimalIssue: LinearIssue = {
        id: 'issue2',
        identifier: 'MIN-001',
        title: 'Minimal Issue',
        url: 'https://linear.app/team/issue/MIN-001',
        state: { name: 'Backlog', type: 'unstarted' },
        priority: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = extractor['issueToUnifiedContent'](minimalIssue);

      expect(result.metadata.description).toBeUndefined();
      expect(result.metadata.parentId).toBeUndefined();
      expect(result.content).toBe('');
      expect(result.structuredData?.assignees).toHaveLength(0);
      expect(result.structuredData?.labels).toHaveLength(0);
      expect(result.structuredData?.project).toBeUndefined();
    });
  });

  describe('projectToUnifiedContent', () => {
    it('should convert project to unified content correctly', () => {
      const mockProject: LinearProject = {
        id: 'project1',
        name: 'Mobile App',
        description: 'iOS and Android application',
        state: 'in_progress',
        startDate: '2024-01-01',
        targetDate: '2024-06-01'
      };

      const result = extractor['projectToUnifiedContent'](mockProject);

      expect(result.metadata.id).toBe('linear-project-project1');
      expect(result.metadata.source).toBe('linear');
      expect(result.metadata.contentType).toBe('linear-project');
      expect(result.metadata.title).toBe('Mobile App');
      expect(result.metadata.description).toBe('iOS and Android application');
      expect(result.metadata.url).toBe('https://linear.app/project/project1');

      expect(result.content).toBe('iOS and Android application');
      expect(result.keywords).toContain('Mobile App');
      expect(result.keywords).toContain('in_progress');

      expect(result.structuredData?.status).toBe('in_progress');
      expect(result.structuredData?.startDate).toBe('2024-01-01');
      expect(result.structuredData?.endDate).toBe('2024-06-01');
      expect(result.structuredData?.dueDate).toBe('2024-06-01');
    });
  });

  describe('cycleToUnifiedContent', () => {
    it('should convert cycle to unified content correctly', () => {
      const mockCycle: LinearCycle = {
        id: 'cycle1',
        name: 'Q1 Sprint 1',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T23:59:59Z',
        isActive: false,
        status: 'completed',
        team: { id: 'team1', name: 'Backend Team', key: 'BACK' }
      };

      const result = extractor['cycleToUnifiedContent'](mockCycle);

      expect(result.metadata.id).toBe('linear-cycle-cycle1');
      expect(result.metadata.source).toBe('linear');
      expect(result.metadata.contentType).toBe('linear-cycle');
      expect(result.metadata.title).toBe('Q1 Sprint 1 (Backend Team)');
      expect(result.metadata.url).toBe('https://linear.app/cycle/cycle1');

      expect(result.content).toBe('Cycle Q1 Sprint 1 for team Backend Team');
      expect(result.keywords).toContain('Q1 Sprint 1');
      expect(result.keywords).toContain('Backend Team');
      expect(result.keywords).toContain('BACK');
      expect(result.keywords).toContain('completed');

      expect(result.structuredData?.status).toBe('completed');
      expect(result.structuredData?.startDate).toBe('2024-01-01T00:00:00Z');
      expect(result.structuredData?.endDate).toBe('2024-01-14T23:59:59Z');
      expect(result.structuredData?.team?.name).toBe('Backend Team');
    });

    it('should handle cycle without explicit status', () => {
      const mockCycle: LinearCycle = {
        id: 'cycle2',
        name: 'Active Cycle',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-14T23:59:59Z',
        isActive: true,
        team: { id: 'team1', name: 'Frontend Team', key: 'FRONT' }
      };

      const result = extractor['cycleToUnifiedContent'](mockCycle);

      expect(result.structuredData?.status).toBe('active');
      expect(result.structuredData?.linearSpecific?.isActive).toBe(true);
    });
  });

  describe('teamToUnifiedContent', () => {
    it('should convert team to unified content correctly', () => {
      const mockTeam: LinearTeam = {
        id: 'team1',
        name: 'Data Engineering',
        key: 'DATA'
      };

      const result = extractor['teamToUnifiedContent'](mockTeam);

      expect(result.metadata.id).toBe('linear-team-team1');
      expect(result.metadata.source).toBe('linear');
      expect(result.metadata.contentType).toBe('linear-team');
      expect(result.metadata.title).toBe('Data Engineering');
      expect(result.metadata.description).toBe('Linear team: Data Engineering (DATA)');
      expect(result.metadata.url).toBe('https://linear.app/team/DATA');

      expect(result.content).toBe('Team Data Engineering with key DATA');
      expect(result.keywords).toContain('Data Engineering');
      expect(result.keywords).toContain('DATA');

      expect(result.structuredData?.team?.id).toBe('team1');
      expect(result.structuredData?.team?.name).toBe('Data Engineering');
      expect(result.structuredData?.team?.key).toBe('DATA');
      expect(result.structuredData?.linearSpecific?.teamKey).toBe('DATA');
    });
  });

  describe('searchableText generation', () => {
    it('should create lowercase searchable text for issues', () => {
      const mockIssue: LinearIssue = {
        id: 'issue1',
        identifier: 'SEARCH-123',
        title: 'Test UPPERCASE Title',
        description: 'Test Description with MIXED Case',
        url: 'https://linear.app/team/issue/SEARCH-123',
        state: { name: 'In Progress', type: 'started' },
        assignee: { name: 'John DOE', email: 'john@example.com' },
        priority: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        labels: [{ id: 'label1', name: 'URGENT', color: '#ff0000' }],
        project: { id: 'project1', name: 'Important PROJECT', color: '#3b82f6' }
      };

      const result = extractor['issueToUnifiedContent'](mockIssue);

      expect(result.searchableText).toBe(
        'test uppercase title test description with mixed case search-123 in progress john doe important project urgent'
      );
    });

    it('should handle missing optional fields in searchable text', () => {
      const minimalIssue: LinearIssue = {
        id: 'issue1',
        identifier: 'MIN-001',
        title: 'Basic Title',
        url: 'https://linear.app/team/issue/MIN-001',
        state: { name: 'Todo', type: 'unstarted' },
        priority: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const result = extractor['issueToUnifiedContent'](minimalIssue);

      expect(result.searchableText).toBe('basic title  min-001 todo   ');
    });
  });
});