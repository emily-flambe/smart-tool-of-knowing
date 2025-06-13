import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

export interface StoredPage {
  id: string;
  docId: string;
  pageId: string;
  docName: string;
  pageName: string;
  url: string;
  content: string;
  contentType: string;
  createdAt: string;
  updatedAt: string;
  extractedAt: number;
  contentLength: number;
}


export class CodaDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    const cacheDir = path.join(os.homedir(), '.team-coda-cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    this.dbPath = path.join(cacheDir, 'coda-pages.db');
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Create pages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        doc_id TEXT NOT NULL,
        page_id TEXT NOT NULL,
        doc_name TEXT NOT NULL,
        page_name TEXT NOT NULL,
        url TEXT NOT NULL,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        extracted_at INTEGER NOT NULL,
        content_length INTEGER NOT NULL,
        UNIQUE(doc_id, page_id)
      )
    `);


    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_pages_doc_id ON pages(doc_id);
      CREATE INDEX IF NOT EXISTS idx_pages_extracted_at ON pages(extracted_at);
    `);
  }

  async storePage(page: Omit<StoredPage, 'id' | 'extractedAt' | 'contentLength'>): Promise<string> {
    const id = `${page.docId}-${page.pageId}`;
    const extractedAt = Date.now();
    const contentLength = page.content.length;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pages (
        id, doc_id, page_id, doc_name, page_name, url, content, 
        content_type, created_at, updated_at, extracted_at, content_length
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, page.docId, page.pageId, page.docName, page.pageName,
      page.url, page.content, page.contentType, page.createdAt,
      page.updatedAt, extractedAt, contentLength
    );

    return id;
  }

  async getPage(docId: string, pageId: string): Promise<StoredPage | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM pages WHERE doc_id = ? AND page_id = ?
    `);
    
    const row = stmt.get(docId, pageId) as any;
    if (!row) return null;

    return {
      id: row.id,
      docId: row.doc_id,
      pageId: row.page_id,
      docName: row.doc_name,
      pageName: row.page_name,
      url: row.url,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extractedAt: row.extracted_at,
      contentLength: row.content_length
    };
  }

  async getPageByUrl(url: string): Promise<StoredPage | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM pages WHERE url = ?
    `);
    
    const row = stmt.get(url) as any;
    if (!row) return null;

    return {
      id: row.id,
      docId: row.doc_id,
      pageId: row.page_id,
      docName: row.doc_name,
      pageName: row.page_name,
      url: row.url,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extractedAt: row.extracted_at,
      contentLength: row.content_length
    };
  }


  async getAllPages(): Promise<StoredPage[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM pages ORDER BY extracted_at DESC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(row => ({
      id: row.id,
      docId: row.doc_id,
      pageId: row.page_id,
      docName: row.doc_name,
      pageName: row.page_name,
      url: row.url,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extractedAt: row.extracted_at,
      contentLength: row.content_length
    }));
  }

  async getRecentPages(limit: number = 10): Promise<StoredPage[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM pages ORDER BY extracted_at DESC LIMIT ?
    `);
    
    const rows = stmt.all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      docId: row.doc_id,
      pageId: row.page_id,
      docName: row.doc_name,
      pageName: row.page_name,
      url: row.url,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extractedAt: row.extracted_at,
      contentLength: row.content_length
    }));
  }

  async searchPages(query: string): Promise<StoredPage[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM pages 
      WHERE page_name LIKE ? OR doc_name LIKE ? OR content LIKE ?
      ORDER BY extracted_at DESC
      LIMIT 20
    `);
    
    const searchTerm = `%${query}%`;
    const rows = stmt.all(searchTerm, searchTerm, searchTerm) as any[];
    
    return rows.map(row => ({
      id: row.id,
      docId: row.doc_id,
      pageId: row.page_id,
      docName: row.doc_name,
      pageName: row.page_name,
      url: row.url,
      content: row.content,
      contentType: row.content_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      extractedAt: row.extracted_at,
      contentLength: row.content_length
    }));
  }

  getStats(): { totalPages: number; totalContent: number; dbSize: number } {
    const pageCount = this.db.prepare('SELECT COUNT(*) as count FROM pages').get() as any;
    const contentStats = this.db.prepare('SELECT SUM(content_length) as total FROM pages').get() as any;
    
    const stats = fs.statSync(this.dbPath);
    
    return {
      totalPages: pageCount.count,
      totalContent: contentStats.total || 0,
      dbSize: stats.size
    };
  }

  close(): void {
    this.db.close();
  }
}