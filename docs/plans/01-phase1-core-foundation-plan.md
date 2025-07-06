# Phase 1: Core Data Models & API Foundation - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for establishing the core foundation of the Engineering Manager Dashboard. Execute each step sequentially, creating all specified files with the exact content provided.

## Step 1: Project Structure Setup

### Action 1.1: Create Directory Structure
```bash
mkdir -p src/models
mkdir -p src/controllers
mkdir -p src/middleware
mkdir -p src/routes
mkdir -p src/services
mkdir -p src/utils
mkdir -p src/types
mkdir -p src/config
mkdir -p src/database
mkdir -p src/database/migrations
mkdir -p tests/unit
mkdir -p tests/integration
```

### Action 1.2: Initialize TypeScript Configuration
Create file: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Step 2: Core Type Definitions

### Action 2.1: Create Base Types
Create file: `src/types/base.types.ts`
```typescript
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export type TimeView = 'today' | 'thisWeek' | 'thisSprint' | 'thisMonth' | 'custom';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Action 2.2: Create Linear Types
Create file: `src/types/linear.types.ts`
```typescript
import { BaseEntity } from './base.types';

export interface LinearIssue extends BaseEntity {
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  state: LinearIssueState;
  assignee?: LinearUser;
  project?: LinearProject;
  cycle?: LinearCycle;
  labels: LinearLabel[];
  completedAt?: Date;
  canceledAt?: Date;
  startedAt?: Date;
  url: string;
  branchName?: string;
}

export interface LinearIssueState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  color: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  color: string;
  state: 'planned' | 'started' | 'paused' | 'completed' | 'canceled';
  progress: number;
  targetDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  startsAt: Date;
  endsAt: Date;
  progress: number;
  issueCount: number;
  completedIssueCount: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
  members: LinearUser[];
}
```

### Action 2.3: Create GitHub Types
Create file: `src/types/github.types.ts`
```typescript
import { BaseEntity } from './base.types';

export interface GitHubPullRequest extends BaseEntity {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  author: GitHubUser;
  assignees: GitHubUser[];
  reviewers: GitHubUser[];
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  headRef: string;
  baseRef: string;
  draft: boolean;
  mergeable?: boolean;
  merged: boolean;
  mergedAt?: Date;
  closedAt?: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision?: 'approved' | 'changes_requested' | 'review_required';
  url: string;
  repository: GitHubRepository;
  linkedIssues?: string[];
}

export interface GitHubUser {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  type: 'User' | 'Bot';
}

export interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: GitHubUser;
  committedDate: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  url: string;
}

export interface GitHubLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubMilestone {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  dueOn?: Date;
  closedAt?: Date;
}

export interface GitHubReview {
  id: string;
  author: GitHubUser;
  state: 'pending' | 'commented' | 'approved' | 'changes_requested' | 'dismissed';
  body?: string;
  submittedAt?: Date;
}
```

### Action 2.4: Create Dashboard Types
Create file: `src/types/dashboard.types.ts`
```typescript
import { LinearIssue, LinearUser, LinearCycle, LinearProject } from './linear.types';
import { GitHubPullRequest, GitHubCommit } from './github.types';
import { TimeRange, TimeView } from './base.types';

export interface Engineer {
  id: string;
  name: string;
  email: string;
  linearUserId?: string;
  githubUsername?: string;
  avatarUrl?: string;
  team?: Team;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  linearTeamId?: string;
  engineers: Engineer[];
  lead?: Engineer;
}

export interface EngineerActivity {
  engineer: Engineer;
  timeRange: TimeRange;
  linearIssues: LinearIssue[];
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
  metrics: EngineerMetrics;
}

export interface EngineerMetrics {
  issuesCompleted: number;
  issuesInProgress: number;
  pullRequestsMerged: number;
  pullRequestsOpen: number;
  pullRequestsReviewing: number;
  codeAdditions: number;
  codeDeletions: number;
  reviewsGiven: number;
  averagePRMergeTime?: number;
  workTypeBreakdown: WorkTypeBreakdown;
}

