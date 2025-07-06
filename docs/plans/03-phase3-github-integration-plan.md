# Phase 3: GitHub Integration & Correlation Engine - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for integrating GitHub API, extracting PR and commit data, and building the correlation engine to link GitHub activity with Linear issues. Execute each step sequentially after completing Phase 2.

## Prerequisites
- Phase 1 completed (type definitions, API foundation)
- Phase 2 completed (Linear integration for issue data)
- GitHub OAuth app created with proper permissions
- Database schema from Phase 1

## Step 1: GitHub OAuth Implementation

### Action 1.1: Create GitHub OAuth Configuration
Create file: `src/config/github.config.ts`
```typescript
export interface GitHubConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiUrl: string;
  graphqlUrl: string;
  webhookSecret?: string;
  scopes: string[];
}

export const getGitHubConfig = (): GitHubConfig => ({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/auth/github/callback',
  apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  graphqlUrl: process.env.GITHUB_GRAPHQL_URL || 'https://api.github.com/graphql',
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
  scopes: ['repo', 'read:user', 'read:org']
});
```

### Action 1.2: Create GitHub OAuth Service
Create file: `src/services/auth/githubAuth.service.ts`
```typescript
import axios from 'axios';
import { getGitHubConfig } from '../../config/github.config';
import { DatabaseService } from '../database.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export class GitHubAuthService {
  private config = getGitHubConfig();
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    tokenType: string;
    scope: string;
  }> {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type,
        scope: response.data.scope
      };
    } catch (error: any) {
      logger.error('Failed to exchange GitHub code for token:', error);
      throw new AppError(400, 'Failed to authenticate with GitHub', 'GITHUB_AUTH_FAILED');
    }
  }

  async saveToken(userId: string, accessToken: string, scope: string): Promise<void> {
    await this.db.query(`
      INSERT INTO oauth_tokens (service, user_id, access_token, scopes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (service, user_id) 
      DO UPDATE SET 
        access_token = $3,
        scopes = $4,
        updated_at = CURRENT_TIMESTAMP
    `, ['github', userId, accessToken, scope.split(' ')]);
  }

  async getValidToken(userId: string): Promise<string | null> {
    const result = await this.db.query(`
      SELECT access_token 
      FROM oauth_tokens 
      WHERE service = $1 AND user_id = $2
    `, ['github', userId]);

    return result.rows[0]?.access_token || null;
  }

  async getUserInfo(accessToken: string): Promise<{
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      return {
        login: response.data.login,
        name: response.data.name || response.data.login,
        email: response.data.email,
        avatarUrl: response.data.avatar_url
      };
    } catch (error) {
      logger.error('Failed to fetch GitHub user info:', error);
      throw new AppError(500, 'Failed to fetch user information from GitHub');
    }
  }

  async revokeToken(userId: string): Promise<void> {
    await this.db.query(`
      DELETE FROM oauth_tokens 
      WHERE service = $1 AND user_id = $2
    `, ['github', userId]);
  }
}
```

### Action 1.3: Create GitHub Auth Controller
Create file: `src/controllers/auth/github.controller.ts`
```typescript
import { Request, Response } from 'express';
import crypto from 'crypto';
import { GitHubAuthService } from '../../services/auth/githubAuth.service';
import { AppError } from '../../middleware/error.middleware';
import { DatabaseService } from '../../services/database.service';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class GitHubAuthController {
  private githubAuth: GitHubAuthService;
  private db: DatabaseService;
  private stateStore: Map<string, { userId: string; timestamp: number }>;

  constructor() {
    this.githubAuth = new GitHubAuthService();
    this.db = new DatabaseService();
    this.stateStore = new Map();
    
    // Clean up old state entries every hour
    setInterval(() => this.cleanupStateStore(), 3600000);
  }

  initiateOAuth = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const state = crypto.randomBytes(32).toString('hex');
    this.stateStore.set(state, {
      userId: req.user.id,
      timestamp: Date.now()
    });

    const authUrl = this.githubAuth.getAuthorizationUrl(state);
    res.json({
      success: true,
      data: { authUrl }
    });
  };

  handleCallback = async (req: Request, res: Response): Promise<void> => {
    const { code, state } = req.query;

    if (!code || !state) {
      throw new AppError(400, 'Missing code or state parameter');
    }

    const stateData = this.stateStore.get(state as string);
    if (!stateData) {
      throw new AppError(400, 'Invalid state parameter');
    }

    this.stateStore.delete(state as string);

    // Check if state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 300000) {
      throw new AppError(400, 'State parameter expired');
    }

    const { accessToken, scope } = await this.githubAuth.exchangeCodeForToken(
      code as string
    );

    // Get user info and update engineer record
    const userInfo = await this.githubAuth.getUserInfo(accessToken);
    
    await this.db.query(`
      UPDATE engineers 
      SET github_username = $1 
      WHERE id = $2
    `, [userInfo.login, stateData.userId]);

    await this.githubAuth.saveToken(stateData.userId, accessToken, scope);

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?github=connected`);
  };

  disconnect = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    await this.githubAuth.revokeToken(req.user.id);

    res.json({
      success: true,
      data: { message: 'GitHub disconnected successfully' }
    });
  };

  checkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const token = await this.githubAuth.getValidToken(req.user.id);

    res.json({
      success: true,
      data: {
        connected: !!token,
        scopes: token ? this.config.scopes : []
      }
    });
  };

  private cleanupStateStore(): void {
    const fiveMinutesAgo = Date.now() - 300000;
    for (const [state, data] of this.stateStore.entries()) {
      if (data.timestamp < fiveMinutesAgo) {
        this.stateStore.delete(state);
      }
    }
  }
}
```

## Step 2: GitHub API Client

### Action 2.1: Create GitHub REST Client
Create file: `src/services/github/githubClient.ts`
```typescript
import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import { getGitHubConfig } from '../../config/github.config';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

