# Phase 6: Production Readiness & Optimization - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for optimizing performance, implementing caching strategies, securing the application, and preparing for production deployment. Execute each step sequentially after completing Phase 5.

## Prerequisites
- All previous phases completed
- Redis installed for caching
- Docker installed for containerization
- Production hosting environment identified

## Step 1: Redis Caching Implementation

### Action 1.1: Create Redis Configuration
Create file: `src/config/redis.config.ts`
```typescript
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: {
    default: number;
    teamData: number;
    issueData: number;
    prData: number;
    reportData: number;
    correlations: number;
  };
}

export const getRedisConfig = (): RedisConfig => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'eng-dashboard:',
  ttl: {
    default: 300, // 5 minutes
    teamData: 3600, // 1 hour
    issueData: 600, // 10 minutes
    prData: 600, // 10 minutes
    reportData: 86400, // 24 hours
    correlations: 1800, // 30 minutes
  }
});
```

### Action 1.2: Create Redis Service
Create file: `src/services/cache/redis.service.ts`
```typescript
import Redis from 'ioredis';
import { getRedisConfig } from '../../config/redis.config';
import { logger } from '../../utils/logger';
import { compress, decompress } from '../../utils/compression';

export class RedisService {
  private client: Redis;
  private config = getRedisConfig();
  private isConnected = false;

  constructor() {
    this.client = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.info('Redis connection closed');
      this.isConnected = false;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      // Decompress if needed
      if (data.startsWith('COMPRESSED:')) {
        const compressed = data.slice(11);
        const decompressed = await decompress(compressed);
        return JSON.parse(decompressed);
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string, 
    value: T, 
    ttl?: number,
    compress = true
  ): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      let data = JSON.stringify(value);
      
      // Compress large data
      if (compress && data.length > 1024) {
        const compressed = await compress(data);
        data = `COMPRESSED:${compressed}`;
      }

      const expiry = ttl || this.config.ttl.default;
      await this.client.setex(key, expiry, data);
      
      return true;
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const keys = await this.client.keys(`${this.config.keyPrefix}${pattern}`);
      if (keys.length === 0) return 0;

      // Remove prefix from keys
      const cleanKeys = keys.map(k => k.replace(this.config.keyPrefix, ''));
      const deleted = await this.client.del(...cleanKeys);
      
      return deleted;
    } catch (error) {
      logger.error(`Redis delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, ttl?: number): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      const value = await this.client.incr(key);
      if (ttl) {
        await this.client.expire(key, ttl);
      }
      return value;
    } catch (error) {
      logger.error(`Redis increment error for key ${key}:`, error);
      return 0;
    }
  }

  async getHealth(): Promise<{
    connected: boolean;
    memoryUsage?: string;
    uptime?: number;
  }> {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const uptimeInfo = await this.client.info('server');
      const uptimeMatch = uptimeInfo.match(/uptime_in_seconds:(\d+)/);

      return {
        connected: true,
        memoryUsage: memoryMatch ? memoryMatch[1].trim() : undefined,
        uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : undefined
      };
    } catch (error) {
      return { connected: false };
    }
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

// Singleton instance
export const redisService = new RedisService();
```

### Action 1.3: Create Cache Decorator
Create file: `src/utils/cache.decorator.ts`
```typescript
import { redisService } from '../services/cache/redis.service';
import { logger } from './logger';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
  compress?: boolean;
  invalidateOn?: string[];
}

export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const cacheKey = generateCacheKey(
        target.constructor.name,
        propertyKey,
        args,
        options.keyPrefix
      );

      // Try to get from cache
      const cached = await redisService.get(cacheKey);
      if (cached !== null) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }

      // Execute original method
      logger.debug(`Cache miss for ${cacheKey}`);
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await redisService.set(
        cacheKey,
        result,
        options.ttl,
        options.compress !== false
      );

      return result;
    };

    return descriptor;
  };
}

export function CacheInvalidate(patterns: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Invalidate cache patterns
      for (const pattern of patterns) {
        const count = await redisService.deletePattern(pattern);
        logger.debug(`Invalidated ${count} cache entries for pattern: ${pattern}`);
      }

      return result;
    };

    return descriptor;
  };
}

function generateCacheKey(
  className: string,
  methodName: string,
  args: any[],
  prefix?: string
): string {
  const baseKey = `${className}:${methodName}`;
  const argsHash = crypto
    .createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex');
  
  return prefix ? `${prefix}:${baseKey}:${argsHash}` : `${baseKey}:${argsHash}`;
}
```

### Action 1.4: Apply Caching to Services
Update file: `src/services/dashboard/dashboard.service.ts`
Add caching decorators:
```typescript
import { Cacheable, CacheInvalidate } from '../../utils/cache.decorator';

