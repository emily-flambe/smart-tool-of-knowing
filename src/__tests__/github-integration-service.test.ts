import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { GitHubIntegrationService } from '../services/github-integration-service.js';
import { LinearClient } from '../linear-client.js';
import { GitHubCLI } from '../utils/github-cli.js';

// Mock the modules
jest.mock('../linear-client.js');
jest.mock('../utils/github-cli.js');

describe('GitHubIntegrationService', () => {
  let service: GitHubIntegrationService;
  let mockLinearClient: jest.Mocked<LinearClient>;
  let mockGitHubCLI: jest.Mocked<GitHubCLI>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockLinearClient = new LinearClient('test-key') as jest.Mocked<LinearClient>;
    
    // Mock GitHubCLI
    const GitHubCLIMock = GitHubCLI as jest.MockedClass<typeof GitHubCLI>;
    mockGitHubCLI = new GitHubCLIMock() as jest.Mocked<GitHubCLI>;
    
    // Setup default mock implementations
    mockGitHubCLI.isConfigured.mockReturnValue(true);
    mockGitHubCLI.searchPRsForIssue.mockResolvedValue([]);
    mockLinearClient.getIssueAttachments.mockResolvedValue([]);
    
    // Replace the GitHubCLI instance in the service
    service = new GitHubIntegrationService(mockLinearClient);
    (service as any).githubCLI = mockGitHubCLI;
  });

  describe('getLinkedPRsForIssue', () => {
    test('should return PRs from Linear attachments when available', async () => {
      const issueId = 'issue-123';
      const issueIdentifier = 'ENG-123';
      
      const mockAttachments = [
        {
          id: 'att-1',
          title: 'Fix: Authentication bug',
          url: 'https://github.com/org/repo/pull/456',
          createdAt: '2024-01-01T00:00:00Z',
          creator: { id: 'user-1', name: 'John Doe' },
          metadata: {}
        }
      ];
      
      mockLinearClient.getIssueAttachments.mockResolvedValue(mockAttachments);
      
      const result = await service.getLinkedPRsForIssue(issueId, issueIdentifier);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'org/repo#456',
        number: 456,
        title: 'Fix: Authentication bug',
        url: 'https://github.com/org/repo/pull/456',
        author: 'John Doe',
        confidence: 1.0
      });
      
      // Should not call GitHub CLI when attachments are found
      expect(mockGitHubCLI.searchPRsForIssue).not.toHaveBeenCalled();
    });

    test('should fall back to GitHub CLI search when no attachments found', async () => {
      const issueId = 'issue-123';
      const issueIdentifier = 'ENG-123';
      
      mockLinearClient.getIssueAttachments.mockResolvedValue([]);
      
      const mockPRs = [{
        number: 789,
        title: 'Fix: ENG-123 - Authentication bug',
        url: 'https://github.com/org/repo/pull/789',
        author: { login: 'janedoe' },
        mergedAt: '2024-01-02T00:00:00Z',
        additions: 100,
        deletions: 50,
        files: new Array(5),
        body: 'Fixes ENG-123',
        headRefName: 'fix/ENG-123-auth-bug'
      }];
      
      mockGitHubCLI.searchPRsForIssue.mockResolvedValue(mockPRs);
      
      const result = await service.getLinkedPRsForIssue(issueId, issueIdentifier);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'org/repo#789',
        number: 789,
        title: 'Fix: ENG-123 - Authentication bug',
        author: 'janedoe',
        confidence: expect.any(Number)
      });
      
      expect(mockGitHubCLI.searchPRsForIssue).toHaveBeenCalledWith(issueIdentifier, []);
    });

    test('should return empty array when no PRs found', async () => {
      const issueId = 'issue-123';
      const issueIdentifier = 'ENG-123';
      
      mockLinearClient.getIssueAttachments.mockResolvedValue([]);
      mockGitHubCLI.searchPRsForIssue.mockResolvedValue([]);
      
      const result = await service.getLinkedPRsForIssue(issueId, issueIdentifier);
      
      expect(result).toEqual([]);
    });
  });

  describe('getLinkedPRsForIssues', () => {
    test('should batch process multiple issues', async () => {
      const issues = [
        { id: 'issue-1', identifier: 'ENG-1' },
        { id: 'issue-2', identifier: 'ENG-2' }
      ];
      
      const attachmentsMap = new Map([
        ['issue-1', [{
          id: 'att-1',
          title: 'PR for ENG-1',
          url: 'https://github.com/org/repo/pull/1',
          createdAt: '2024-01-01T00:00:00Z',
          creator: { id: 'user-1', name: 'User 1' },
          metadata: {}
        }]],
        ['issue-2', []]
      ]);
      
      mockLinearClient.getIssuesWithAttachments.mockResolvedValue(attachmentsMap);
      
      // Mock GitHub CLI for issue-2 (no attachments)
      mockGitHubCLI.searchPRsForIssue.mockResolvedValue([{
        number: 2,
        title: 'Fix for ENG-2',
        url: 'https://github.com/org/repo/pull/2',
        author: { login: 'user2' },
        mergedAt: '2024-01-02T00:00:00Z',
        additions: 50,
        deletions: 25,
        files: [],
        body: 'Fixes ENG-2',
        headRefName: 'fix/ENG-2'
      }]);
      
      const result = await service.getLinkedPRsForIssues(issues);
      
      expect(result.size).toBe(2);
      expect(result.get('issue-1')).toHaveLength(1);
      expect(result.get('issue-2')).toHaveLength(1);
    });
  });

  describe('confidence scoring', () => {
    test('should calculate high confidence for PRs with issue ID in title', async () => {
      const issueId = 'issue-123';
      const issueIdentifier = 'ENG-123';
      
      mockLinearClient.getIssueAttachments.mockResolvedValue([]);
      
      const mockPR = {
        number: 789,
        title: 'ENG-123: Fix authentication bug',
        url: 'https://github.com/org/repo/pull/789',
        author: { login: 'dev' },
        mergedAt: '2024-01-01T00:00:00Z',
        additions: 100,
        deletions: 50,
        files: [],
        body: 'This PR addresses the auth issue',
        headRefName: 'feature/auth-fix'
      };
      
      mockGitHubCLI.searchPRsForIssue.mockResolvedValue([mockPR]);
      
      const result = await service.getLinkedPRsForIssue(issueId, issueIdentifier);
      
      expect(result[0].confidence).toBeGreaterThan(0.7); // Base 0.5 + title 0.3
    });

    test('should calculate maximum confidence for PRs with fixes/closes in body', async () => {
      const issueId = 'issue-123';
      const issueIdentifier = 'ENG-123';
      
      mockLinearClient.getIssueAttachments.mockResolvedValue([]);
      
      const mockPR = {
        number: 789,
        title: 'Fix authentication bug',
        url: 'https://github.com/org/repo/pull/789',
        author: { login: 'dev' },
        mergedAt: '2024-01-01T00:00:00Z',
        additions: 100,
        deletions: 50,
        files: [],
        body: 'This PR fixes ENG-123',
        headRefName: 'ENG-123-auth-fix'
      };
      
      mockGitHubCLI.searchPRsForIssue.mockResolvedValue([mockPR]);
      
      const result = await service.getLinkedPRsForIssue(issueId, issueIdentifier);
      
      expect(result[0].confidence).toBeCloseTo(0.8, 5); // Base 0.5 + fixes 0.2 + branch 0.1
    });
  });

  describe('enrichPRData', () => {
    test('should enrich PR data with additional details', async () => {
      const prs = [{
        id: 'org/repo#123',
        number: 123,
        title: 'Test PR',
        url: 'https://github.com/org/repo/pull/123',
        author: 'dev',
        mergedAt: '2024-01-01T00:00:00Z',
        additions: 0,
        deletions: 0,
        filesChanged: 0,
        linkedIssues: ['ENG-123'],
        confidence: 0.8
      }];
      
      mockGitHubCLI.getPRDetails.mockResolvedValue({
        number: 123,
        title: 'Test PR',
        url: 'https://github.com/org/repo/pull/123',
        author: { login: 'dev' },
        mergedAt: '2024-01-01T00:00:00Z',
        additions: 150,
        deletions: 75,
        files: new Array(10),
        body: 'PR body',
        headRefName: 'feature/test'
      });
      
      const result = await service.enrichPRData(prs);
      
      expect(result[0]).toMatchObject({
        additions: 150,
        deletions: 75,
        filesChanged: 10
      });
    });

    test('should skip enrichment if data already present', async () => {
      const prs = [{
        id: 'org/repo#123',
        number: 123,
        title: 'Test PR',
        url: 'https://github.com/org/repo/pull/123',
        author: 'dev',
        mergedAt: '2024-01-01T00:00:00Z',
        additions: 100,
        deletions: 50,
        filesChanged: 5,
        linkedIssues: ['ENG-123'],
        confidence: 0.8
      }];
      
      const result = await service.enrichPRData(prs);
      
      expect(mockGitHubCLI.getPRDetails).not.toHaveBeenCalled();
      expect(result).toEqual(prs);
    });
  });
});