export type DataSource = 'coda' | 'linear' | 'github';

export type ContentType = 
  // Coda types
  | 'coda-document' | 'coda-page' | 'coda-canvas' | 'coda-table'
  // Linear types  
  | 'linear-issue' | 'linear-project' | 'linear-cycle' | 'linear-team'
  // GitHub types
  | 'github-repository' | 'github-commit' | 'github-pull-request' | 'github-issue';

export interface UnifiedMetadata {
  id: string;
  source: DataSource;
  contentType: ContentType;
  title: string;
  description?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  extractedAt: string;
  
  // Relationships
  parentId?: string;
  childIds?: string[];
  relatedIds?: string[];
  
  // Source-specific metadata
  sourceMetadata: Record<string, any>;
}

export interface UnifiedContent {
  metadata: UnifiedMetadata;
  content: string;
  
  // Structured data for different content types
  structuredData?: {
    // Common fields
    tags?: string[];
    labels?: Array<{ name: string; color?: string; }>;
    assignees?: Array<{ name: string; email?: string; }>;
    
    // Status tracking
    status?: string;
    state?: string;
    priority?: number | string;
    
    // Dates and timeline
    startDate?: string;
    endDate?: string;
    dueDate?: string;
    
    // Metrics
    estimate?: number;
    actualTime?: number;
    
    // Source-specific structured data
    [key: string]: any;
  };
  
  // Full-text search fields
  searchableText: string;
  keywords: string[];
}

// Specialized interfaces for different content types
export interface CodaContent extends UnifiedContent {
  metadata: UnifiedMetadata & {
    source: 'coda';
    contentType: 'coda-document' | 'coda-page' | 'coda-canvas' | 'coda-table';
    sourceMetadata: {
      docId: string;
      docName: string;
      pageId: string;
      isSubpage: boolean;
      parentPageId?: string;
      parentPageName?: string;
    };
  };
}

export interface LinearContent extends UnifiedContent {
  metadata: UnifiedMetadata & {
    source: 'linear';
    contentType: 'linear-issue' | 'linear-project' | 'linear-cycle' | 'linear-team';
    sourceMetadata: {
      identifier?: string; // For issues (e.g., ENG-123)
      teamId?: string;
      teamName?: string;
      teamKey?: string;
      projectId?: string;
      cycleId?: string;
    };
  };
}

export interface GitHubContent extends UnifiedContent {
  metadata: UnifiedMetadata & {
    source: 'github';
    contentType: 'github-repository' | 'github-commit' | 'github-pull-request' | 'github-issue';
    sourceMetadata: {
      owner: string;
      repository: string;
      number?: number; // For PRs and issues
      sha?: string; // For commits
      branch?: string;
      baseBranch?: string; // For PRs
    };
  };
}

// Query and filter interfaces
export interface DataQuery {
  sources?: DataSource[];
  contentTypes?: ContentType[];
  timeRange?: {
    start: string;
    end: string;
    field?: 'createdAt' | 'updatedAt' | 'extractedAt';
  };
  textSearch?: string;
  filters?: {
    status?: string[];
    assignees?: string[];
    tags?: string[];
    priority?: (number | string)[];
  };
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface DataQueryResult {
  items: UnifiedContent[];
  totalCount: number;
  hasMore: boolean;
}

// Data extraction interfaces
export interface DataExtractor {
  source: DataSource;
  extract(): Promise<UnifiedContent[]>;
  incrementalSync?(lastSyncTime: string): Promise<UnifiedContent[]>;
  validateConnection?(): Promise<boolean>;
}

export interface SyncResult {
  source: DataSource;
  success: boolean;
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  errors: string[];
  syncTime: string;
}

// Newsletter and summary interfaces
export interface NewsletterOptions {
  timeRange: {
    start: string;
    end: string;
  };
  sources?: DataSource[];
  groupBy?: 'source' | 'contentType' | 'assignee' | 'project' | 'cycle';
  includeMetrics?: boolean;
  format?: 'markdown' | 'html' | 'text';
}

export interface NewsletterSection {
  title: string;
  items: UnifiedContent[];
  summary?: string;
  metrics?: {
    totalItems: number;
    completedItems?: number;
    inProgressItems?: number;
    [key: string]: any;
  };
}

export interface Newsletter {
  title: string;
  timeRange: {
    start: string;
    end: string;
  };
  sections: NewsletterSection[];
  overallMetrics: {
    totalItems: number;
    bySource: Record<DataSource, number>;
    byContentType: Record<ContentType, number>;
    [key: string]: any;
  };
  generatedAt: string;
}

// Planning and capacity interfaces
export interface PlanningContext {
  currentCycle?: LinearContent;
  upcomingCycles: LinearContent[];
  activeProjects: LinearContent[];
  teamCapacity: {
    [assignee: string]: {
      totalHours: number;
      allocatedHours: number;
      availableHours: number;
      velocity?: number; // Historical points per cycle
    };
  };
  roadmapItems: UnifiedContent[];
}

export interface PlanningRecommendation {
  type: 'capacity-warning' | 'priority-conflict' | 'roadmap-alignment' | 'suggestion';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  affectedItems: string[]; // Item IDs
  suggestedActions: string[];
}

export interface PlanningReport {
  context: PlanningContext;
  recommendations: PlanningRecommendation[];
  capacityAnalysis: {
    totalTeamCapacity: number;
    totalAllocated: number;
    utilizationRate: number;
    overallocatedMembers: string[];
    underallocatedMembers: string[];
  };
  roadmapAlignment: {
    alignedItems: number;
    misalignedItems: number;
    missingRoadmapItems: string[];
  };
  generatedAt: string;
}