export class DashboardService {
  // ... existing code ...

  @Cacheable({ ttl: 600, keyPrefix: 'team-activity' })
  async getTeamActivity(
    userId: string,
    teamId: string,
    filter: DashboardFilter
  ): Promise<EngineerActivity[]> {
    // ... existing implementation ...
  }

  @Cacheable({ ttl: 1800, keyPrefix: 'sprint-summary' })
  async getCurrentSprintSummary(
    userId: string,
    teamId: string
  ): Promise<SprintSummary> {
    // ... existing implementation ...
  }

  @CacheInvalidate(['team-activity:*', 'sprint-summary:*'])
  async syncTeamData(userId: string, teamId: string): Promise<any> {
    // ... existing implementation ...
  }
}
```

## Step 2: Database Query Optimization

### Action 2.1: Create Database Indexes
Create file: `src/database/migrations/005_add_performance_indexes.sql`
```sql
-- Performance indexes for common queries

-- Engineers table
CREATE INDEX idx_engineers_active_team ON engineers(is_active, team_id) WHERE is_active = true;
CREATE INDEX idx_engineers_linear_github ON engineers(linear_user_id, github_username);

-- Linear sync status
CREATE INDEX idx_linear_sync_last_success ON linear_sync_status(last_successful_sync_at DESC);

-- GitHub sync status  
CREATE INDEX idx_github_sync_last_success ON github_sync_status(last_successful_sync_at DESC);

-- OAuth tokens
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- Cache entries
CREATE INDEX idx_cache_expires_key ON cache_entries(expires_at, cache_key);

-- PR correlations
CREATE INDEX idx_correlations_confidence_type ON pr_issue_correlations(confidence DESC, correlation_type);

-- Generated reports
CREATE INDEX idx_reports_team_date ON generated_reports(team_id, generated_at DESC);
CREATE INDEX idx_reports_type_date ON generated_reports(type, generated_at DESC);

-- Composite indexes for common joins
CREATE INDEX idx_engineers_team_active ON engineers(team_id, is_active, linear_user_id);
CREATE INDEX idx_correlations_pr_confidence ON pr_issue_correlations(github_pr_id, confidence DESC);

-- Partial indexes for specific queries
CREATE INDEX idx_reports_recent ON generated_reports(generated_at DESC) 
WHERE generated_at > CURRENT_DATE - INTERVAL '30 days';

-- Function-based index for case-insensitive searches
CREATE INDEX idx_engineers_email_lower ON engineers(LOWER(email));

-- Analyze tables to update statistics
ANALYZE engineers;
ANALYZE teams;
ANALYZE linear_sync_status;
ANALYZE github_sync_status;
ANALYZE pr_issue_correlations;
ANALYZE generated_reports;
```

### Action 2.2: Create Query Optimization Service
Create file: `src/services/database/queryOptimizer.ts`
```typescript
import { Pool, QueryResult } from 'pg';
import { logger } from '../../utils/logger';

export class QueryOptimizer {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async analyzeSlowQueries(): Promise<Array<{
    query: string;
    calls: number;
    totalTime: number;
    meanTime: number;
  }>> {
    const result = await this.pool.query(`
      SELECT 
        query,
        calls,
        total_time as "totalTime",
        mean_time as "meanTime"
      FROM pg_stat_statements
      WHERE mean_time > 100 -- queries taking more than 100ms
      ORDER BY mean_time DESC
      LIMIT 20
    `);

    return result.rows;
  }

  async getTableStats(): Promise<Array<{
    tableName: string;
    rowCount: number;
    tableSize: string;
    indexSize: string;
    totalSize: string;
  }>> {
    const result = await this.pool.query(`
      SELECT
        schemaname || '.' || tablename as "tableName",
        n_live_tup as "rowCount",
        pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) as "tableSize",
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as "indexSize",
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "totalSize"
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `);

    return result.rows;
  }

  async getMissingIndexes(): Promise<Array<{
    tableName: string;
    columnName: string;
    timesUsed: number;
  }>> {
    // This is a simplified version - in production you'd use more sophisticated analysis
    const result = await this.pool.query(`
      SELECT 
        schemaname || '.' || tablename as "tableName",
        attname as "columnName",
        n_distinct as "timesUsed"
      FROM pg_stats
      WHERE schemaname = 'public'
        AND n_distinct > 100
        AND correlation < 0.1
      ORDER BY n_distinct DESC
      LIMIT 10
    `);

    return result.rows;
  }

