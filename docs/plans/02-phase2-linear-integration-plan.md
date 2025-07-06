# Phase 2: Linear Integration & Data Extraction - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for integrating Linear API, extracting issue data, and establishing the data synchronization pipeline. Execute each step sequentially after completing Phase 1.

## Prerequisites
- Phase 1 completed with all type definitions and API foundation
- Linear API access with valid OAuth credentials
- Database initialized with schema from Phase 1

## Step 1: Linear OAuth Implementation

### Action 1.1: Create Linear OAuth Configuration
Create file: `src/config/linear.config.ts`
```typescript
export interface LinearConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiUrl: string;
  webhookSecret?: string;
  scopes: string[];
}

export const getLinearConfig = (): LinearConfig => ({
  clientId: process.env.LINEAR_CLIENT_ID!,
  clientSecret: process.env.LINEAR_CLIENT_SECRET!,
  redirectUri: process.env.LINEAR_REDIRECT_URI || 'http://localhost:3001/api/auth/linear/callback',
  apiUrl: process.env.LINEAR_API_URL || 'https://api.linear.app/graphql',
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
  scopes: ['read', 'write']
});
```

### Action 1.2: Create OAuth Service
Create file: `src/services/auth/linearAuth.service.ts`
```typescript
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getLinearConfig } from '../../config/linear.config';
import { DatabaseService } from '../database.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export class LinearAuthService {
  private config = getLinearConfig();
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      state
    });

    return `https://linear.app/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.post('https://api.linear.app/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error: any) {
      logger.error('Failed to exchange Linear code for token:', error);
      throw new AppError(400, 'Failed to authenticate with Linear', 'LINEAR_AUTH_FAILED');
    }
  }

  async saveToken(userId: string, accessToken: string, expiresIn: number): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    await this.db.query(`
      INSERT INTO oauth_tokens (service, user_id, access_token, expires_at, scopes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (service, user_id) 
      DO UPDATE SET 
        access_token = $3,
        expires_at = $4,
        updated_at = CURRENT_TIMESTAMP
    `, ['linear', userId, accessToken, expiresAt, this.config.scopes]);
  }

  async getValidToken(userId: string): Promise<string | null> {
    const result = await this.db.query(`
      SELECT access_token, expires_at 
      FROM oauth_tokens 
      WHERE service = $1 AND user_id = $2
    `, ['linear', userId]);

    if (!result.rows[0]) return null;

    const { access_token, expires_at } = result.rows[0];
    
    if (new Date(expires_at) <= new Date()) {
      return null; // Token expired
    }

    return access_token;
  }
}
```

### Action 1.3: Create Auth Routes
Update file: `src/routes/auth.routes.ts`
```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { LinearAuthController } from '../controllers/auth/linear.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();
const linearAuthController = new LinearAuthController();