export interface WorkTypeBreakdown {
  features: number;
  bugs: number;
  techDebt: number;
  other: number;
}

export interface SprintSummary {
  cycle: LinearCycle;
  team: Team;
  startDate: Date;
  endDate: Date;
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  blockedIssues: number;
  velocity: number;
  engineerSummaries: EngineerSprintSummary[];
  projectBreakdown: ProjectBreakdown[];
}

export interface EngineerSprintSummary {
  engineer: Engineer;
  plannedIssues: number;
  completedIssues: number;
  addedIssues: number;
  removedIssues: number;
  storyPointsCompleted: number;
  pullRequestsMerged: number;
}

export interface ProjectBreakdown {
  project: LinearProject;
  issuesCompleted: number;
  issuesTotal: number;
  progress: number;
  engineers: Engineer[];
}

export interface WeeklyReport {
  team: Team;
  weekStartDate: Date;
  weekEndDate: Date;
  summary: {
    issuesCompleted: LinearIssue[];
    pullRequestsMerged: GitHubPullRequest[];
    engineerHighlights: EngineerHighlight[];
    blockers: Blocker[];
    upcomingWork: LinearIssue[];
  };
  metrics: TeamMetrics;
  generatedAt: Date;
}

export interface EngineerHighlight {
  engineer: Engineer;
  accomplishments: string[];
  issueCount: number;
  prCount: number;
}

export interface Blocker {
  issue: LinearIssue;
  reason: string;
  duration: number;
  assignee: Engineer;
}

export interface TeamMetrics {
  velocity: number;
  completionRate: number;
  averageCycleTime: number;
  bugFixRate: number;
  reviewTurnaroundTime: number;
}

export interface DashboardFilter {
  timeView: TimeView;
  customRange?: TimeRange;
  engineers?: string[];
  projects?: string[];
  labels?: string[];
  issueStates?: string[];
  prStates?: string[];
}
```

## Step 3: Database Schema

### Action 3.1: Create Database Configuration
Create file: `src/config/database.config.ts`
```typescript
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  poolSize?: number;
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'engineering_dashboard',
  ssl: process.env.DB_SSL === 'true',
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10')
});
```

### Action 3.2: Create Database Schema
Create file: `src/database/schema.sql`
```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  linear_team_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Engineers table
CREATE TABLE engineers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  linear_user_id VARCHAR(255) UNIQUE,
  github_username VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  team_id UUID REFERENCES teams(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Linear sync status
CREATE TABLE linear_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  last_sync_at TIMESTAMP,
  last_successful_sync_at TIMESTAMP,
  sync_cursor VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- GitHub sync status
CREATE TABLE github_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id VARCHAR(255) NOT NULL,
  last_sync_at TIMESTAMP,
  last_successful_sync_at TIMESTAMP,
  sync_cursor VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth tokens
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES engineers(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  scopes TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Cache table for expensive queries
CREATE TABLE cache_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_engineers_team_id ON engineers(team_id);
CREATE INDEX idx_engineers_email ON engineers(email);
CREATE INDEX idx_oauth_tokens_service_user ON oauth_tokens(service, user_id);
CREATE INDEX idx_cache_entries_key ON cache_entries(cache_key);
CREATE INDEX idx_cache_entries_expires ON cache_entries(expires_at);
```

## Step 4: Core API Setup

### Action 4.1: Create Express Server
Create file: `src/server.ts`
```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { healthRouter } from './routes/health.routes';
import { authRouter } from './routes/auth.routes';
import { teamsRouter } from './routes/teams.routes';
import { engineersRouter } from './routes/engineers.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { reportsRouter } from './routes/reports.routes';
import { logger } from './utils/logger';

export const createServer = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));

  // General middleware
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);
  app.use(rateLimiter);

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/engineers', engineersRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/reports', reportsRouter);

  // Error handling
  app.use(errorHandler);

  return app;
};