  async vacuum(tableName?: string): Promise<void> {
    if (tableName) {
      await this.pool.query(`VACUUM ANALYZE ${tableName}`);
      logger.info(`Vacuumed table: ${tableName}`);
    } else {
      await this.pool.query('VACUUM ANALYZE');
      logger.info('Vacuumed all tables');
    }
  }

  async reindex(tableName?: string): Promise<void> {
    if (tableName) {
      await this.pool.query(`REINDEX TABLE ${tableName}`);
      logger.info(`Reindexed table: ${tableName}`);
    } else {
      await this.pool.query('REINDEX DATABASE CURRENT');
      logger.info('Reindexed entire database');
    }
  }

  // Connection pooling optimization
  async optimizeConnectionPool(): Promise<void> {
    const currentConfig = await this.pool.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name IN ('max_connections', 'shared_buffers', 'effective_cache_size')
    `);

    logger.info('Current database configuration:', currentConfig.rows);

    // Recommendations based on system resources
    const recommendations = {
      max_connections: 100,
      shared_buffers: '256MB',
      effective_cache_size: '1GB'
    };

    logger.info('Recommended configuration:', recommendations);
  }
}
```

### Action 2.3: Create Database Connection Pool
Update file: `src/services/database.service.ts`
```typescript
import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';
import { config } from '../config';
import { QueryOptimizer } from './database/queryOptimizer';

export class DatabaseService {
  private pool: Pool;
  private queryOptimizer: QueryOptimizer;
  private queryCount = 0;
  private slowQueryThreshold = 100; // ms

  constructor() {
    const poolConfig: PoolConfig = {
      host: config.database.host,
      port: config.database.port,
      user: config.database.username,
      password: config.database.password,
      database: config.database.database,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      
      // Connection pool optimization
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      
      // Query timeout
      statement_timeout: 30000,
      query_timeout: 30000,
    };

    this.pool = new Pool(poolConfig);
    this.queryOptimizer = new QueryOptimizer(this.pool);
    
    this.setupEventHandlers();
    this.setupQueryLogging();
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (err, client) => {
      logger.error('Unexpected database error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      logger.debug('New database client connected');
    });

    this.pool.on('acquire', (client) => {
      logger.debug('Database client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      logger.debug('Database client removed from pool');
    });
  }

  private setupQueryLogging(): void {
    // Log slow queries
    const originalQuery = this.pool.query.bind(this.pool);
    
    this.pool.query = async (...args: any[]): Promise<any> => {
      const start = Date.now();
      this.queryCount++;
      
      try {
        const result = await originalQuery(...args);
        const duration = Date.now() - start;
        
        if (duration > this.slowQueryThreshold) {
          logger.warn('Slow query detected', {
            query: args[0],
            duration,
            params: args[1]
          });
        }
        
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        logger.error('Query failed', {
          query: args[0],
          duration,
          error
        });
        throw error;
      }
    };
  }

  async getPoolStats(): Promise<{
    total: number;
    idle: number;
    waiting: number;
    queryCount: number;
  }> {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      queryCount: this.queryCount
    };
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  getOptimizer(): QueryOptimizer {
    return this.queryOptimizer;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

## Step 3: API Performance Optimization

### Action 3.1: Create Compression Middleware
Create file: `src/middleware/compression.middleware.ts`
```typescript
import compression from 'compression';
import { Request, Response } from 'express';

export const compressionMiddleware = compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses larger than 1KB
  memLevel: 8,
  strategy: 0, // Default strategy
});
```

### Action 3.2: Create Response Cache Middleware
Create file: `src/middleware/responseCache.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/cache/redis.service';
import crypto from 'crypto';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
}

export function responseCache(options: CacheOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (options.condition && !options.condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req)
      : generateDefaultCacheKey(req);

    // Try to get from cache
    const cached = await redisService.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.json(cached);
    }

    // Store original send method
    const originalSend = res.json.bind(res);

    // Override json method to cache response
    res.json = function (body: any) {
      res.setHeader('X-Cache', 'MISS');
      
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisService.set(cacheKey, body, options.ttl || 300);
      }

      return originalSend(body);
    };

    next();
  };
}

