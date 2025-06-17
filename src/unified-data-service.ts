import Database from 'better-sqlite3';
import { 
  UnifiedContent, 
  DataQuery, 
  DataQueryResult, 
  DataExtractor,
  SyncResult,
  DataSource,
  ContentType,
  Newsletter,
  NewsletterOptions,
  NewsletterSection,
  PlanningContext,
  PlanningReport,
  PlanningRecommendation
} from './unified-types.js';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export class UnifiedDataService {
  private db: Database.Database;
  private extractors: Map<DataSource, DataExtractor> = new Map();

  constructor(dbPath: string = './data/unified.db') {
    // Ensure the directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create main content table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS unified_content (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        content_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        extracted_at TEXT NOT NULL,
        parent_id TEXT,
        content TEXT NOT NULL,
        searchable_text TEXT NOT NULL,
        source_metadata TEXT NOT NULL,
        structured_data TEXT,
        keywords TEXT
      );
    `);

    // Create relationships table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS content_relationships (
        parent_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (parent_id, child_id, relationship_type),
        FOREIGN KEY (parent_id) REFERENCES unified_content(id),
        FOREIGN KEY (child_id) REFERENCES unified_content(id)
      );
    `);

    // Create sync history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        sync_time TEXT NOT NULL,
        items_processed INTEGER DEFAULT 0,
        items_added INTEGER DEFAULT 0,
        items_updated INTEGER DEFAULT 0,
        success INTEGER NOT NULL,
        errors TEXT
      );
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_source ON unified_content(source);
      CREATE INDEX IF NOT EXISTS idx_content_type ON unified_content(content_type);
      CREATE INDEX IF NOT EXISTS idx_created_at ON unified_content(created_at);
      CREATE INDEX IF NOT EXISTS idx_updated_at ON unified_content(updated_at);
      CREATE INDEX IF NOT EXISTS idx_parent_id ON unified_content(parent_id);
      CREATE INDEX IF NOT EXISTS idx_searchable_text ON unified_content(searchable_text);
    `);

    // TODO: Enable FTS for full-text search later
    // this.db.exec(`
    //   CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
    //     id,
    //     title,
    //     content,
    //     searchable_text,
    //     keywords,
    //     content=unified_content,
    //     content_rowid=rowid
    //   );
    // `);

    // // Create triggers to keep FTS table in sync
    // this.db.exec(`
    //   CREATE TRIGGER IF NOT EXISTS content_fts_insert AFTER INSERT ON unified_content BEGIN
    //     INSERT INTO content_fts(id, title, content, searchable_text, keywords)
    //     VALUES (new.id, new.title, new.content, new.searchable_text, new.keywords);
    //   END;
    // `);

    // this.db.exec(`
    //   CREATE TRIGGER IF NOT EXISTS content_fts_update AFTER UPDATE ON unified_content BEGIN
    //     UPDATE content_fts SET 
    //       title = new.title,
    //       content = new.content,
    //       searchable_text = new.searchable_text,
    //       keywords = new.keywords
    //     WHERE id = new.id;
    //   END;
    // `);

    // this.db.exec(`
    //   CREATE TRIGGER IF NOT EXISTS content_fts_delete AFTER DELETE ON unified_content BEGIN
    //     DELETE FROM content_fts WHERE id = old.id;
    //   END;
    // `);
  }

  // Extractor management
  registerExtractor(extractor: DataExtractor): void {
    this.extractors.set(extractor.source, extractor);
  }

  // Data storage operations
  storeContent(content: UnifiedContent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO unified_content (
        id, source, content_type, title, description, url,
        created_at, updated_at, extracted_at, parent_id,
        content, searchable_text, source_metadata, structured_data, keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        content.metadata.id,
        content.metadata.source,
        content.metadata.contentType,
        content.metadata.title,
        content.metadata.description || null,
        content.metadata.url || null,
        content.metadata.createdAt,
        content.metadata.updatedAt,
        content.metadata.extractedAt,
        content.metadata.parentId || null,
        content.content,
        content.searchableText,
        JSON.stringify(content.metadata.sourceMetadata),
        content.structuredData ? JSON.stringify(content.structuredData) : null,
        content.keywords.join(',')
      );
    } catch (error) {
      console.error('Error storing content:', content.metadata.id);
      console.error('Values:', {
        id: content.metadata.id,
        source: content.metadata.source,
        contentType: content.metadata.contentType,
        title: content.metadata.title,
        description: content.metadata.description,
        url: content.metadata.url,
        createdAt: content.metadata.createdAt,
        updatedAt: content.metadata.updatedAt,
        extractedAt: content.metadata.extractedAt,
        parentId: content.metadata.parentId,
        content: content.content?.length,
        searchableText: content.searchableText?.length,
        sourceMetadata: typeof content.metadata.sourceMetadata,
        structuredData: typeof content.structuredData,
        keywords: content.keywords
      });
      throw error;
    }

    // Store relationships
    if (content.metadata.childIds) {
      const relStmt = this.db.prepare(`
        INSERT OR REPLACE INTO content_relationships (parent_id, child_id, relationship_type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const childId of content.metadata.childIds) {
        relStmt.run(content.metadata.id, childId, 'parent-child', new Date().toISOString());
      }
    }

    if (content.metadata.relatedIds) {
      const relStmt = this.db.prepare(`
        INSERT OR REPLACE INTO content_relationships (parent_id, child_id, relationship_type, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const relatedId of content.metadata.relatedIds) {
        relStmt.run(content.metadata.id, relatedId, 'related', new Date().toISOString());
      }
    }
  }

  storeMultipleContent(contents: UnifiedContent[]): void {
    const transaction = this.db.transaction(() => {
      for (const content of contents) {
        this.storeContent(content);
      }
    });

    transaction();
  }

  // Query operations
  async query(query: DataQuery): Promise<DataQueryResult> {
    let sql = 'SELECT * FROM unified_content WHERE 1=1';
    const params: any[] = [];

    // Build WHERE clause
    if (query.sources && query.sources.length > 0) {
      sql += ` AND source IN (${query.sources.map(() => '?').join(',')})`;
      params.push(...query.sources);
    }

    if (query.contentTypes && query.contentTypes.length > 0) {
      sql += ` AND content_type IN (${query.contentTypes.map(() => '?').join(',')})`;
      params.push(...query.contentTypes);
    }

    if (query.timeRange) {
      const field = query.timeRange.field || 'createdAt';
      const dbField = field === 'createdAt' ? 'created_at' : 
                      field === 'updatedAt' ? 'updated_at' : 'extracted_at';
      sql += ` AND ${dbField} >= ? AND ${dbField} <= ?`;
      params.push(query.timeRange.start, query.timeRange.end);
    }

    if (query.textSearch) {
      // Simple text search without FTS for now
      sql += ` AND (searchable_text LIKE ? OR title LIKE ? OR content LIKE ?)`;
      const searchTerm = `%${query.textSearch}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add sorting
    const sortField = query.sortBy === 'createdAt' ? 'created_at' :
                      query.sortBy === 'updatedAt' ? 'updated_at' :
                      query.sortBy === 'priority' ? 'structured_data' : 'title';
    const sortOrder = query.sortOrder || 'desc';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;

    // Add pagination
    if (query.limit) {
      sql += ` LIMIT ?`;
      params.push(query.limit);
      
      if (query.offset) {
        sql += ` OFFSET ?`;
        params.push(query.offset);
      }
    }

    const items = this.db.prepare(sql).all(...params).map(this.rowToUnifiedContent);

    // Get total count for pagination
    let countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as count FROM');
    countSql = countSql.replace(/ORDER BY.*$/, '');
    countSql = countSql.replace(/LIMIT.*$/, '');
    
    // Remove limit and offset params from the count query
    let countParams = [...params];
    if (query.limit) {
      countParams = countParams.slice(0, -1); // remove limit
      if (query.offset) {
        countParams = countParams.slice(0, -1); // remove offset
      }
    }
    
    const countResult = this.db.prepare(countSql).get(...countParams) as { count: number };
    const totalCount = countResult.count;

    return {
      items,
      totalCount,
      hasMore: query.limit ? (query.offset || 0) + items.length < totalCount : false
    };
  }

  // Sync operations
  async syncAllSources(): Promise<SyncResult[]> {
    const results: SyncResult[] = [] // Will collect sync results from all sources;

    for (const [source, extractor] of this.extractors) {
      results.push(await this.syncSource(source));
    }

    return results;
  }

  async syncSource(source: DataSource): Promise<SyncResult> {
    const extractor = this.extractors.get(source);
    if (!extractor) {
      return {
        source,
        success: false,
        itemsProcessed: 0,
        itemsAdded: 0,
        itemsUpdated: 0,
        errors: [`No extractor registered for source: ${source}`],
        syncTime: new Date().toISOString()
      };
    }

    const syncTime = new Date().toISOString();
    let itemsProcessed = 0;
    let itemsAdded = 0;
    let itemsUpdated = 0;
    const errors: string[] = []; // Will collect any errors during sync

    try {
      // Check if we should do incremental sync
      const lastSync = this.getLastSuccessfulSync(source);
      let contents: UnifiedContent[];

      if (lastSync && extractor.incrementalSync) {
        contents = await extractor.incrementalSync(lastSync.sync_time);
      } else {
        contents = await extractor.extract();
      }

      itemsProcessed = contents.length;

      // Store contents and track additions vs updates
      for (const content of contents) {
        const existing = this.getContentById(content.metadata.id);
        if (existing) {
          itemsUpdated++;
        } else {
          itemsAdded++;
        }
        
        this.storeContent(content);
      }

      // Record successful sync
      this.recordSync(source, syncTime, itemsProcessed, itemsAdded, itemsUpdated, true, null);

      return {
        source,
        success: true,
        itemsProcessed,
        itemsAdded,
        itemsUpdated,
        errors,
        syncTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      // Record failed sync
      this.recordSync(source, syncTime, itemsProcessed, itemsAdded, itemsUpdated, false, errorMessage);

      return {
        source,
        success: false,
        itemsProcessed,
        itemsAdded,
        itemsUpdated,
        errors,
        syncTime
      };
    }
  }

  // Newsletter generation
  async generateNewsletter(options: NewsletterOptions): Promise<Newsletter> {
    const query: DataQuery = {
      timeRange: options.timeRange,
      sources: options.sources,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    };

    const result = await this.query(query);
    const sections: NewsletterSection[] = []; // Will be populated with newsletter sections
    
    // Group items based on groupBy option
    const grouped = this.groupItems(result.items, options.groupBy || 'source');
    
    for (const [groupKey, items] of Object.entries(grouped)) {
      sections.push({
        title: this.getGroupTitle(groupKey, options.groupBy || 'source'),
        items,
        metrics: this.calculateSectionMetrics(items)
      });
    }

    const overallMetrics = this.calculateOverallMetrics(result.items);

    return {
      title: `Activity Report: ${options.timeRange.start} to ${options.timeRange.end}`,
      timeRange: options.timeRange,
      sections,
      overallMetrics,
      generatedAt: new Date().toISOString()
    };
  }

  // Helper methods
  private rowToUnifiedContent(row: any): UnifiedContent {
    return {
      metadata: {
        id: row.id,
        source: row.source,
        contentType: row.content_type,
        title: row.title,
        description: row.description,
        url: row.url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        extractedAt: row.extracted_at,
        parentId: row.parent_id,
        sourceMetadata: JSON.parse(row.source_metadata)
      },
      content: row.content,
      searchableText: row.searchable_text,
      keywords: row.keywords ? row.keywords.split(',') : [],
      structuredData: row.structured_data ? JSON.parse(row.structured_data) : undefined
    };
  }

  private getContentById(id: string): UnifiedContent | null {
    const row = this.db.prepare('SELECT * FROM unified_content WHERE id = ?').get(id);
    return row ? this.rowToUnifiedContent(row) : null;
  }

  private getLastSuccessfulSync(source: DataSource): { sync_time: string } | null {
    return this.db.prepare(`
      SELECT sync_time FROM sync_history 
      WHERE source = ? AND success = 1 
      ORDER BY sync_time DESC 
      LIMIT 1
    `).get(source) as { sync_time: string } | null;
  }

  private recordSync(
    source: DataSource, 
    syncTime: string, 
    itemsProcessed: number, 
    itemsAdded: number, 
    itemsUpdated: number, 
    success: boolean, 
    errors: string | null
  ): void {
    this.db.prepare(`
      INSERT INTO sync_history (source, sync_time, items_processed, items_added, items_updated, success, errors)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(source, syncTime, itemsProcessed, itemsAdded, itemsUpdated, success ? 1 : 0, errors);
  }

  private groupItems(items: UnifiedContent[], groupBy: string): Record<string, UnifiedContent[]> {
    const grouped: Record<string, UnifiedContent[]> = {}; // Will group items by specified criteria

    for (const item of items) {
      let key: string;
      
      switch (groupBy) {
        case 'source':
          key = item.metadata.source;
          break;
        case 'contentType':
          key = item.metadata.contentType;
          break;
        case 'assignee':
          key = item.structuredData?.assignees?.[0]?.name || 'Unassigned';
          break;
        case 'project':
          key = item.structuredData?.project?.name || 'No Project';
          break;
        case 'cycle':
          key = item.structuredData?.cycle?.name || 'No Cycle';
          break;
        default:
          key = 'All Items';
      }

      if (!grouped[key]) {
        grouped[key] = []; // Initialize group for new key
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  private getGroupTitle(key: string, groupBy: string): string {
    switch (groupBy) {
      case 'source':
        return `${key.charAt(0).toUpperCase() + key.slice(1)} Updates`;
      case 'contentType':
        return key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      default:
        return key;
    }
  }

  private calculateSectionMetrics(items: UnifiedContent[]): any {
    return {
      totalItems: items.length,
      completedItems: items.filter(item => 
        item.structuredData?.status === 'completed' || 
        item.structuredData?.state === 'completed'
      ).length,
      inProgressItems: items.filter(item => 
        item.structuredData?.status === 'in_progress' || 
        item.structuredData?.state === 'in_progress'
      ).length
    };
  }

  private calculateOverallMetrics(items: UnifiedContent[]): any {
    const bySource: Record<string, number> = {};
    const byContentType: Record<string, number> = {};

    for (const item of items) {
      bySource[item.metadata.source] = (bySource[item.metadata.source] || 0) + 1;
      byContentType[item.metadata.contentType] = (byContentType[item.metadata.contentType] || 0) + 1;
    }

    return {
      totalItems: items.length,
      bySource,
      byContentType
    };
  }

  // Cleanup
  close(): void {
    this.db.close();
  }
}