export const startServer = async (port: number = 3001): Promise<void> => {
  const app = createServer();
  
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
```

### Action 4.2: Create Error Handling Middleware
Create file: `src/middleware/error.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error({
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      details: err.details,
      path: req.path,
      method: req.method
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message,
        details: err.details
      }
    });
  } else {
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### Action 4.3: Create Logging Utilities
Create file: `src/utils/logger.ts`
```typescript
import winston from 'winston';
import { Request } from 'express';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}

export const createRequestLogger = (req: Request) => {
  return logger.child({
    requestId: req.headers['x-request-id'] || generateRequestId(),
    method: req.method,
    path: req.path,
    ip: req.ip
  });
};

const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

### Action 4.4: Create Request Logging Middleware
Create file: `src/middleware/logging.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestWithLogger extends Request {
  logger?: typeof logger;
  requestId?: string;
}

export const requestLogger = (
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  req.logger = logger.child({ requestId });

  req.logger.info({
    type: 'request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger?.info({
      type: 'response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
};
```

### Action 4.5: Create Rate Limiting Middleware
Create file: `src/middleware/rateLimit.middleware.ts`
```typescript
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
      }
    });
  }
});

export const strictRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // 10 requests per minute for sensitive endpoints
  message: 'Rate limit exceeded for this endpoint.',
  standardHeaders: true,
  legacyHeaders: false
});
```

## Step 5: Basic Route Implementation

### Action 5.1: Create Health Check Route
Create file: `src/routes/health.routes.ts`
```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { HealthController } from '../controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/', asyncHandler(healthController.checkHealth));
healthRouter.get('/detailed', asyncHandler(healthController.checkDetailedHealth));
```

### Action 5.2: Create Health Controller
Create file: `src/controllers/health.controller.ts`
```typescript
import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';

export class HealthController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  checkHealth = async (req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  };

  checkDetailedHealth = async (req: Request, res: Response): Promise<void> => {
    const dbHealth = await this.databaseService.checkConnection();
    
    res.json({
      success: true,
      data: {
        status: dbHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: {
            status: dbHealth ? 'connected' : 'disconnected'
          },
          memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024
          },
          uptime: process.uptime()
        }
      }
    });
  };
}
```

## Step 6: Testing Framework Setup

### Action 6.1: Create Test Configuration
Create file: `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### Action 6.2: Create Test Setup
Create file: `tests/setup.ts`
```typescript
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock external services
jest.mock('../src/services/linear.service');
jest.mock('../src/services/github.service');

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Close database connections, stop servers, etc.
});
```

### Action 6.3: Create First Unit Test
Create file: `tests/unit/models/engineer.test.ts`
```typescript
import { Engineer } from '../../../src/types/dashboard.types';

describe('Engineer Model', () => {
  describe('Engineer creation', () => {
    it('should create a valid engineer object', () => {
      const engineer: Engineer = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        linearUserId: 'linear-123',
        githubUsername: 'johndoe',
        isActive: true
      };

      expect(engineer.id).toBe('123');
      expect(engineer.name).toBe('John Doe');
      expect(engineer.email).toBe('john@example.com');
      expect(engineer.isActive).toBe(true);
    });

    it('should allow optional fields', () => {
      const engineer: Engineer = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        isActive: true
      };

      expect(engineer.linearUserId).toBeUndefined();
      expect(engineer.githubUsername).toBeUndefined();
      expect(engineer.team).toBeUndefined();
    });
  });
});
```

## Step 7: Environment Configuration

### Action 7.1: Create Environment Template
Create file: `.env.example`
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=engineering_dashboard
DB_SSL=false
DB_POOL_SIZE=10

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# OAuth Configuration (to be configured in Phase 2 & 3)
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
LINEAR_REDIRECT_URI=http://localhost:3001/api/auth/linear/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:3001/api/auth/github/callback

# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Email Configuration (to be configured in Phase 4)
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@example.com
```

### Action 7.2: Create Configuration Loader
Create file: `src/config/index.ts`
```typescript
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

export const loadConfiguration = (): void => {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  const result = dotenv.config({ path: envFile });

  if (result.error) {
    logger.warn(`Could not load ${envFile} file`);
  }

  // Validate required environment variables
  const requiredVars = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  logger.info('Configuration loaded successfully');
};

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  }
};
```

## Step 8: Main Application Entry Point

### Action 8.1: Create Application Entry
Create file: `src/index.ts`
```typescript
import { loadConfiguration } from './config';
import { startServer } from './server';
import { DatabaseService } from './services/database.service';
import { logger } from './utils/logger';

const main = async (): Promise<void> => {
  try {
    // Load configuration
    loadConfiguration();

    // Initialize database
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    // Start server
    const port = parseInt(process.env.PORT || '3001');
    await startServer(port);

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
};

main();
```

### Action 8.2: Create Database Service Stub
Create file: `src/services/database.service.ts`
```typescript
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';

export class DatabaseService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_SIZE || '10')
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.pool.query('SELECT 1');
      logger.info('Database connection established');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

## Step 9: Package Configuration

### Action 9.1: Update package.json
Create/Update file: `package.json`
```json
{
  "name": "engineering-manager-dashboard",
  "version": "1.0.0",
  "description": "Dashboard for engineering managers to track team activity",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "db:migrate": "ts-node src/database/migrate.ts",
    "db:seed": "ts-node src/database/seed.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.10.0",
    "dotenv": "^16.3.1",
    "winston": "^3.10.0",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "joi": "^17.10.1",
    "date-fns": "^2.30.0",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "@types/node": "^20.5.9",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.14",
    "@types/compression": "^1.7.3",
    "@types/pg": "^8.10.2",
    "@types/jsonwebtoken": "^9.0.3",
    "@types/bcrypt": "^5.0.0",
    "@types/lodash": "^4.14.198",
    "@types/jest": "^29.5.4",
    "typescript": "^5.2.2",
    "ts-node": "^10.9.1",
    "nodemon": "^3.0.1",
    "jest": "^29.6.4",
    "ts-jest": "^29.1.1",
    "eslint": "^8.48.0",
    "@typescript-eslint/parser": "^6.5.0",
    "@typescript-eslint/eslint-plugin": "^6.5.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^2.0.12"
  }
}
```

## Completion Checklist

Upon completing all actions in this phase, verify:

1. ✓ All directories created as specified
2. ✓ TypeScript configuration in place
3. ✓ All type definitions created (base, linear, github, dashboard)
4. ✓ Database schema and configuration ready
5. ✓ Express server with middleware stack configured
6. ✓ Error handling and logging infrastructure
7. ✓ Basic health check endpoints working
8. ✓ Testing framework configured
9. ✓ Environment configuration system in place
10. ✓ Package.json with all dependencies

## Verification Steps

Execute these commands to verify Phase 1 completion:

```bash
# Install dependencies
npm install

# Run TypeScript compilation
npm run build

# Run tests
npm test

# Start development server
npm run dev
```

The API should respond to:
- GET http://localhost:3001/api/health
- GET http://localhost:3001/api/health/detailed

## Next Phase Dependencies

This phase provides the foundation for:
- Phase 2: Linear integration (uses types, API structure, database)
- Phase 3: GitHub integration (uses types, API structure, database)
- Phase 4: Report generation (uses all types and API endpoints)
- Phase 5: Frontend (consumes API endpoints)

## Error Scenarios to Handle

The implementation includes handling for:
1. Database connection failures
2. Invalid environment configuration
3. Request validation errors
4. Rate limiting
5. Uncaught exceptions and promise rejections
6. Request timeout scenarios

All error responses follow the consistent ApiResponse format defined in base.types.ts.