function generateDefaultCacheKey(req: Request): string {
  const hash = crypto.createHash('md5');
  hash.update(req.method);
  hash.update(req.originalUrl);
  hash.update(JSON.stringify(req.query));
  hash.update(req.get('Authorization') || '');
  return `response:${hash.digest('hex')}`;
}
```

### Action 3.3: Apply Caching to Routes
Update file: `src/routes/dashboard.routes.ts`
```typescript
import { responseCache } from '../middleware/responseCache.middleware';

// Cache team activity for 5 minutes
dashboardRouter.get('/teams/:teamId/activity', 
  responseCache({ ttl: 300 }),
  asyncHandler(dashboardController.getTeamActivity)
);

// Cache sprint summary for 15 minutes
dashboardRouter.get('/teams/:teamId/sprint', 
  responseCache({ ttl: 900 }),
  asyncHandler(dashboardController.getCurrentSprint)
);

// Don't cache sync endpoints
dashboardRouter.post('/teams/:teamId/sync', 
  asyncHandler(dashboardController.syncTeamData)
);
```

## Step 4: Frontend Performance Optimization

### Action 4.1: Create Service Worker
Create file: `web/public/service-worker.js`
```javascript
const CACHE_NAME = 'eng-dashboard-v1';
const API_CACHE_NAME = 'eng-dashboard-api-v1';

const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API caching strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(request)
          .then((response) => {
            // Cache successful GET requests
            if (request.method === 'GET' && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Return cached version on network failure
            return cache.match(request);
          });
      })
    );
  } else {
    // Static assets - cache first
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    );
  }
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Action 4.2: Optimize React Components
Create file: `web/src/utils/performance.ts`
```typescript
import { lazy, Suspense, ComponentType } from 'react';

// Lazy load heavy components
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFunc);

  return (props: any) => (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

const LoadingFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
  </div>
);

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Virtual scrolling for large lists
export { FixedSizeList as VirtualList } from 'react-window';
```

### Action 4.3: Optimize Bundle Size
Update file: `web/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
    visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react', 'framer-motion'],
          'data-vendor': ['@tanstack/react-query', 'axios', 'date-fns'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

## Step 5: Security Hardening

### Action 5.1: Create Security Middleware
Create file: `src/middleware/security.middleware.ts`
```typescript
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.linear.app', 'https://api.github.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const generateNonce = (req: Request, res: Response, next: NextFunction) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize query parameters
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = sanitizeString(req.query[key] as string);
    }
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
}

function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = sanitizeString(obj[key]);
      } else {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}
```

### Action 5.2: Create API Key Authentication
Create file: `src/middleware/apiKey.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redisService } from '../services/cache/redis.service';
import { AppError } from './error.middleware';

interface ApiKey {
  id: string;
  key: string;
  name: string;
  scopes: string[];
  rateLimit: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

export class ApiKeyService {
  async generateApiKey(name: string, scopes: string[]): Promise<ApiKey> {
    const id = crypto.randomUUID();
    const key = `emd_${crypto.randomBytes(32).toString('hex')}`;
    
    const apiKey: ApiKey = {
      id,
      key,
      name,
      scopes,
      rateLimit: 1000, // requests per hour
      createdAt: new Date()
    };

    await redisService.set(`apikey:${key}`, apiKey, 0); // No expiry
    
    return apiKey;
  }

  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKey = await redisService.get<ApiKey>(`apikey:${key}`);
    
    if (apiKey) {
      // Update last used
      apiKey.lastUsedAt = new Date();
      await redisService.set(`apikey:${key}`, apiKey, 0);
    }
    
    return apiKey;
  }

  async checkRateLimit(key: string): Promise<boolean> {
    const count = await redisService.increment(`ratelimit:${key}`, 3600);
    const apiKey = await this.validateApiKey(key);
    
    return count <= (apiKey?.rateLimit || 1000);
  }
}

const apiKeyService = new ApiKeyService();

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(); // Continue to other auth methods
  }

  const validKey = await apiKeyService.validateApiKey(apiKey);
  
  if (!validKey) {
    throw new AppError(401, 'Invalid API key');
  }

  const withinLimit = await apiKeyService.checkRateLimit(apiKey);
  
  if (!withinLimit) {
    throw new AppError(429, 'API rate limit exceeded');
  }

  // Attach API key info to request
  (req as any).apiKey = validKey;
  
  next();
};
```

## Step 6: Docker Configuration

### Action 6.1: Create Dockerfile
Create file: `Dockerfile`
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY web/package*.json ./web/

# Install dependencies
RUN npm ci --only=production
RUN npm ci --prefix web --only=production

# Copy source code
COPY . .

# Build applications
RUN npm run build
RUN npm run build --prefix web

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built applications
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/dist ./web/dist

# Copy necessary files
COPY .env.example .env
COPY src/database/migrations ./src/database/migrations

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose ports
EXPOSE 3001 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command
CMD ["node", "dist/index.js"]
```