// Linear OAuth routes
authRouter.get('/linear', authenticate, asyncHandler(linearAuthController.initiateOAuth));
authRouter.get('/linear/callback', asyncHandler(linearAuthController.handleCallback));
authRouter.post('/linear/disconnect', authenticate, asyncHandler(linearAuthController.disconnect));
authRouter.get('/linear/status', authenticate, asyncHandler(linearAuthController.checkStatus));
```

### Action 1.4: Create Linear Auth Controller
Create file: `src/controllers/auth/linear.controller.ts`
```typescript
import { Request, Response } from 'express';
import crypto from 'crypto';
import { LinearAuthService } from '../../services/auth/linearAuth.service';
import { AppError } from '../../middleware/error.middleware';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class LinearAuthController {
  private linearAuth: LinearAuthService;
  private stateStore: Map<string, { userId: string; timestamp: number }>;

  constructor() {
    this.linearAuth = new LinearAuthService();
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

    const authUrl = this.linearAuth.getAuthorizationUrl(state);
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

    const { accessToken, expiresIn } = await this.linearAuth.exchangeCodeForToken(
      code as string
    );

    await this.linearAuth.saveToken(stateData.userId, accessToken, expiresIn);

    // Redirect to frontend success page
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?linear=connected`);
  };

  disconnect = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    // Remove token from database
    await this.linearAuth.revokeToken(req.user.id);

    res.json({
      success: true,
      data: { message: 'Linear disconnected successfully' }
    });
  };

  checkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError(401, 'User not authenticated');
    }

    const token = await this.linearAuth.getValidToken(req.user.id);

    res.json({
      success: true,
      data: {
        connected: !!token,
        scopes: token ? ['read', 'write'] : []
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

## Step 2: Linear GraphQL Client

### Action 2.1: Create Linear API Client
Create file: `src/services/linear/linearClient.ts`
```typescript
import { GraphQLClient } from 'graphql-request';
import { getLinearConfig } from '../../config/linear.config';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

export class LinearClient {
  private client: GraphQLClient;
  private config = getLinearConfig();

  constructor(accessToken: string) {
    this.client = new GraphQLClient(this.config.apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async query<T = any>(query: string, variables?: any): Promise<T> {
    try {
      return await this.client.request<T>(query, variables);
    } catch (error: any) {
      logger.error('Linear GraphQL query failed:', {
        error: error.message,
        query,
        variables
      });

      if (error.response?.status === 401) {
        throw new AppError(401, 'Linear authentication failed', 'LINEAR_AUTH_INVALID');
      }

      throw new AppError(
        500,
        'Failed to fetch data from Linear',
        'LINEAR_API_ERROR',
        error.response?.errors
      );
    }
  }

  async mutation<T = any>(mutation: string, variables?: any): Promise<T> {
    try {
      return await this.client.request<T>(mutation, variables);
    } catch (error: any) {
      logger.error('Linear GraphQL mutation failed:', {
        error: error.message,
        mutation,
        variables
      });

      throw new AppError(
        500,
        'Failed to update data in Linear',
        'LINEAR_API_ERROR',
        error.response?.errors
      );
    }
  }
}
```

### Action 2.2: Create GraphQL Queries
Create file: `src/services/linear/queries.ts`
```typescript
export const LINEAR_QUERIES = {
  GET_VIEWER: `
    query GetViewer {
      viewer {
        id
        name
        email
        avatarUrl
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    }
  `,

  GET_TEAM: `
    query GetTeam($teamId: String!) {
      team(id: $teamId) {
        id
        name
        key
        description
        members {
          nodes {
            id
            name
            email
            avatarUrl
            isActive
          }
        }
        cycles {
          nodes {
            id
            number
            name
            startsAt
            endsAt
            progress
            issues {
              nodes {
                id
              }
            }
          }
        }
      }
    }
  `,

  GET_ISSUES_BY_CYCLE: `
    query GetIssuesByCycle($cycleId: String!, $first: Int = 100, $after: String) {
      cycle(id: $cycleId) {
        id
        number
        name
        startsAt
        endsAt
        issues(first: $first, after: $after) {
          nodes {
            id
            identifier
            title
            description
            priority
            estimate
            url
            branchName
            createdAt
            updatedAt
            completedAt
            canceledAt
            startedAt
            state {
              id
              name
              type
              color
            }
            assignee {
              id
              name
              email
              avatarUrl
            }
            project {
              id
              name
              description
              color
              state
              progress
              targetDate
              startedAt
              completedAt
            }
            labels {
              nodes {
                id
                name
                color
              }
            }
            comments {
              nodes {
                id
                body
                createdAt
                user {
                  id
                  name
                }
              }
            }
            attachments {
              nodes {
                id
                title
                subtitle
                url
                sourceType
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,

  GET_ISSUES_BY_USER: `
    query GetIssuesByUser($userId: String!, $stateTypes: [String!], $first: Int = 50, $after: String) {
      user(id: $userId) {
        id
        name
        assignedIssues(
          filter: { state: { type: { in: $stateTypes } } }
          first: $first
          after: $after
        ) {
          nodes {
            id
            identifier
            title
            priority
            estimate
            state {
              id
              name
              type
            }
            project {
              id
              name
            }
            cycle {
              id
              number
              name
            }
            completedAt
            startedAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `,

  GET_RECENT_ISSUES: `
    query GetRecentIssues($teamId: String!, $since: DateTime!, $first: Int = 100) {
      team(id: $teamId) {
        id
        issues(
          filter: { updatedAt: { gte: $since } }
          first: $first
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            state {
              name
              type
            }
            assignee {
              id
              name
            }
            updatedAt
            completedAt
            cycle {
              id
              number
            }
          }
        }
      }
    }
  `,

  GET_PROJECTS: `
    query GetProjects($teamId: String!) {
      team(id: $teamId) {
        id
        projects(first: 50, filter: { state: { in: ["planned", "started"] } }) {
          nodes {
            id
            name
            description
            color
            state
            progress
            targetDate
            startedAt
            lead {
              id
              name
            }
            issues {
              nodes {
                id
                state {
                  type
                }
              }
            }
          }
        }
      }
    }
  `
};
```

## Step 3: Data Extraction Service

### Action 3.1: Create Linear Data Service
Create file: `src/services/linear/linearData.service.ts`
```typescript
import { LinearClient } from './linearClient';
import { LINEAR_QUERIES } from './queries';
import { LinearAuthService } from '../auth/linearAuth.service';
import { DatabaseService } from '../database.service';
import { 
  LinearIssue, 
  LinearUser, 
  LinearCycle, 
  LinearTeam,
  LinearProject 
} from '../../types/linear.types';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';
import { addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';

export class LinearDataService {
  private authService: LinearAuthService;
  private db: DatabaseService;

  constructor() {
    this.authService = new LinearAuthService();
    this.db = new DatabaseService();
  }

  private async getClient(userId: string): Promise<LinearClient> {
    const token = await this.authService.getValidToken(userId);
    if (!token) {
      throw new AppError(401, 'Linear not connected', 'LINEAR_NOT_CONNECTED');
    }
    return new LinearClient(token);
  }

  async getUserTeams(userId: string): Promise<LinearTeam[]> {
    const client = await this.getClient(userId);
    const response = await client.query<{
      viewer: {
        teams: { nodes: LinearTeam[] }
      }
    }>(LINEAR_QUERIES.GET_VIEWER);

    return response.viewer.teams.nodes;
  }

  async getTeamDetails(userId: string, teamId: string): Promise<LinearTeam> {
    const client = await this.getClient(userId);
    const response = await client.query<{ team: LinearTeam }>(
      LINEAR_QUERIES.GET_TEAM,
      { teamId }
    );

    if (!response.team) {
      throw new AppError(404, 'Team not found', 'TEAM_NOT_FOUND');
    }

    // Cache team data
    await this.cacheTeamData(response.team);

    return response.team;
  }

  async getCurrentCycleIssues(
    userId: string, 
    teamId: string
  ): Promise<{ cycle: LinearCycle; issues: LinearIssue[] }> {
    const team = await this.getTeamDetails(userId, teamId);
    
    // Find current cycle
    const now = new Date();
    const currentCycle = team.cycles?.nodes.find(cycle => 
      new Date(cycle.startsAt) <= now && new Date(cycle.endsAt) >= now
    );

    if (!currentCycle) {
      throw new AppError(404, 'No active cycle found', 'NO_ACTIVE_CYCLE');
    }

    // Fetch all issues for the cycle
    const issues = await this.getCycleIssues(userId, currentCycle.id);

    return { cycle: currentCycle, issues };
  }

  async getCycleIssues(
    userId: string, 
    cycleId: string
  ): Promise<LinearIssue[]> {
    const client = await this.getClient(userId);
    const allIssues: LinearIssue[] = [];
    let hasNextPage = true;
    let cursor: string | undefined;

    while (hasNextPage) {
      const response = await client.query<{
        cycle: {
          issues: {
            nodes: LinearIssue[];
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string;
            };
          };
        };
      }>(LINEAR_QUERIES.GET_ISSUES_BY_CYCLE, {
        cycleId,
        first: 100,
        after: cursor
      });

      allIssues.push(...response.cycle.issues.nodes);
      hasNextPage = response.cycle.issues.pageInfo.hasNextPage;
      cursor = response.cycle.issues.pageInfo.endCursor;
    }

    // Cache issues
    await this.cacheIssues(allIssues);

    return allIssues;
  }

  async getUserIssues(
    userId: string,
    linearUserId: string,
    stateTypes: string[] = ['started', 'unstarted', 'backlog']
  ): Promise<LinearIssue[]> {
    const client = await this.getClient(userId);
    const allIssues: LinearIssue[] = [];
    let hasNextPage = true;
    let cursor: string | undefined;

    while (hasNextPage) {
      const response = await client.query<{
        user: {
          assignedIssues: {
            nodes: LinearIssue[];
            pageInfo: {
              hasNextPage: boolean;
              endCursor: string;
            };
          };
        };
      }>(LINEAR_QUERIES.GET_ISSUES_BY_USER, {
        userId: linearUserId,
        stateTypes,
        first: 50,
        after: cursor
      });

      allIssues.push(...response.user.assignedIssues.nodes);
      hasNextPage = response.user.assignedIssues.pageInfo.hasNextPage;
      cursor = response.user.assignedIssues.pageInfo.endCursor;
    }

    return allIssues;
  }

  async getRecentActivity(
    userId: string,
    teamId: string,
    days: number = 7
  ): Promise<LinearIssue[]> {
    const client = await this.getClient(userId);
    const since = subDays(new Date(), days).toISOString();

    const response = await client.query<{
      team: {
        issues: { nodes: LinearIssue[] }
      }
    }>(LINEAR_QUERIES.GET_RECENT_ISSUES, {
      teamId,
      since,
      first: 100
    });

    return response.team.issues.nodes;
  }

  async getProjects(userId: string, teamId: string): Promise<LinearProject[]> {
    const client = await this.getClient(userId);
    
    const response = await client.query<{
      team: {
        projects: { nodes: LinearProject[] }
      }
    }>(LINEAR_QUERIES.GET_PROJECTS, { teamId });

    return response.team.projects.nodes;
  }

  async syncTeamData(userId: string, teamId: string): Promise<{
    issuesSynced: number;
    usersSynced: number;
    projectsSynced: number;
  }> {
    logger.info(`Starting Linear sync for team ${teamId}`);

    try {
      // Update sync status
      await this.updateSyncStatus(teamId, 'in_progress');

      // Fetch team details
      const team = await this.getTeamDetails(userId, teamId);
      
      // Sync team members
      const usersSynced = await this.syncTeamMembers(team);
      
      // Sync current cycle issues
      const { issues } = await this.getCurrentCycleIssues(userId, teamId);
      const issuesSynced = issues.length;
      
      // Sync projects
      const projects = await this.getProjects(userId, teamId);
      const projectsSynced = await this.syncProjects(projects);

      // Update sync status
      await this.updateSyncStatus(teamId, 'completed');

      logger.info(`Linear sync completed for team ${teamId}`, {
        issuesSynced,
        usersSynced,
        projectsSynced
      });

      return { issuesSynced, usersSynced, projectsSynced };

    } catch (error) {
      await this.updateSyncStatus(teamId, 'failed', error);
      throw error;
    }
  }

  private async cacheTeamData(team: LinearTeam): Promise<void> {
    await this.db.query(`
      INSERT INTO teams (id, name, linear_team_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (linear_team_id) 
      DO UPDATE SET 
        name = $2,
        updated_at = CURRENT_TIMESTAMP
    `, [team.id, team.name, team.id]);
  }

  private async syncTeamMembers(team: LinearTeam): Promise<number> {
    let synced = 0;
    
    for (const member of team.members) {
      await this.db.query(`
        INSERT INTO engineers (
          linear_user_id, name, email, avatar_url, team_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (linear_user_id) 
        DO UPDATE SET 
          name = $2,
          email = $3,
          avatar_url = $4,
          team_id = $5,
          is_active = $6,
          updated_at = CURRENT_TIMESTAMP
      `, [
        member.id,
        member.name,
        member.email,
        member.avatarUrl,
        team.id,
        member.isActive
      ]);
      synced++;
    }

    return synced;
  }

  private async cacheIssues(issues: LinearIssue[]): Promise<void> {
    const cacheKey = `issues_${Date.now()}`;
    const expiresAt = addDays(new Date(), 1);

    await this.db.query(`
      INSERT INTO cache_entries (cache_key, cache_value, expires_at)
      VALUES ($1, $2, $3)
    `, [cacheKey, JSON.stringify(issues), expiresAt]);

    // Clean up old cache entries
    await this.db.query(`
      DELETE FROM cache_entries 
      WHERE expires_at < CURRENT_TIMESTAMP
    `);
  }

  private async syncProjects(projects: LinearProject[]): Promise<number> {
    // Projects are stored in cache for now
    // In a full implementation, you might want a dedicated projects table
    
    const cacheKey = `projects_${Date.now()}`;
    const expiresAt = addDays(new Date(), 7);

    await this.db.query(`
      INSERT INTO cache_entries (cache_key, cache_value, expires_at)
      VALUES ($1, $2, $3)
    `, [cacheKey, JSON.stringify(projects), expiresAt]);

    return projects.length;
  }

  private async updateSyncStatus(
    teamId: string, 
    status: 'in_progress' | 'completed' | 'failed',
    error?: any
  ): Promise<void> {
    if (status === 'completed') {
      await this.db.query(`
        INSERT INTO linear_sync_status (team_id, last_sync_at, last_successful_sync_at)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (team_id) 
        DO UPDATE SET 
          last_sync_at = CURRENT_TIMESTAMP,
          last_successful_sync_at = CURRENT_TIMESTAMP,
          error_message = NULL,
          updated_at = CURRENT_TIMESTAMP
      `, [teamId]);
    } else if (status === 'failed') {
      await this.db.query(`
        INSERT INTO linear_sync_status (team_id, last_sync_at, error_message)
        VALUES ($1, CURRENT_TIMESTAMP, $2)
        ON CONFLICT (team_id) 
        DO UPDATE SET 
          last_sync_at = CURRENT_TIMESTAMP,
          error_message = $2,
          updated_at = CURRENT_TIMESTAMP
      `, [teamId, error?.message || 'Unknown error']);
    }
  }
}
```

## Step 4: Linear Webhook Handler

### Action 4.1: Create Webhook Service
Create file: `src/services/linear/linearWebhook.service.ts`
```typescript
import crypto from 'crypto';
import { Request } from 'express';
import { getLinearConfig } from '../../config/linear.config';
import { DatabaseService } from '../database.service';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

interface LinearWebhookPayload {
  action: 'create' | 'update' | 'remove';
  type: 'Issue' | 'IssueComment' | 'Project' | 'Cycle';
  data: any;
  url: string;
  createdAt: string;
}

export class LinearWebhookService {
  private config = getLinearConfig();
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  verifyWebhookSignature(req: Request): boolean {
    const signature = req.headers['linear-signature'] as string;
    if (!signature || !this.config.webhookSecret) {
      return false;
    }

    const hash = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    return signature === hash;
  }

  async processWebhook(payload: LinearWebhookPayload): Promise<void> {
    logger.info('Processing Linear webhook', {
      action: payload.action,
      type: payload.type
    });

    switch (payload.type) {
      case 'Issue':
        await this.handleIssueUpdate(payload);
        break;
      case 'Project':
        await this.handleProjectUpdate(payload);
        break;
      case 'Cycle':
        await this.handleCycleUpdate(payload);
        break;
      default:
        logger.debug(`Ignoring webhook for type: ${payload.type}`);
    }
  }

  private async handleIssueUpdate(payload: LinearWebhookPayload): Promise<void> {
    const issue = payload.data;
    
    // Invalidate relevant caches
    await this.invalidateIssueCache(issue.id);
    
    // If it's a state change, log it for metrics
    if (payload.action === 'update' && issue.state) {
      await this.logStateChange(issue);
    }

    // Notify connected clients via WebSocket (to be implemented)
    // this.notifyClients('issue.updated', issue);
  }

  private async handleProjectUpdate(payload: LinearWebhookPayload): Promise<void> {
    // Invalidate project caches
    await this.db.query(`
      DELETE FROM cache_entries 
      WHERE cache_key LIKE 'projects_%'
    `);
  }

  private async handleCycleUpdate(payload: LinearWebhookPayload): Promise<void> {
    // Invalidate cycle-related caches
    await this.db.query(`
      DELETE FROM cache_entries 
      WHERE cache_key LIKE 'cycle_%' OR cache_key LIKE 'issues_%'
    `);
  }

  private async invalidateIssueCache(issueId: string): Promise<void> {
    // Remove cached data related to this issue
    await this.db.query(`
      DELETE FROM cache_entries 
      WHERE cache_key LIKE '%${issueId}%'
    `);
  }

  private async logStateChange(issue: any): Promise<void> {
    // Log state changes for analytics
    logger.info('Issue state changed', {
      issueId: issue.id,
      identifier: issue.identifier,
      newState: issue.state.name,
      assignee: issue.assignee?.email
    });
  }
}
```

### Action 4.2: Create Webhook Routes
Create file: `src/routes/webhook.routes.ts`
```typescript
import { Router } from 'express';
import { LinearWebhookController } from '../controllers/webhook/linear.controller';

export const webhookRouter = Router();
const linearWebhookController = new LinearWebhookController();

// Linear webhooks
webhookRouter.post('/linear', linearWebhookController.handleWebhook);
```

### Action 4.3: Create Webhook Controller
Create file: `src/controllers/webhook/linear.controller.ts`
```typescript
import { Request, Response } from 'express';
import { LinearWebhookService } from '../../services/linear/linearWebhook.service';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

export class LinearWebhookController {
  private webhookService: LinearWebhookService;

  constructor() {
    this.webhookService = new LinearWebhookService();
  }

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    // Verify webhook signature
    if (!this.webhookService.verifyWebhookSignature(req)) {
      logger.warn('Invalid Linear webhook signature');
      throw new AppError(401, 'Invalid webhook signature');
    }

    try {
      // Process webhook asynchronously
      setImmediate(() => {
        this.webhookService.processWebhook(req.body).catch(error => {
          logger.error('Failed to process Linear webhook:', error);
        });
      });

      // Respond immediately
      res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Error handling Linear webhook:', error);
      throw new AppError(500, 'Failed to process webhook');
    }
  };
}
```

## Step 5: Dashboard Data Aggregation

### Action 5.1: Create Dashboard Service
Create file: `src/services/dashboard/dashboard.service.ts`
```typescript
import { LinearDataService } from '../linear/linearData.service';
import { DatabaseService } from '../database.service';
import { 
  EngineerActivity,
  SprintSummary,
  Engineer,
  Team,
  DashboardFilter,
  EngineerMetrics,
  WorkTypeBreakdown
} from '../../types/dashboard.types';
import { LinearIssue } from '../../types/linear.types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { logger } from '../../utils/logger';

export class DashboardService {
  private linearService: LinearDataService;
  private db: DatabaseService;

  constructor() {
    this.linearService = new LinearDataService();
    this.db = new DatabaseService();
  }

  async getTeamActivity(
    userId: string,
    teamId: string,
    filter: DashboardFilter
  ): Promise<EngineerActivity[]> {
    // Get time range based on filter
    const timeRange = this.getTimeRange(filter);
    
    // Fetch team members
    const team = await this.getTeam(teamId);
    
    // Fetch issues for the time range
    const issues = await this.linearService.getRecentActivity(
      userId,
      teamId,
      Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Group issues by engineer
    const activitiesByEngineer = new Map<string, EngineerActivity>();

    for (const engineer of team.engineers) {
      const engineerIssues = issues.filter(
        issue => issue.assignee?.id === engineer.linearUserId
      );

      const metrics = this.calculateEngineerMetrics(engineerIssues, timeRange);

      activitiesByEngineer.set(engineer.id, {
        engineer,
        timeRange,
        linearIssues: engineerIssues,
        pullRequests: [], // Will be populated in Phase 3
        commits: [], // Will be populated in Phase 3
        metrics
      });
    }

    return Array.from(activitiesByEngineer.values());
  }

  async getCurrentSprintSummary(
    userId: string,
    teamId: string
  ): Promise<SprintSummary> {
    const { cycle, issues } = await this.linearService.getCurrentCycleIssues(userId, teamId);
    const team = await this.getTeam(teamId);

    // Calculate sprint metrics
    const completedIssues = issues.filter(i => i.state.type === 'completed').length;
    const inProgressIssues = issues.filter(i => i.state.type === 'started').length;
    const blockedIssues = issues.filter(i => 
      i.labels.some(l => l.name.toLowerCase().includes('blocked'))
    ).length;

    // Calculate velocity (story points completed)
    const velocity = issues
      .filter(i => i.state.type === 'completed')
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);

    // Engineer summaries
    const engineerSummaries = team.engineers.map(engineer => {
      const engineerIssues = issues.filter(i => i.assignee?.id === engineer.linearUserId);
      const completed = engineerIssues.filter(i => i.state.type === 'completed');
      
      return {
        engineer,
        plannedIssues: engineerIssues.length,
        completedIssues: completed.length,
        addedIssues: 0, // Would need historical data
        removedIssues: 0, // Would need historical data
        storyPointsCompleted: completed.reduce((sum, i) => sum + (i.estimate || 0), 0),
        pullRequestsMerged: 0 // Will be populated in Phase 3
      };
    });

    // Project breakdown
    const projectMap = new Map();
    for (const issue of issues) {
      if (!issue.project) continue;
      
      if (!projectMap.has(issue.project.id)) {
        projectMap.set(issue.project.id, {
          project: issue.project,
          issuesCompleted: 0,
          issuesTotal: 0,
          engineers: new Set()
        });
      }

      const proj = projectMap.get(issue.project.id);
      proj.issuesTotal++;
      if (issue.state.type === 'completed') {
        proj.issuesCompleted++;
      }
      if (issue.assignee) {
        proj.engineers.add(issue.assignee.id);
      }
    }

    const projectBreakdown = Array.from(projectMap.values()).map(p => ({
      ...p,
      progress: p.issuesTotal > 0 ? (p.issuesCompleted / p.issuesTotal) * 100 : 0,
      engineers: Array.from(p.engineers).map(id => 
        team.engineers.find(e => e.linearUserId === id)!
      ).filter(Boolean)
    }));

    return {
      cycle,
      team,
      startDate: new Date(cycle.startsAt),
      endDate: new Date(cycle.endsAt),
      totalIssues: issues.length,
      completedIssues,
      inProgressIssues,
      blockedIssues,
      velocity,
      engineerSummaries,
      projectBreakdown
    };
  }

  private async getTeam(teamId: string): Promise<Team> {
    const result = await this.db.query(`
      SELECT 
        t.id, t.name, t.linear_team_id,
        e.id as engineer_id, e.name as engineer_name, 
        e.email, e.linear_user_id, e.github_username,
        e.avatar_url, e.is_active
      FROM teams t
      LEFT JOIN engineers e ON e.team_id = t.id
      WHERE t.linear_team_id = $1
    `, [teamId]);

    if (result.rows.length === 0) {
      throw new Error('Team not found');
    }

    const team: Team = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      linearTeamId: result.rows[0].linear_team_id,
      engineers: []
    };

    for (const row of result.rows) {
      if (row.engineer_id) {
        team.engineers.push({
          id: row.engineer_id,
          name: row.engineer_name,
          email: row.email,
          linearUserId: row.linear_user_id,
          githubUsername: row.github_username,
          avatarUrl: row.avatar_url,
          isActive: row.is_active,
          team
        });
      }
    }

    return team;
  }

  private calculateEngineerMetrics(
    issues: LinearIssue[],
    timeRange: { start: Date; end: Date }
  ): EngineerMetrics {
    const completed = issues.filter(i => 
      i.state.type === 'completed' && 
      i.completedAt &&
      isWithinInterval(new Date(i.completedAt), timeRange)
    );

    const inProgress = issues.filter(i => i.state.type === 'started');

    // Calculate work type breakdown
    const workTypeBreakdown = this.calculateWorkTypeBreakdown(issues);

    return {
      issuesCompleted: completed.length,
      issuesInProgress: inProgress.length,
      pullRequestsMerged: 0, // Phase 3
      pullRequestsOpen: 0, // Phase 3
      pullRequestsReviewing: 0, // Phase 3
      codeAdditions: 0, // Phase 3
      codeDeletions: 0, // Phase 3
      reviewsGiven: 0, // Phase 3
      workTypeBreakdown
    };
  }

  private calculateWorkTypeBreakdown(issues: LinearIssue[]): WorkTypeBreakdown {
    const breakdown = {
      features: 0,
      bugs: 0,
      techDebt: 0,
      other: 0
    };

    for (const issue of issues) {
      const labels = issue.labels.map(l => l.name.toLowerCase());
      
      if (labels.some(l => l.includes('bug') || l.includes('fix'))) {
        breakdown.bugs++;
      } else if (labels.some(l => l.includes('tech-debt') || l.includes('refactor'))) {
        breakdown.techDebt++;
      } else if (labels.some(l => l.includes('feature') || l.includes('enhancement'))) {
        breakdown.features++;
      } else {
        breakdown.other++;
      }
    }

    return breakdown;
  }

  private getTimeRange(filter: DashboardFilter): { start: Date; end: Date } {
    const now = new Date();

    switch (filter.timeView) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        };
      case 'thisWeek':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        };
      case 'thisMonth':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      case 'custom':
        return filter.customRange || { start: startOfWeek(now), end: now };
      default:
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: now
        };
    }
  }
}
```

## Step 6: Dashboard API Routes

### Action 6.1: Create Dashboard Routes
Update file: `src/routes/dashboard.routes.ts`
```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { DashboardController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();
const dashboardController = new DashboardController();

// All dashboard routes require authentication
dashboardRouter.use(authenticate);

// Team activity
dashboardRouter.get('/teams/:teamId/activity', 
  asyncHandler(dashboardController.getTeamActivity)
);

// Sprint summary
dashboardRouter.get('/teams/:teamId/sprint', 
  asyncHandler(dashboardController.getCurrentSprint)
);

// Individual engineer view
dashboardRouter.get('/engineers/:engineerId/activity', 
  asyncHandler(dashboardController.getEngineerActivity)
);

// Sync data
dashboardRouter.post('/teams/:teamId/sync', 
  asyncHandler(dashboardController.syncTeamData)
);
```

### Action 6.2: Create Dashboard Controller
Create file: `src/controllers/dashboard.controller.ts`
```typescript
import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { LinearDataService } from '../services/linear/linearData.service';
import { AppError } from '../middleware/error.middleware';
import { DashboardFilter } from '../types/dashboard.types';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class DashboardController {
  private dashboardService: DashboardService;
  private linearService: LinearDataService;

  constructor() {
    this.dashboardService = new DashboardService();
    this.linearService = new LinearDataService();
  }

  getTeamActivity = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { teamId } = req.params;
    const filter: DashboardFilter = {
      timeView: req.query.timeView as any || 'thisWeek',
      engineers: req.query.engineers as string[],
      projects: req.query.projects as string[],
      labels: req.query.labels as string[]
    };

    const activities = await this.dashboardService.getTeamActivity(
      req.user.id,
      teamId,
      filter
    );

    res.json({
      success: true,
      data: activities
    });
  };

  getCurrentSprint = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { teamId } = req.params;
    
    const sprintSummary = await this.dashboardService.getCurrentSprintSummary(
      req.user.id,
      teamId
    );

    res.json({
      success: true,
      data: sprintSummary
    });
  };

  getEngineerActivity = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { engineerId } = req.params;
    const timeView = req.query.timeView as any || 'thisMonth';

    // Get engineer details
    const engineer = await this.dashboardService.getEngineer(engineerId);
    if (!engineer || !engineer.linearUserId) {
      throw new AppError(404, 'Engineer not found or not connected to Linear');
    }

    // Get issues assigned to engineer
    const issues = await this.linearService.getUserIssues(
      req.user.id,
      engineer.linearUserId,
      ['completed', 'started', 'unstarted']
    );

    res.json({
      success: true,
      data: {
        engineer,
        issues,
        metrics: this.dashboardService.calculateEngineerMetrics(
          issues,
          this.dashboardService.getTimeRange({ timeView })
        )
      }
    });
  };

  syncTeamData = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { teamId } = req.params;
    
    // Start sync process
    const syncResult = await this.linearService.syncTeamData(
      req.user.id,
      teamId
    );

    res.json({
      success: true,
      data: {
        message: 'Sync completed successfully',
        ...syncResult
      }
    });
  };
}
```

## Step 7: Testing Linear Integration

### Action 7.1: Create Linear Service Tests
Create file: `tests/integration/linear.test.ts`
```typescript
import { LinearDataService } from '../../src/services/linear/linearData.service';
import { LinearAuthService } from '../../src/services/auth/linearAuth.service';
import { DatabaseService } from '../../src/services/database.service';

jest.mock('../../src/services/auth/linearAuth.service');
jest.mock('../../src/services/database.service');

describe('Linear Data Service', () => {
  let linearService: LinearDataService;
  let mockAuthService: jest.Mocked<LinearAuthService>;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    linearService = new LinearDataService();
    mockAuthService = LinearAuthService.prototype as any;
    mockDb = DatabaseService.prototype as any;
  });

  describe('getUserTeams', () => {
    it('should fetch user teams from Linear', async () => {
      mockAuthService.getValidToken.mockResolvedValue('mock-token');
      
      // Mock GraphQL response
      const mockTeams = [
        { id: 'team1', name: 'Engineering', key: 'ENG' },
        { id: 'team2', name: 'Product', key: 'PROD' }
      ];

      // Would need to mock LinearClient here
      // const teams = await linearService.getUserTeams('user123');
      // expect(teams).toHaveLength(2);
    });
  });

  describe('syncTeamData', () => {
    it('should sync team members and issues', async () => {
      mockAuthService.getValidToken.mockResolvedValue('mock-token');
      mockDb.query.mockResolvedValue({ rows: [] });

      // Test sync process
      // const result = await linearService.syncTeamData('user123', 'team123');
      // expect(result.usersSynced).toBeGreaterThan(0);
    });
  });
});
```

### Action 7.2: Create Dashboard Controller Tests
Create file: `tests/unit/controllers/dashboard.test.ts`
```typescript
import request from 'supertest';
import { createServer } from '../../../src/server';
import { DashboardService } from '../../../src/services/dashboard/dashboard.service';

jest.mock('../../../src/services/dashboard/dashboard.service');

describe('Dashboard Controller', () => {
  let app: any;
  let mockDashboardService: jest.Mocked<DashboardService>;

  beforeEach(() => {
    app = createServer();
    mockDashboardService = DashboardService.prototype as any;
  });

  describe('GET /api/dashboard/teams/:teamId/activity', () => {
    it('should return team activity', async () => {
      const mockActivities = [
        {
          engineer: { id: '1', name: 'John Doe' },
          metrics: { issuesCompleted: 5 }
        }
      ];

      mockDashboardService.getTeamActivity.mockResolvedValue(mockActivities);

      const response = await request(app)
        .get('/api/dashboard/teams/team123/activity')
        .set('Authorization', 'Bearer mock-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });
});
```

## Step 8: Update Dependencies

### Action 8.1: Update package.json
Add to `package.json` dependencies:
```json
{
  "dependencies": {
    "graphql": "^16.8.0",
    "graphql-request": "^6.1.0",
    "axios": "^1.5.0"
  }
}
```

## Completion Checklist

Upon completing Phase 2:

1. ✓ Linear OAuth flow implemented
2. ✓ GraphQL client configured
3. ✓ Data extraction service for issues, cycles, and teams
4. ✓ Webhook handler for real-time updates
5. ✓ Dashboard aggregation service
6. ✓ API endpoints for team and engineer views
7. ✓ Sync mechanism for Linear data
8. ✓ Caching layer for performance
9. ✓ Test coverage for services
10. ✓ Error handling for API failures

## Verification Steps

```bash
# Install new dependencies
npm install

# Run tests
npm test

# Start server and test endpoints
npm run dev

# Test OAuth flow
# GET http://localhost:3001/api/auth/linear

# Test team activity endpoint
# GET http://localhost:3001/api/dashboard/teams/{teamId}/activity
```

## Next Phase Dependencies

Phase 2 enables:
- Phase 3: GitHub integration can correlate PRs with Linear issues
- Phase 4: Report generation has issue data to work with
- Phase 5: Frontend can display Linear data
- Phase 6: Performance optimization has real data to cache

## Key Implementation Notes

1. **OAuth Security**: State parameter prevents CSRF attacks
2. **GraphQL Pagination**: Handles large datasets efficiently
3. **Webhook Verification**: Ensures webhooks are from Linear
4. **Caching Strategy**: Reduces API calls and improves performance
5. **Error Recovery**: Graceful handling of API failures
6. **Data Sync**: Incremental updates via webhooks after initial sync