export class GitHubClient {
  private octokit: Octokit;
  private graphqlClient: typeof graphql;
  private config = getGitHubConfig();

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      baseUrl: this.config.apiUrl,
      timeZone: 'UTC',
      throttle: {
        onRateLimit: (retryAfter: number, options: any) => {
          logger.warn(`GitHub rate limit hit, retrying after ${retryAfter} seconds`);
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any) => {
          logger.warn(`GitHub secondary rate limit hit`);
          return false;
        }
      }
    });

    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${accessToken}`
      }
    });
  }

  async getPullRequests(
    owner: string,
    repo: string,
    options: {
      state?: 'open' | 'closed' | 'all';
      since?: Date;
      page?: number;
      perPage?: number;
    } = {}
  ) {
    try {
      const response = await this.octokit.pulls.list({
        owner,
        repo,
        state: options.state || 'all',
        sort: 'updated',
        direction: 'desc',
        page: options.page || 1,
        per_page: options.perPage || 100
      });

      return response.data;
    } catch (error: any) {
      if (error.status === 404) {
        throw new AppError(404, 'Repository not found', 'REPO_NOT_FOUND');
      }
      throw new AppError(500, 'Failed to fetch pull requests', 'GITHUB_API_ERROR', error);
    }
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number) {
    try {
      const response = await this.octokit.pulls.get({
        owner,
        repo,
        pull_number: pullNumber
      });

      return response.data;
    } catch (error) {
      throw new AppError(500, 'Failed to fetch pull request', 'GITHUB_API_ERROR', error);
    }
  }

  async getPullRequestCommits(owner: string, repo: string, pullNumber: number) {
    try {
      const response = await this.octokit.pulls.listCommits({
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 250
      });

      return response.data;
    } catch (error) {
      throw new AppError(500, 'Failed to fetch commits', 'GITHUB_API_ERROR', error);
    }
  }

  async getRepositories(org: string) {
    try {
      const response = await this.octokit.repos.listForOrg({
        org,
        type: 'all',
        sort: 'updated',
        per_page: 100
      });

      return response.data;
    } catch (error) {
      throw new AppError(500, 'Failed to fetch repositories', 'GITHUB_API_ERROR', error);
    }
  }

  async searchIssuesAndPRs(query: string) {
    try {
      const response = await this.octokit.search.issuesAndPullRequests({
        q: query,
        sort: 'updated',
        order: 'desc',
        per_page: 100
      });

      return response.data;
    } catch (error) {
      throw new AppError(500, 'Failed to search', 'GITHUB_API_ERROR', error);
    }
  }

  async getUserActivity(username: string, since: Date) {
    const query = `
      query GetUserActivity($username: String!, $since: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $since) {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalIssueContributions
            pullRequestContributions(first: 100) {
              nodes {
                pullRequest {
                  number
                  title
                  state
                  createdAt
                  mergedAt
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            pullRequestReviewContributions(first: 100) {
              nodes {
                pullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                pullRequestReview {
                  state
                  submittedAt
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.graphqlClient(query, { username, since: since.toISOString() });
      return response.user.contributionsCollection;
    } catch (error) {
      logger.error('Failed to fetch user activity:', error);
      throw new AppError(500, 'Failed to fetch user activity', 'GITHUB_API_ERROR', error);
    }
  }
}
```

## Step 3: PR-to-Issue Correlation Engine

### Action 3.1: Create Correlation Service
Create file: `src/services/correlation/correlationEngine.ts`
```typescript
import { GitHubPullRequest } from '../../types/github.types';
import { LinearIssue } from '../../types/linear.types';
import { DatabaseService } from '../database.service';
import { logger } from '../../utils/logger';

export interface CorrelationMatch {
  pullRequest: GitHubPullRequest;
  issue: LinearIssue;
  confidence: number;
  matchType: 'exact' | 'branch' | 'title' | 'body' | 'manual';
  matchDetails: string;
}

export class CorrelationEngine {
  private db: DatabaseService;
  
  // Linear issue identifier patterns
  private linearPatterns = [
    /\b([A-Z]{2,}-\d+)\b/g,  // Standard Linear format: ABC-123
    /linear\.app\/.*\/issue\/([A-Z]{2,}-\d+)/g,  // Linear URLs
    /(?:fixes?|closes?|resolves?)\s+([A-Z]{2,}-\d+)/gi  // Closing keywords
  ];

  constructor() {
    this.db = new DatabaseService();
  }

  async correlatePullRequest(
    pr: GitHubPullRequest,
    issues: LinearIssue[]
  ): Promise<CorrelationMatch[]> {
    const matches: CorrelationMatch[] = [];

    // 1. Check for exact Linear issue ID in PR title or body
    const exactMatches = this.findLinearReferences(pr);
    for (const issueId of exactMatches) {
      const issue = issues.find(i => i.identifier === issueId);
      if (issue) {
        matches.push({
          pullRequest: pr,
          issue,
          confidence: 1.0,
          matchType: 'exact',
          matchDetails: `Found ${issueId} in PR`
        });
      }
    }

    // 2. Check branch name correlation
    if (pr.headRef && matches.length === 0) {
      const branchMatch = this.matchBranchToIssue(pr.headRef, issues);
      if (branchMatch) {
        matches.push({
          pullRequest: pr,
          issue: branchMatch,
          confidence: 0.9,
          matchType: 'branch',
          matchDetails: `Branch name contains ${branchMatch.identifier}`
        });
      }
    }

    // 3. Fuzzy title matching
    if (matches.length === 0) {
      const titleMatch = this.fuzzyMatchTitle(pr.title, issues);
      if (titleMatch) {
        matches.push({
          pullRequest: pr,
          issue: titleMatch.issue,
          confidence: titleMatch.confidence,
          matchType: 'title',
          matchDetails: 'Similar title content'
        });
      }
    }

    // 4. Check for manual correlations
    const manualMatch = await this.getManualCorrelation(pr);
    if (manualMatch) {
      const issue = issues.find(i => i.id === manualMatch.issueId);
      if (issue) {
        matches.push({
          pullRequest: pr,
          issue,
          confidence: 1.0,
          matchType: 'manual',
          matchDetails: 'Manually correlated'
        });
      }
    }

    // Store correlations
    for (const match of matches) {
      await this.storeCorrelation(match);
    }

    return matches;
  }

  private findLinearReferences(pr: GitHubPullRequest): string[] {
    const references = new Set<string>();
    const searchText = `${pr.title} ${pr.body || ''}`;

    for (const pattern of this.linearPatterns) {
      const matches = searchText.matchAll(pattern);
      for (const match of matches) {
        references.add(match[1].toUpperCase());
      }
    }

    // Also check for references in commit messages
    if (pr.linkedIssues) {
      for (const linkedIssue of pr.linkedIssues) {
        for (const pattern of this.linearPatterns) {
          const matches = linkedIssue.matchAll(pattern);
          for (const match of matches) {
            references.add(match[1].toUpperCase());
          }
        }
      }
    }

    return Array.from(references);
  }

  private matchBranchToIssue(branchName: string, issues: LinearIssue[]): LinearIssue | null {
    const normalizedBranch = branchName.toLowerCase();

    for (const issue of issues) {
      // Check if branch contains issue identifier
      if (normalizedBranch.includes(issue.identifier.toLowerCase())) {
        return issue;
      }

      // Check if issue has a branchName field
      if (issue.branchName && normalizedBranch === issue.branchName.toLowerCase()) {
        return issue;
      }

      // Check common branch patterns
      const patterns = [
        `${issue.identifier.toLowerCase()}-`,
        `${issue.identifier.toLowerCase()}/`,
        `-${issue.identifier.toLowerCase()}`,
        `/${issue.identifier.toLowerCase()}`
      ];

      if (patterns.some(pattern => normalizedBranch.includes(pattern))) {
        return issue;
      }
    }

    return null;
  }

  private fuzzyMatchTitle(
    prTitle: string, 
    issues: LinearIssue[]
  ): { issue: LinearIssue; confidence: number } | null {
    const normalizedPrTitle = this.normalizeText(prTitle);
    let bestMatch: { issue: LinearIssue; confidence: number } | null = null;

    for (const issue of issues) {
      const normalizedIssueTitle = this.normalizeText(issue.title);
      const similarity = this.calculateSimilarity(normalizedPrTitle, normalizedIssueTitle);

      if (similarity > 0.7 && (!bestMatch || similarity > bestMatch.confidence)) {
        bestMatch = { issue, confidence: similarity };
      }
    }

    return bestMatch;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' '));
    const words2 = new Set(text2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private async getManualCorrelation(pr: GitHubPullRequest): Promise<{
    issueId: string;
  } | null> {
    const result = await this.db.query(`
      SELECT linear_issue_id 
      FROM pr_issue_correlations 
      WHERE github_pr_id = $1 AND correlation_type = 'manual'
    `, [pr.id]);

    return result.rows[0] ? { issueId: result.rows[0].linear_issue_id } : null;
  }

  private async storeCorrelation(match: CorrelationMatch): Promise<void> {
    await this.db.query(`
      INSERT INTO pr_issue_correlations (
        github_pr_id, 
        linear_issue_id, 
        confidence, 
        correlation_type,
        match_details
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (github_pr_id, linear_issue_id) 
      DO UPDATE SET 
        confidence = $3,
        correlation_type = $4,
        match_details = $5,
        updated_at = CURRENT_TIMESTAMP
    `, [
      match.pullRequest.id,
      match.issue.id,
      match.confidence,
      match.matchType,
      match.matchDetails
    ]);
  }

  async addManualCorrelation(
    prId: string, 
    issueId: string, 
    userId: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO pr_issue_correlations (
        github_pr_id, 
        linear_issue_id, 
        confidence, 
        correlation_type,
        match_details,
        created_by
      ) VALUES ($1, $2, 1.0, 'manual', 'Manually correlated by user', $3)
    `, [prId, issueId, userId]);
  }

  async getCorrelationsForPR(prId: string): Promise<CorrelationMatch[]> {
    const result = await this.db.query(`
      SELECT 
        pic.*,
        li.identifier,
        li.title as issue_title
      FROM pr_issue_correlations pic
      JOIN cache_entries ce ON ce.cache_key LIKE '%' || pic.linear_issue_id || '%'
      WHERE pic.github_pr_id = $1
      ORDER BY pic.confidence DESC
    `, [prId]);

    // Transform to CorrelationMatch format
    return result.rows.map(row => ({
      pullRequest: { id: row.github_pr_id } as GitHubPullRequest,
      issue: { 
        id: row.linear_issue_id,
        identifier: row.identifier,
        title: row.issue_title
      } as LinearIssue,
      confidence: row.confidence,
      matchType: row.correlation_type,
      matchDetails: row.match_details
    }));
  }
}
```

### Action 3.2: Update Database Schema for Correlations
Create file: `src/database/migrations/003_add_correlations.sql`
```sql
-- PR to Issue correlation table
CREATE TABLE pr_issue_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_pr_id VARCHAR(255) NOT NULL,
  linear_issue_id VARCHAR(255) NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  correlation_type VARCHAR(50) NOT NULL,
  match_details TEXT,
  created_by UUID REFERENCES engineers(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(github_pr_id, linear_issue_id)
);

-- Indexes for correlation queries
CREATE INDEX idx_correlations_pr ON pr_issue_correlations(github_pr_id);
CREATE INDEX idx_correlations_issue ON pr_issue_correlations(linear_issue_id);
CREATE INDEX idx_correlations_confidence ON pr_issue_correlations(confidence DESC);

-- GitHub repository tracking
CREATE TABLE github_repositories (
  id VARCHAR(255) PRIMARY KEY,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  description TEXT,
  private BOOLEAN DEFAULT false,
  default_branch VARCHAR(255),
  url VARCHAR(500),
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_repos_team ON github_repositories(team_id);
CREATE INDEX idx_repos_full_name ON github_repositories(full_name);
```

## Step 4: GitHub Data Service

### Action 4.1: Create GitHub Data Service
Create file: `src/services/github/githubData.service.ts`
```typescript
import { GitHubClient } from './githubClient';
import { GitHubAuthService } from '../auth/githubAuth.service';
import { CorrelationEngine } from '../correlation/correlationEngine';
import { LinearDataService } from '../linear/linearData.service';
import { DatabaseService } from '../database.service';
import { 
  GitHubPullRequest, 
  GitHubCommit, 
  GitHubRepository,
  GitHubUser 
} from '../../types/github.types';
import { LinearIssue } from '../../types/linear.types';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';
import { subDays, isAfter } from 'date-fns';

export interface GitHubSyncResult {
  repositories: number;
  pullRequests: number;
  correlations: number;
}

export class GitHubDataService {
  private authService: GitHubAuthService;
  private correlationEngine: CorrelationEngine;
  private linearService: LinearDataService;
  private db: DatabaseService;

  constructor() {
    this.authService = new GitHubAuthService();
    this.correlationEngine = new CorrelationEngine();
    this.linearService = new LinearDataService();
    this.db = new DatabaseService();
  }

  private async getClient(userId: string): Promise<GitHubClient> {
    const token = await this.authService.getValidToken(userId);
    if (!token) {
      throw new AppError(401, 'GitHub not connected', 'GITHUB_NOT_CONNECTED');
    }
    return new GitHubClient(token);
  }

  async getTeamRepositories(userId: string, org: string): Promise<GitHubRepository[]> {
    const client = await this.getClient(userId);
    const repos = await client.getRepositories(org);
    
    // Store repositories
    for (const repo of repos) {
      await this.storeRepository(repo);
    }

    return repos.map(this.transformRepository);
  }

  async syncRepositoryPRs(
    userId: string,
    owner: string,
    repo: string,
    since?: Date
  ): Promise<{ prs: GitHubPullRequest[]; correlations: number }> {
    const client = await this.getClient(userId);
    const prs: GitHubPullRequest[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const batch = await client.getPullRequests(owner, repo, {
        state: 'all',
        page,
        perPage: 100
      });

      // Filter by date if provided
      const filtered = since 
        ? batch.filter(pr => isAfter(new Date(pr.updated_at), since))
        : batch;

      if (filtered.length === 0 || batch.length < 100) {
        hasMore = false;
      }

      prs.push(...filtered.map(pr => this.transformPullRequest(pr, owner, repo)));
      page++;
    }

    // Get Linear issues for correlation
    const teamId = await this.getTeamIdForRepo(owner, repo);
    const linearIssues = await this.linearService.getRecentActivity(userId, teamId, 90);

    // Correlate PRs with Linear issues
    let correlationCount = 0;
    for (const pr of prs) {
      const matches = await this.correlationEngine.correlatePullRequest(pr, linearIssues);
      correlationCount += matches.length;
    }

    // Cache PR data
    await this.cachePullRequests(prs);

    return { prs, correlations: correlationCount };
  }

  async getPullRequestDetails(
    userId: string,
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<GitHubPullRequest & { commits: GitHubCommit[] }> {
    const client = await this.getClient(userId);
    
    const [pr, commits] = await Promise.all([
      client.getPullRequest(owner, repo, prNumber),
      client.getPullRequestCommits(owner, repo, prNumber)
    ]);

    const transformedPR = this.transformPullRequest(pr, owner, repo);
    const transformedCommits = commits.map(this.transformCommit);

    return {
      ...transformedPR,
      commits: transformedCommits
    };
  }

  async getEngineerActivity(
    userId: string,
    githubUsername: string,
    since: Date
  ): Promise<{
    pullRequests: GitHubPullRequest[];
    commits: number;
    reviews: number;
  }> {
    const client = await this.getClient(userId);
    const activity = await client.getUserActivity(githubUsername, since);

    // Transform PR contributions
    const pullRequests = activity.pullRequestContributions.nodes.map(node => ({
      number: node.pullRequest.number,
      title: node.pullRequest.title,
      state: node.pullRequest.state.toLowerCase() as any,
      repository: node.pullRequest.repository.nameWithOwner,
      createdAt: new Date(node.pullRequest.createdAt),
      mergedAt: node.pullRequest.mergedAt ? new Date(node.pullRequest.mergedAt) : undefined
    })) as GitHubPullRequest[];

    return {
      pullRequests,
      commits: activity.totalCommitContributions,
      reviews: activity.totalPullRequestReviewContributions
    };
  }

  async searchForLinearReferences(
    userId: string,
    linearIssueId: string
  ): Promise<GitHubPullRequest[]> {
    const client = await this.getClient(userId);
    
    // Search for PRs that mention the Linear issue
    const searchResults = await client.searchIssuesAndPRs(`${linearIssueId} is:pr`);
    
    const prs: GitHubPullRequest[] = [];
    for (const item of searchResults.items) {
      if (item.pull_request) {
        // Extract owner and repo from URL
        const match = item.repository_url.match(/repos\/(.+)\/(.+)$/);
        if (match) {
          const [, owner, repo] = match;
          const pr = await client.getPullRequest(owner, repo, item.number);
          prs.push(this.transformPullRequest(pr, owner, repo));
        }
      }
    }

    return prs;
  }

  async syncTeamActivity(
    userId: string,
    teamId: string,
    repositories: string[]
  ): Promise<GitHubSyncResult> {
    logger.info(`Starting GitHub sync for team ${teamId}`);
    
    let totalPRs = 0;
    let totalCorrelations = 0;

    try {
      // Update sync status
      await this.updateSyncStatus(teamId, 'in_progress');

      // Sync each repository
      for (const repoFullName of repositories) {
        const [owner, repo] = repoFullName.split('/');
        const { prs, correlations } = await this.syncRepositoryPRs(
          userId,
          owner,
          repo,
          subDays(new Date(), 90) // Sync last 90 days
        );
        
        totalPRs += prs.length;
        totalCorrelations += correlations;
      }

      // Update sync status
      await this.updateSyncStatus(teamId, 'completed');

      logger.info(`GitHub sync completed for team ${teamId}`, {
        repositories: repositories.length,
        pullRequests: totalPRs,
        correlations: totalCorrelations
      });

      return {
        repositories: repositories.length,
        pullRequests: totalPRs,
        correlations: totalCorrelations
      };

    } catch (error) {
      await this.updateSyncStatus(teamId, 'failed', error);
      throw error;
    }
  }

  private transformRepository(repo: any): GitHubRepository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch,
      url: repo.html_url,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at)
    };
  }

  private transformPullRequest(pr: any, owner: string, repo: string): GitHubPullRequest {
    return {
      id: pr.id.toString(),
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state === 'open' ? 'open' : pr.merged ? 'merged' : 'closed',
      author: this.transformUser(pr.user),
      assignees: pr.assignees.map(this.transformUser),
      reviewers: pr.requested_reviewers.map(this.transformUser),
      labels: pr.labels.map((label: any) => ({
        id: label.id.toString(),
        name: label.name,
        color: label.color,
        description: label.description
      })),
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      draft: pr.draft,
      mergeable: pr.mergeable,
      merged: pr.merged,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      url: pr.html_url,
      repository: {
        id: pr.base.repo.id.toString(),
        name: pr.base.repo.name,
        fullName: pr.base.repo.full_name,
        description: pr.base.repo.description,
        private: pr.base.repo.private,
        defaultBranch: pr.base.repo.default_branch,
        url: pr.base.repo.html_url
      },
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at)
    };
  }

  private transformUser(user: any): GitHubUser {
    return {
      id: user.id.toString(),
      login: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      type: user.type
    };
  }

  private transformCommit(commit: any): GitHubCommit {
    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.author ? this.transformUser(commit.author) : {
        id: 'unknown',
        login: commit.commit.author.name,
        name: commit.commit.author.name,
        email: commit.commit.author.email,
        type: 'User'
      },
      committedDate: new Date(commit.commit.author.date),
      additions: commit.stats?.additions || 0,
      deletions: commit.stats?.deletions || 0,
      changedFiles: commit.files?.length || 0,
      url: commit.html_url
    };
  }

  private async storeRepository(repo: any): Promise<void> {
    await this.db.query(`
      INSERT INTO github_repositories (
        id, owner, name, full_name, description, 
        private, default_branch, url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) 
      DO UPDATE SET 
        description = $5,
        default_branch = $7,
        updated_at = CURRENT_TIMESTAMP
    `, [
      repo.id.toString(),
      repo.owner.login,
      repo.name,
      repo.full_name,
      repo.description,
      repo.private,
      repo.default_branch,
      repo.html_url
    ]);
  }

  private async cachePullRequests(prs: GitHubPullRequest[]): Promise<void> {
    const cacheKey = `github_prs_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await this.db.query(`
      INSERT INTO cache_entries (cache_key, cache_value, expires_at)
      VALUES ($1, $2, $3)
    `, [cacheKey, JSON.stringify(prs), expiresAt]);
  }

  private async getTeamIdForRepo(owner: string, repo: string): Promise<string> {
    const result = await this.db.query(`
      SELECT team_id 
      FROM github_repositories 
      WHERE owner = $1 AND name = $2
    `, [owner, repo]);

    if (!result.rows[0]?.team_id) {
      // Default team lookup or configuration needed
      throw new AppError(404, 'Team not found for repository');
    }

    return result.rows[0].team_id;
  }

  private async updateSyncStatus(
    teamId: string,
    status: 'in_progress' | 'completed' | 'failed',
    error?: any
  ): Promise<void> {
    const repository = 'team'; // Could be specific repo

    if (status === 'completed') {
      await this.db.query(`
        INSERT INTO github_sync_status (
          repository_id, last_sync_at, last_successful_sync_at
        ) VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (repository_id) 
        DO UPDATE SET 
          last_sync_at = CURRENT_TIMESTAMP,
          last_successful_sync_at = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [repository]);
    } else if (status === 'failed') {
      await this.db.query(`
        INSERT INTO github_sync_status (
          repository_id, last_sync_at, error_message
        ) VALUES ($1, CURRENT_TIMESTAMP, $2)
        ON CONFLICT (repository_id) 
        DO UPDATE SET 
          last_sync_at = CURRENT_TIMESTAMP,
          error_message = $2,
          updated_at = CURRENT_TIMESTAMP
      `, [repository, error?.message || 'Unknown error']);
    }
  }
}
```

## Step 5: Webhook Handler for GitHub

### Action 5.1: Create GitHub Webhook Service
Create file: `src/services/github/githubWebhook.service.ts`
```typescript
import crypto from 'crypto';
import { Request } from 'express';
import { getGitHubConfig } from '../../config/github.config';
import { CorrelationEngine } from '../correlation/correlationEngine';
import { LinearDataService } from '../linear/linearData.service';
import { DatabaseService } from '../database.service';
import { logger } from '../../utils/logger';

interface GitHubWebhookPayload {
  action: string;
  repository: any;
  pull_request?: any;
  issue?: any;
  sender: any;
}

export class GitHubWebhookService {
  private config = getGitHubConfig();
  private correlationEngine: CorrelationEngine;
  private linearService: LinearDataService;
  private db: DatabaseService;

  constructor() {
    this.correlationEngine = new CorrelationEngine();
    this.linearService = new LinearDataService();
    this.db = new DatabaseService();
  }

  verifyWebhookSignature(req: Request): boolean {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature || !this.config.webhookSecret) {
      return false;
    }

    const hash = `sha256=${crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex')}`;

    return signature === hash;
  }

  async processWebhook(
    event: string,
    payload: GitHubWebhookPayload
  ): Promise<void> {
    logger.info('Processing GitHub webhook', { event, action: payload.action });

    switch (event) {
      case 'pull_request':
        await this.handlePullRequestEvent(payload);
        break;
      case 'pull_request_review':
        await this.handlePullRequestReviewEvent(payload);
        break;
      case 'push':
        await this.handlePushEvent(payload);
        break;
      default:
        logger.debug(`Ignoring webhook event: ${event}`);
    }
  }

  private async handlePullRequestEvent(payload: GitHubWebhookPayload): Promise<void> {
    const pr = payload.pull_request;
    
    if (!pr) return;

    // Handle different PR actions
    switch (payload.action) {
      case 'opened':
      case 'edited':
      case 'synchronize':
        // Try to correlate with Linear issues
        await this.correlatePullRequest(pr);
        break;
      
      case 'closed':
        if (pr.merged) {
          await this.handleMergedPR(pr);
        }
        break;
    }

    // Invalidate caches
    await this.invalidatePRCache(pr.id);
  }

  private async handlePullRequestReviewEvent(payload: GitHubWebhookPayload): Promise<void> {
    // Log review activity for metrics
    logger.info('PR review event', {
      action: payload.action,
      prNumber: payload.pull_request?.number,
      reviewer: payload.sender.login
    });
  }

  private async handlePushEvent(payload: any): Promise<void> {
    // Could implement commit tracking here
    logger.debug('Push event received', {
      repository: payload.repository.full_name,
      commits: payload.commits?.length
    });
  }

  private async correlatePullRequest(pr: any): Promise<void> {
    try {
      // Get team ID from repository
      const teamId = await this.getTeamIdForRepo(
        pr.base.repo.owner.login,
        pr.base.repo.name
      );

      // Get recent Linear issues
      // Note: This requires a system token or stored user token
      const issues = await this.getRecentLinearIssues(teamId);

      // Transform PR to our format
      const transformedPR = {
        id: pr.id.toString(),
        number: pr.number,
        title: pr.title,
        body: pr.body,
        headRef: pr.head.ref,
        linkedIssues: [] // Would need to extract from commits
      } as any;

      // Run correlation
      await this.correlationEngine.correlatePullRequest(transformedPR, issues);

    } catch (error) {
      logger.error('Failed to correlate PR from webhook', error);
    }
  }

  private async handleMergedPR(pr: any): Promise<void> {
    // Update any correlated Linear issues
    const correlations = await this.correlationEngine.getCorrelationsForPR(
      pr.id.toString()
    );

    for (const correlation of correlations) {
      logger.info('PR merged, updating Linear issue', {
        prNumber: pr.number,
        issueId: correlation.issue.identifier
      });
      
      // Could update Linear issue state or add comment
      // This would require Linear API integration
    }
  }

  private async invalidatePRCache(prId: string): Promise<void> {
    await this.db.query(`
      DELETE FROM cache_entries 
      WHERE cache_key LIKE '%${prId}%'
    `);
  }

  private async getTeamIdForRepo(owner: string, repo: string): Promise<string> {
    const result = await this.db.query(`
      SELECT team_id 
      FROM github_repositories 
      WHERE owner = $1 AND name = $2
    `, [owner, repo]);

    if (!result.rows[0]?.team_id) {
      throw new Error('Team not found for repository');
    }

    return result.rows[0].team_id;
  }

  private async getRecentLinearIssues(teamId: string): Promise<any[]> {
    // This is a simplified version - in production you'd need
    // proper authentication and error handling
    const result = await this.db.query(`
      SELECT cache_value 
      FROM cache_entries 
      WHERE cache_key LIKE 'issues_%' 
      AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows[0]) {
      return JSON.parse(result.rows[0].cache_value);
    }

    return [];
  }
}
```

### Action 5.2: Create GitHub Webhook Controller
Create file: `src/controllers/webhook/github.controller.ts`
```typescript
import { Request, Response } from 'express';
import { GitHubWebhookService } from '../../services/github/githubWebhook.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export class GitHubWebhookController {
  private webhookService: GitHubWebhookService;

  constructor() {
    this.webhookService = new GitHubWebhookService();
  }

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const event = req.headers['x-github-event'] as string;
    
    if (!event) {
      throw new AppError(400, 'Missing X-GitHub-Event header');
    }

    // Verify webhook signature
    if (!this.webhookService.verifyWebhookSignature(req)) {
      logger.warn('Invalid GitHub webhook signature');
      throw new AppError(401, 'Invalid webhook signature');
    }

    try {
      // Process webhook asynchronously
      setImmediate(() => {
        this.webhookService.processWebhook(event, req.body).catch(error => {
          logger.error('Failed to process GitHub webhook:', error);
        });
      });

      // Respond immediately
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Error handling GitHub webhook:', error);
      throw new AppError(500, 'Failed to process webhook');
    }
  };
}
```

## Step 6: Update Dashboard Service with GitHub Data

### Action 6.1: Update Dashboard Service
Update file: `src/services/dashboard/dashboard.service.ts`
Add the following methods:
```typescript
import { GitHubDataService } from '../github/githubData.service';
import { CorrelationEngine } from '../correlation/correlationEngine';

// Add to constructor
private githubService: GitHubDataService;
private correlationEngine: CorrelationEngine;

constructor() {
  // ... existing code
  this.githubService = new GitHubDataService();
  this.correlationEngine = new CorrelationEngine();
}

// Update getTeamActivity method to include GitHub data
async getTeamActivity(
  userId: string,
  teamId: string,
  filter: DashboardFilter
): Promise<EngineerActivity[]> {
  // ... existing Linear code ...

  // Fetch GitHub data for each engineer
  for (const [engineerId, activity of activitiesByEngineer.entries()) {
    const engineer = activity.engineer;
    
    if (engineer.githubUsername) {
      try {
        const githubActivity = await this.githubService.getEngineerActivity(
          userId,
          engineer.githubUsername,
          timeRange.start
        );

        // Update activity with GitHub data
        activity.pullRequests = githubActivity.pullRequests;
        activity.metrics.pullRequestsMerged = githubActivity.pullRequests
          .filter(pr => pr.state === 'merged').length;
        activity.metrics.pullRequestsOpen = githubActivity.pullRequests
          .filter(pr => pr.state === 'open').length;
        activity.metrics.reviewsGiven = githubActivity.reviews;

        // Correlate PRs with issues
        for (const pr of activity.pullRequests) {
          const correlations = await this.correlationEngine.getCorrelationsForPR(pr.id);
          // Add correlation data to PR or activity
        }
      } catch (error) {
        logger.warn(`Failed to fetch GitHub data for ${engineer.githubUsername}`, error);
      }
    }
  }

  return Array.from(activitiesByEngineer.values());
}

// Add method to get PR details with correlations
async getPullRequestWithIssue(
  userId: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{
  pullRequest: GitHubPullRequest;
  correlatedIssue?: LinearIssue;
  confidence?: number;
}> {
  const pr = await this.githubService.getPullRequestDetails(
    userId,
    owner,
    repo,
    prNumber
  );

  const correlations = await this.correlationEngine.getCorrelationsForPR(pr.id);
  
  if (correlations.length > 0) {
    const bestMatch = correlations[0];
    return {
      pullRequest: pr,
      correlatedIssue: bestMatch.issue,
      confidence: bestMatch.confidence
    };
  }

  return { pullRequest: pr };
}

// Add manual correlation endpoint
async createManualCorrelation(
  userId: string,
  prId: string,
  issueId: string
): Promise<void> {
  await this.correlationEngine.addManualCorrelation(prId, issueId, userId);
}
```

## Step 7: API Routes for GitHub Integration

### Action 7.1: Update Auth Routes
Add to `src/routes/auth.routes.ts`:
```typescript
import { GitHubAuthController } from '../controllers/auth/github.controller';

const githubAuthController = new GitHubAuthController();

// GitHub OAuth routes
authRouter.get('/github', authenticate, asyncHandler(githubAuthController.initiateOAuth));
authRouter.get('/github/callback', asyncHandler(githubAuthController.handleCallback));
authRouter.post('/github/disconnect', authenticate, asyncHandler(githubAuthController.disconnect));
authRouter.get('/github/status', authenticate, asyncHandler(githubAuthController.checkStatus));
```

### Action 7.2: Create GitHub Routes
Create file: `src/routes/github.routes.ts`
```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { GitHubController } from '../controllers/github.controller';

export const githubRouter = Router();
const githubController = new GitHubController();

// All GitHub routes require authentication
githubRouter.use(authenticate);

// Repository management
githubRouter.get('/orgs/:org/repos', 
  asyncHandler(githubController.getOrgRepositories)
);

// Pull request endpoints
githubRouter.get('/repos/:owner/:repo/pulls', 
  asyncHandler(githubController.getPullRequests)
);

githubRouter.get('/repos/:owner/:repo/pulls/:prNumber', 
  asyncHandler(githubController.getPullRequestDetails)
);

// Sync endpoints
githubRouter.post('/repos/:owner/:repo/sync', 
  asyncHandler(githubController.syncRepository)
);

// Correlation endpoints
githubRouter.post('/correlations', 
  asyncHandler(githubController.createCorrelation)
);

githubRouter.get('/correlations/pr/:prId', 
  asyncHandler(githubController.getCorrelations)
);
```

### Action 7.3: Create GitHub Controller
Create file: `src/controllers/github.controller.ts`
```typescript
import { Request, Response } from 'express';
import { GitHubDataService } from '../services/github/githubData.service';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { AppError } from '../middleware/error.middleware';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class GitHubController {
  private githubService: GitHubDataService;
  private dashboardService: DashboardService;

  constructor() {
    this.githubService = new GitHubDataService();
    this.dashboardService = new DashboardService();
  }

  getOrgRepositories = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { org } = req.params;
    const repos = await this.githubService.getTeamRepositories(req.user.id, org);

    res.json({
      success: true,
      data: repos
    });
  };

  getPullRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { owner, repo } = req.params;
    const { state, since } = req.query;

    const { prs } = await this.githubService.syncRepositoryPRs(
      req.user.id,
      owner,
      repo,
      since ? new Date(since as string) : undefined
    );

    res.json({
      success: true,
      data: prs
    });
  };

  getPullRequestDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { owner, repo, prNumber } = req.params;

    const result = await this.dashboardService.getPullRequestWithIssue(
      req.user.id,
      owner,
      repo,
      parseInt(prNumber)
    );

    res.json({
      success: true,
      data: result
    });
  };

  syncRepository = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { owner, repo } = req.params;
    
    const result = await this.githubService.syncRepositoryPRs(
      req.user.id,
      owner,
      repo
    );

    res.json({
      success: true,
      data: {
        message: 'Repository sync completed',
        pullRequestsSynced: result.prs.length,
        correlationsFound: result.correlations
      }
    });
  };

  createCorrelation = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { prId, issueId } = req.body;

    if (!prId || !issueId) {
      throw new AppError(400, 'Missing prId or issueId');
    }

    await this.dashboardService.createManualCorrelation(
      req.user.id,
      prId,
      issueId
    );

    res.json({
      success: true,
      data: { message: 'Correlation created successfully' }
    });
  };

  getCorrelations = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { prId } = req.params;
    
    const correlations = await this.correlationEngine.getCorrelationsForPR(prId);

    res.json({
      success: true,
      data: correlations
    });
  };
}
```

## Step 8: Testing

### Action 8.1: Create Correlation Engine Tests
Create file: `tests/unit/services/correlationEngine.test.ts`
```typescript
import { CorrelationEngine } from '../../../src/services/correlation/correlationEngine';
import { GitHubPullRequest } from '../../../src/types/github.types';
import { LinearIssue } from '../../../src/types/linear.types';

describe('Correlation Engine', () => {
  let engine: CorrelationEngine;

  beforeEach(() => {
    engine = new CorrelationEngine();
  });

  describe('correlatePullRequest', () => {
    it('should find exact Linear issue reference in PR title', async () => {
      const pr: Partial<GitHubPullRequest> = {
        id: '123',
        title: 'Fix: ABC-123 - Update user authentication',
        body: 'This fixes the login issue',
        headRef: 'fix/update-auth'
      };

      const issues: Partial<LinearIssue>[] = [
        {
          id: 'issue-1',
          identifier: 'ABC-123',
          title: 'Update user authentication'
        }
      ];

      const matches = await engine.correlatePullRequest(
        pr as GitHubPullRequest,
        issues as LinearIssue[]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(1.0);
      expect(matches[0].matchType).toBe('exact');
      expect(matches[0].issue.identifier).toBe('ABC-123');
    });

    it('should match by branch name', async () => {
      const pr: Partial<GitHubPullRequest> = {
        id: '124',
        title: 'Update authentication flow',
        headRef: 'feature/ABC-124-auth-update'
      };

      const issues: Partial<LinearIssue>[] = [
        {
          id: 'issue-2',
          identifier: 'ABC-124',
          title: 'Improve authentication'
        }
      ];

      const matches = await engine.correlatePullRequest(
        pr as GitHubPullRequest,
        issues as LinearIssue[]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBe(0.9);
      expect(matches[0].matchType).toBe('branch');
    });

    it('should perform fuzzy title matching', async () => {
      const pr: Partial<GitHubPullRequest> = {
        id: '125',
        title: 'Implement user profile settings page',
        headRef: 'feature/profile-settings'
      };

      const issues: Partial<LinearIssue>[] = [
        {
          id: 'issue-3',
          identifier: 'ABC-125',
          title: 'User profile settings implementation'
        }
      ];

      const matches = await engine.correlatePullRequest(
        pr as GitHubPullRequest,
        issues as LinearIssue[]
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].confidence).toBeGreaterThan(0.7);
      expect(matches[0].matchType).toBe('title');
    });
  });
});
```

## Step 9: Update Dependencies

### Action 9.1: Update package.json
Add to dependencies:
```json
{
  "dependencies": {
    "@octokit/rest": "^19.0.13",
    "@octokit/graphql": "^5.0.6"
  }
}
```

## Step 10: Update Server Routes

### Action 10.1: Update server.ts
Add GitHub routes:
```typescript
import { githubRouter } from './routes/github.routes';

// Add after other routes
app.use('/api/github', githubRouter);

// Update webhook routes
app.use('/api/webhooks', webhookRouter);
```

## Completion Checklist

Upon completing Phase 3:

1. ✓ GitHub OAuth flow implemented
2. ✓ GitHub API client with REST and GraphQL
3. ✓ PR and commit data extraction
4. ✓ Correlation engine for PR-to-issue matching
5. ✓ Manual correlation override capability
6. ✓ GitHub webhook handler
7. ✓ Integration with dashboard service
8. ✓ API endpoints for GitHub data
9. ✓ Test coverage for correlation logic
10. ✓ Caching for GitHub data

## Verification Steps

```bash
# Install new dependencies
npm install

# Run tests
npm test

# Start server
npm run dev

# Test GitHub OAuth
# GET http://localhost:3001/api/auth/github

# Test PR correlation
# GET http://localhost:3001/api/github/repos/{owner}/{repo}/pulls
```

## Next Phase Dependencies

Phase 3 enables:
- Phase 4: Complete data for report generation
- Phase 5: Frontend can display correlated PR/issue data
- Phase 6: Performance optimization for correlation queries

## Key Implementation Notes

1. **Correlation Accuracy**: Multiple matching strategies ensure high accuracy
2. **Manual Override**: Users can correct mismatched correlations
3. **Webhook Processing**: Asynchronous processing prevents blocking
4. **Rate Limiting**: Octokit handles GitHub rate limits automatically
5. **Caching Strategy**: Reduces API calls for frequently accessed data
6. **Security**: Webhook signatures verified to prevent tampering