### Action 6.2: Create Docker Compose
Create file: `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: eng-dashboard-db
    environment:
      POSTGRES_USER: ${DB_USERNAME:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
      POSTGRES_DB: ${DB_NAME:-engineering_dashboard}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: eng-dashboard-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: eng-dashboard-api
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      REDIS_HOST: redis
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis123}
    env_file:
      - .env
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: eng-dashboard-nginx
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./web/dist:/usr/share/nginx/html:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Action 6.3: Create Nginx Configuration
Create file: `nginx.conf`
```nginx
events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

  # Upstream API
  upstream api {
    server api:3001;
    keepalive 32;
  }

  server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.linear.app https://api.github.com;" always;

    # Frontend
    location / {
      root /usr/share/nginx/html;
      try_files $uri $uri/ /index.html;
      
      # Cache static assets
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
      }
    }

    # API proxy
    location /api {
      limit_req zone=api burst=20 nodelay;
      
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_cache_bypass $http_upgrade;
      
      # Timeouts
      proxy_connect_timeout 60s;
      proxy_send_timeout 60s;
      proxy_read_timeout 60s;
    }

    # Auth endpoints with stricter rate limiting
    location /api/auth {
      limit_req zone=auth burst=5 nodelay;
      
      proxy_pass http://api;
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
      access_log off;
      return 200 "healthy\n";
    }
  }
}
```

## Step 7: Monitoring and Logging

### Action 7.1: Create Monitoring Service
Create file: `src/services/monitoring/metrics.service.ts`
```typescript
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Collect default metrics
collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

export const cacheHitRate = new Gauge({
  name: 'cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
});

export const linearApiCalls = new Counter({
  name: 'linear_api_calls_total',
  help: 'Total number of Linear API calls',
  labelNames: ['endpoint', 'status'],
});

export const githubApiCalls = new Counter({
  name: 'github_api_calls_total',
  help: 'Total number of GitHub API calls',
  labelNames: ['endpoint', 'status'],
});

export const reportGenerationDuration = new Histogram({
  name: 'report_generation_duration_seconds',
  help: 'Duration of report generation in seconds',
  labelNames: ['report_type', 'format'],
  buckets: [1, 5, 10, 30, 60],
});

// Middleware to track HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || 'unknown';
    const labels = {
      method: req.method,
      route,
      status: res.statusCode.toString(),
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
};

// Metrics endpoint handler
export const metricsHandler = async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

// Update cache metrics periodically
export const updateCacheMetrics = async (redisService: any) => {
  setInterval(async () => {
    const health = await redisService.getHealth();
    if (health.connected) {
      // This would need actual hit/miss tracking
      cacheHitRate.set({ cache_type: 'redis' }, 85); // Example value
    }
  }, 30000); // Every 30 seconds
};
```

### Action 7.2: Create Logging Configuration
Create file: `src/config/logging.config.ts`
```typescript
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logDir = process.env.LOG_DIR || 'logs';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create transports
const transports: winston.transport[] = [];

// Console transport
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error logs
  transports.push(
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    })
  );

  // Combined logs
  transports.push(
    new DailyRotateFile({
      filename: `${logDir}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
    })
  );

  // API access logs
  transports.push(
    new DailyRotateFile({
      filename: `${logDir}/access-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat,
      level: 'http',
    })
  );
}

// Create logger instance
export const createLogger = () => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: `${logDir}/exceptions.log` })
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: `${logDir}/rejections.log` })
    ],
  });
};

// Log rotation cleanup
export const setupLogRotation = () => {
  // This would be handled by the DailyRotateFile transport
  // Additional cleanup logic could go here
};
```

## Step 8: Deployment Scripts

### Action 8.1: Create Deployment Script
Create file: `scripts/deploy.sh`
```bash
#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}

echo "🚀 Deploying Engineering Dashboard - Environment: $ENVIRONMENT, Version: $VERSION"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
  export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)
fi

# Build and tag images
echo "📦 Building Docker images..."
docker build -t eng-dashboard:$VERSION .
docker tag eng-dashboard:$VERSION eng-dashboard:latest

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose run --rm api npm run db:migrate

# Deploy with zero-downtime
echo "🔄 Starting new containers..."
docker-compose up -d --no-deps --scale api=2 api

# Wait for health checks
echo "❤️  Waiting for health checks..."
sleep 10

# Check if new containers are healthy
HEALTH=$(docker-compose ps api | grep -c "healthy" || true)
if [ "$HEALTH" -lt 2 ]; then
  echo "❌ Health check failed. Rolling back..."
  docker-compose down
  exit 1
fi

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose rm -s -f api
docker-compose up -d --no-deps --scale api=1 api

# Clean up
echo "🧹 Cleaning up..."
docker system prune -f

echo "✅ Deployment complete!"
```

### Action 8.2: Create Health Check Endpoint
Update file: `src/controllers/health.controller.ts`
```typescript
import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';
import { redisService } from '../services/cache/redis.service';
import { LinearAuthService } from '../services/auth/linearAuth.service';
import { GitHubAuthService } from '../services/auth/githubAuth.service';

export class HealthController {
  // ... existing code ...

  checkDetailedHealth = async (req: Request, res: Response): Promise<void> => {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkLinearApi(),
      this.checkGitHubApi(),
    ]);

    const [database, redis, linear, github] = checks.map(result => 
      result.status === 'fulfilled' ? result.value : { status: 'down', error: result.reason }
    );

    const allHealthy = checks.every(check => 
      check.status === 'fulfilled' && check.value.status === 'up'
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      data: {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
        services: {
          database,
          redis,
          linear,
          github,
        },
        system: {
          memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024,
          },
          uptime: process.uptime(),
          cpu: process.cpuUsage(),
        },
      },
    });
  };

  private async checkDatabase(): Promise<any> {
    try {
      const poolStats = await this.databaseService.getPoolStats();
      const connected = await this.databaseService.checkConnection();
      
      return {
        status: connected ? 'up' : 'down',
        poolStats,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<any> {
    try {
      const health = await redisService.getHealth();
      return {
        status: health.connected ? 'up' : 'down',
        ...health,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkLinearApi(): Promise<any> {
    // Check if we can reach Linear API
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ viewer { id } }' }),
      });
      
      return {
        status: response.ok ? 'up' : 'down',
        responseTime: response.headers.get('x-response-time'),
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkGitHubApi(): Promise<any> {
    // Check if we can reach GitHub API
    try {
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      
      const data = await response.json();
      
      return {
        status: response.ok ? 'up' : 'down',
        rateLimit: data.rate,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }
}
```

## Completion Checklist

Upon completing Phase 6:

1. ✓ Redis caching implementation with decorators
2. ✓ Database query optimization and indexes
3. ✓ API performance optimization with compression and caching
4. ✓ Frontend optimization with service workers and lazy loading
5. ✓ Security hardening with headers and input sanitization
6. ✓ Docker configuration for containerization
7. ✓ Nginx reverse proxy with rate limiting
8. ✓ Monitoring with Prometheus metrics
9. ✓ Structured logging with rotation
10. ✓ Deployment scripts with health checks

## Verification Steps

```bash
# Build and run with Docker
docker-compose up --build

# Check health endpoint
curl http://localhost:3001/api/health/detailed

# View metrics
curl http://localhost:3001/metrics

# Run performance tests
npm run test:performance

# Check bundle size
cd web && npm run build -- --analyze
```

## Performance Benchmarks

After optimization, the application should meet these targets:

1. **API Response Times**:
   - Dashboard load: <200ms (cached), <1s (uncached)
   - Report generation: <10s for weekly reports
   - Search queries: <500ms

2. **Frontend Performance**:
   - First Contentful Paint: <1.5s
   - Time to Interactive: <3s
   - Bundle size: <500KB gzipped

3. **Scalability**:
   - Support 100+ concurrent users
   - Handle 1000+ requests/minute
   - 99.9% uptime

4. **Resource Usage**:
   - API container: <512MB RAM
   - Database connections: <50 concurrent
   - Redis memory: <1GB for typical usage

## Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **SSL Certificates**: Configure SSL for HTTPS
3. **Backup Strategy**: Implement database backup rotation
4. **Monitoring**: Set up alerts for key metrics
5. **Scaling**: Configure auto-scaling based on load
6. **CDN**: Use CDN for static assets
7. **DDoS Protection**: Implement rate limiting and IP blocking
8. **Secrets Management**: Use vault for sensitive data