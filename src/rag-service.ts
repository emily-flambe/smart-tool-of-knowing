import { EmbeddingService, DocumentChunk, SimilarityResult } from './embedding-service.js';
import { CodaClient, CodaDoc, CodaTable, CodaRow, CodaPage } from './coda-client.js';
import { configManager } from './config.js';
import Anthropic from '@anthropic-ai/sdk';
import { CodaDatabase, StoredPage } from './coda-database.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface RAGContext {
  query: string;
  relevantChunks: SimilarityResult[];
  totalDocuments: number;
  searchDuration: number;
}

export interface RAGResponse {
  answer: string;
  context: RAGContext;
  confidence: 'high' | 'medium' | 'low';
  sources: Array<{
    docName: string;
    docId: string;
    similarity: number;
    chunkContent: string;
  }>;
}

export interface ExtractionResult {
  documentsProcessed: number;
  pagesExtracted: number;
  tableRowsExtracted: number;
  totalChunks: number;
  embeddingsGenerated: number;
  extractionTime: number;
}

export interface CacheMetadata {
  lastUpdated: number;
  totalChunks: number;
  documentsProcessed: number;
  options: {
    includeTableData: boolean;
    maxDocuments: number;
  };
}

export class RAGService {
  private embeddingService: EmbeddingService;
  private codaClient: CodaClient;
  private anthropic: Anthropic;
  private documentCache = new Map<string, DocumentChunk[]>();
  private cacheDir: string;

  constructor() {
    this.embeddingService = new EmbeddingService();
    
    const codaApiKey = configManager.getCodaApiKey();
    if (!codaApiKey) {
      throw new Error('Coda API key not configured. Run `team config setup` first.');
    }
    this.codaClient = new CodaClient(codaApiKey);

    const anthropicApiKey = configManager.getAnthropicApiKey();
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured. Run `team config setup` first.');
    }
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });

    // Set up cache directory
    this.cacheDir = path.join(os.homedir(), '.team-coda-cache');
    this.ensureCacheDirectory();
  }

  async initialize(): Promise<void> {
    await this.embeddingService.initialize();
  }

  async askQuestion(query: string, options: {
    maxDocuments?: number;
    includeTableData?: boolean;
    refreshCache?: boolean;
    focusOnDefaultDoc?: boolean;
    useFullContent?: boolean;
  } = {}): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      let relevantChunks: SimilarityResult[] = [];
      let totalDocuments = 0;

      if (options.useFullContent) {
        // Use full page content from database instead of vector chunks
        const fullPageResults = await this.searchFullPageContent(query);
        totalDocuments = fullPageResults.length;
        
        // Convert full pages to SimilarityResult format for compatibility
        relevantChunks = fullPageResults.map(page => ({
          chunk: {
            id: page.id,
            content: page.content,
            metadata: {
              docId: page.docId,
              docName: page.docName,
              chunkIndex: 0,
              source: 'page' as const,
              sourceId: page.pageId
            }
          },
          similarity: 1.0 // Full content always has max similarity
        }));
      } else {
        // Step 1: Get or build document chunks
        const chunks = await this.getDocumentChunks(options);

        // Step 2: Find relevant chunks using vector similarity
        relevantChunks = await this.embeddingService.findSimilarChunks(
          query,
          chunks,
          10, // Get top 10 chunks
          0.3  // Minimum similarity threshold
        );
        
        totalDocuments = await this.getTotalDocumentCount();
      }

      const searchDuration = Date.now() - startTime;

      if (relevantChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant information in your Coda documents to answer that question. Please try rephrasing your question or check if the relevant documents are accessible.",
          context: {
            query,
            relevantChunks: [],
            totalDocuments,
            searchDuration
          },
          confidence: 'low',
          sources: []
        };
      }

      // Step 3: Generate answer using Anthropic
      const answer = await this.generateAnswer(query, relevantChunks);

      // Step 4: Determine confidence based on similarity scores
      const avgSimilarity = relevantChunks.reduce((sum, r) => sum + r.similarity, 0) / relevantChunks.length;
      const confidence = this.determineConfidence(avgSimilarity, relevantChunks.length);

      // Step 5: Prepare sources
      const sources = relevantChunks.slice(0, 5).map(result => ({
        docName: result.chunk.metadata.docName,
        docId: result.chunk.metadata.docId,
        similarity: result.similarity,
        chunkContent: result.chunk.content.substring(0, 200) + (result.chunk.content.length > 200 ? '...' : '')
      }));

      return {
        answer,
        context: {
          query,
          relevantChunks,
          totalDocuments,
          searchDuration
        },
        confidence,
        sources
      };

    } catch (error: any) {
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  private async getDocumentChunks(options: {
    maxDocuments?: number;
    includeTableData?: boolean;
    refreshCache?: boolean;
    focusOnDefaultDoc?: boolean;
  }): Promise<DocumentChunk[]> {
    // Try to load from persistent cache first
    if (!options.refreshCache) {
      const cachedChunks = await this.loadCachedChunks();
      if (cachedChunks && cachedChunks.length > 0) {
        return cachedChunks;
      }
    }

    const allChunks: DocumentChunk[] = [];

    try {
      // Get documents from Coda
      let docsToProcess: CodaDoc[] = [];
      
      if (options.focusOnDefaultDoc) {
        const defaultDocId = configManager.getDefaultCodaDocId();
        if (defaultDocId) {
          try {
            const defaultDoc = await this.codaClient.getDoc(defaultDocId);
            docsToProcess = [defaultDoc];
          } catch (error) {
            console.warn(`Could not fetch default document ${defaultDocId}, falling back to all documents`);
            const docsResponse = await this.codaClient.listDocs(options.maxDocuments || 25);
            docsToProcess = docsResponse.items;
          }
        } else {
          const docsResponse = await this.codaClient.listDocs(options.maxDocuments || 25);
          docsToProcess = docsResponse.items;
        }
      } else {
        const docsResponse = await this.codaClient.listDocs(options.maxDocuments || 25);
        docsToProcess = docsResponse.items;
      }
      
      for (const doc of docsToProcess) {
        try {
          // For now, we'll create chunks based on document metadata
          // In a full implementation, we'd need to fetch actual content
          const docChunks = await this.createDocumentChunks(doc, options.includeTableData || false);
          allChunks.push(...docChunks);
        } catch (error: any) {
          console.warn(`Failed to process document ${doc.name}: ${error.message}`);
        }
      }

      // Generate embeddings for all chunks
      const embeddedChunks = await this.embeddingService.embedDocumentChunks(allChunks);
      
      // Cache the results in memory (persistent cache is handled separately)
      const cacheKey = `chunks-${options.maxDocuments || 'all'}-${options.includeTableData || false}`;
      this.documentCache.set(cacheKey, embeddedChunks);
      
      return embeddedChunks;

    } catch (error: any) {
      throw new Error(`Failed to get document chunks: ${error.message}`);
    }
  }

  private async createDocumentChunks(doc: CodaDoc, includeTableData: boolean): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // Create a chunk from document metadata
    const docSummary = `Document: ${doc.name}. Workspace: ${doc.workspace.name}. Owner: ${doc.owner.name}. Created: ${new Date(doc.createdAt).toLocaleDateString()}. Last updated: ${new Date(doc.updatedAt).toLocaleDateString()}.`;
    
    chunks.push({
      id: `${doc.id}-metadata`,
      content: docSummary,
      metadata: {
        docId: doc.id,
        docName: doc.name,
        chunkIndex: 0,
        source: 'page'
      }
    });

    // Fetch page metadata (but not content to avoid API errors)
    try {
      const pagesResponse = await this.codaClient.listPages(doc.id, 50);
      
      for (const page of pagesResponse.items) {
        try {
          // Add page metadata only
          const pageInfo = `Page: ${page.name} in document ${doc.name}. ${page.subtitle || ''}. Created: ${new Date(page.createdAt).toLocaleDateString()}. Updated: ${new Date(page.updatedAt).toLocaleDateString()}.`;
          chunks.push({
            id: `${doc.id}-page-${page.id}-metadata`,
            content: pageInfo,
            metadata: {
              docId: doc.id,
              docName: doc.name,
              chunkIndex: 0,
              source: 'page',
              sourceId: page.id
            }
          });

        } catch (error: any) {
          console.warn(`Failed to process page ${page.name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.warn(`Failed to fetch pages for document ${doc.name}: ${error.message}`);
    }

    // If including table data, fetch and chunk tables
    if (includeTableData) {
      try {
        const tablesResponse = await this.codaClient.listTables(doc.id, 10);
        
        for (const table of tablesResponse.items) {
          try {
            // Get first few rows of each table for content
            const rowsResponse = await this.codaClient.listRows(doc.id, table.id, 10);
            
            if (rowsResponse.items.length > 0) {
              const tableChunks = this.embeddingService.chunkTableData(
                rowsResponse.items,
                table.name,
                doc.id,
                doc.name
              );
              chunks.push(...tableChunks);
            }

            // Also add table metadata
            const columnNames = table.columns?.map(c => c.name).join(', ') || 'unknown columns';
            const tableInfo = `Table: ${table.name} in document ${doc.name}. Contains ${table.rowCount} rows with columns: ${columnNames}.`;
            chunks.push({
              id: `${doc.id}-table-${table.id}-info`,
              content: tableInfo,
              metadata: {
                docId: doc.id,
                docName: doc.name,
                chunkIndex: 0,
                source: 'table',
                sourceId: table.id
              }
            });

          } catch (error: any) {
            console.warn(`Failed to process table ${table.name}: ${error.message}`);
          }
        }
      } catch (error: any) {
        console.warn(`Failed to fetch tables for document ${doc.name}: ${error.message}`);
      }
    }

    return chunks;
  }

  private async generateAnswer(query: string, relevantChunks: SimilarityResult[]): Promise<string> {
    const context = relevantChunks
      .map((result, index) => `[${index + 1}] ${result.chunk.content}`)
      .join('\n\n');

    const prompt = `Based on the following information from Coda documents, please answer the user's question. If the information is not sufficient to provide a complete answer, please say so and explain what additional information might be needed.

Context from documents:
${context}

User question: ${query}

Please provide a helpful and accurate answer based on the context provided. If you reference specific information, mention which document or source it came from.`;

    try {
      const response = await this.anthropic.messages.create({
        model: configManager.getAnthropicModel(),
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const answerContent = response.content[0];
      if (answerContent.type === 'text') {
        return answerContent.text;
      } else {
        throw new Error('Unexpected response format from Anthropic');
      }

    } catch (error: any) {
      throw new Error(`Failed to generate answer: ${error.message}`);
    }
  }

  private determineConfidence(avgSimilarity: number, numChunks: number): 'high' | 'medium' | 'low' {
    if (avgSimilarity > 0.7 && numChunks >= 3) return 'high';
    if (avgSimilarity > 0.5 && numChunks >= 2) return 'medium';
    return 'low';
  }

  private async getTotalDocumentCount(): Promise<number> {
    try {
      const docsResponse = await this.codaClient.listDocs(1);
      // This is an approximation - in a real implementation we'd need pagination info
      return 25; // Default limit
    } catch (error) {
      return 0;
    }
  }

  clearCache(): void {
    this.documentCache.clear();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async extractAndCacheContent(options: {
    includeTableData?: boolean;
    maxDocuments?: number;
    forceRefresh?: boolean;
  } = {}): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    // Check if we need to refresh
    if (!options.forceRefresh) {
      const metadata = await this.getCacheMetadata();
      if (metadata && !this.isCacheStale(metadata)) {
        throw new Error('Cache is still fresh. Use --force to re-extract anyway.');
      }
    }

    const result: ExtractionResult = {
      documentsProcessed: 0,
      pagesExtracted: 0,
      tableRowsExtracted: 0,
      totalChunks: 0,
      embeddingsGenerated: 0,
      extractionTime: 0
    };

    try {
      // Get documents to process
      const defaultDocId = configManager.getDefaultCodaDocId();
      let docsToProcess: CodaDoc[] = [];
      
      if (defaultDocId) {
        try {
          const defaultDoc = await this.codaClient.getDoc(defaultDocId);
          docsToProcess = [defaultDoc];
        } catch (error) {
          console.warn(`Could not fetch default document ${defaultDocId}, falling back to all documents`);
          const docsResponse = await this.codaClient.listDocs(options.maxDocuments || 25);
          docsToProcess = docsResponse.items;
        }
      } else {
        const docsResponse = await this.codaClient.listDocs(options.maxDocuments || 25);
        docsToProcess = docsResponse.items;
      }

      const allChunks: DocumentChunk[] = [];
      result.documentsProcessed = docsToProcess.length;

      // Process each document
      for (const doc of docsToProcess) {
        try {
          const docChunks = await this.createDocumentChunksWithContent(doc, options.includeTableData || false);
          allChunks.push(...docChunks);
          
          // Count pages and table rows
          const pageChunks = docChunks.filter(c => c.metadata.source === 'page');
          const tableChunks = docChunks.filter(c => c.metadata.source === 'table');
          result.pagesExtracted += pageChunks.length;
          result.tableRowsExtracted += tableChunks.length;
        } catch (error: any) {
          console.warn(`Failed to process document ${doc.name}: ${error.message}`);
        }
      }

      // Generate embeddings
      const embeddedChunks = await this.embeddingService.embedDocumentChunks(allChunks);
      result.totalChunks = embeddedChunks.length;
      result.embeddingsGenerated = embeddedChunks.filter(c => c.embedding).length;

      // Save to cache
      await this.saveCachedChunks(embeddedChunks, {
        includeTableData: options.includeTableData || false,
        maxDocuments: options.maxDocuments || 25
      });

      result.extractionTime = Date.now() - startTime;
      return result;

    } catch (error: any) {
      throw new Error(`Failed to extract and cache content: ${error.message}`);
    }
  }

  private async createDocumentChunksWithContent(doc: CodaDoc, includeTableData: boolean): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];

    // Create a chunk from document metadata
    const docSummary = `Document: ${doc.name}. Workspace: ${doc.workspace.name}. Owner: ${doc.owner.name}. Created: ${new Date(doc.createdAt).toLocaleDateString()}. Last updated: ${new Date(doc.updatedAt).toLocaleDateString()}.`;
    
    chunks.push({
      id: `${doc.id}-metadata`,
      content: docSummary,
      metadata: {
        docId: doc.id,
        docName: doc.name,
        chunkIndex: 0,
        source: 'page'
      }
    });

    // Fetch pages and their actual content
    try {
      const pagesResponse = await this.codaClient.listPages(doc.id, 50);
      console.log(`Processing ${pagesResponse.items.length} pages for document ${doc.name}...`);
      
      for (let i = 0; i < pagesResponse.items.length; i++) {
        const page = pagesResponse.items[i];
        if (i % 10 === 0) {
          console.log(`  Processing page ${i + 1}/${pagesResponse.items.length}: ${page.name}`);
        }
        try {
          // Add shorter delay between requests to speed up bulk operations
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Get actual page content
          const pageContent = await this.codaClient.getPageContent(doc.id, page.id);
          
          if (pageContent && pageContent.trim()) {
            // Use the embedding service to chunk the page content
            const pageChunks = this.embeddingService.chunkDocument(
              pageContent,
              doc.id,
              doc.name,
              1000 // Max chunk size
            );
            
            // Update metadata to include page info
            pageChunks.forEach((chunk, index) => {
              chunk.id = `${doc.id}-page-${page.id}-chunk-${index}`;
              chunk.metadata.sourceId = page.id;
              chunk.content = `Page: ${page.name}\n\n${chunk.content}`;
            });
            
            chunks.push(...pageChunks);
          } else {
            // Fallback to page metadata if content is empty
            const pageInfo = `Page: ${page.name} in document ${doc.name}. ${page.subtitle || ''}. Created: ${new Date(page.createdAt).toLocaleDateString()}. Updated: ${new Date(page.updatedAt).toLocaleDateString()}.`;
            chunks.push({
              id: `${doc.id}-page-${page.id}-metadata`,
              content: pageInfo,
              metadata: {
                docId: doc.id,
                docName: doc.name,
                chunkIndex: 0,
                source: 'page',
                sourceId: page.id
              }
            });
          }

        } catch (error: any) {
          // Don't log every failure as it's noisy
          if (i % 10 === 0 || !error.message.includes('expired')) {
            console.warn(`Failed to get content for page ${page.name}: ${error.message}`);
          }
          // Add page metadata as fallback
          const pageInfo = `Page: ${page.name} in document ${doc.name}. ${page.subtitle || ''}. Created: ${new Date(page.createdAt).toLocaleDateString()}. Updated: ${new Date(page.updatedAt).toLocaleDateString()}.`;
          chunks.push({
            id: `${doc.id}-page-${page.id}-metadata`,
            content: pageInfo,
            metadata: {
              docId: doc.id,
              docName: doc.name,
              chunkIndex: 0,
              source: 'page',
              sourceId: page.id
            }
          });
        }
      }
    } catch (error: any) {
      console.warn(`Failed to fetch pages for document ${doc.name}: ${error.message}`);
    }

    // If including table data, fetch and chunk tables
    if (includeTableData) {
      try {
        const tablesResponse = await this.codaClient.listTables(doc.id, 10);
        
        for (const table of tablesResponse.items) {
          try {
            // Get first few rows of each table for content
            const rowsResponse = await this.codaClient.listRows(doc.id, table.id, 10);
            
            if (rowsResponse.items.length > 0) {
              const tableChunks = this.embeddingService.chunkTableData(
                rowsResponse.items,
                table.name,
                doc.id,
                doc.name
              );
              chunks.push(...tableChunks);
            }

            // Also add table metadata
            const columnNames = table.columns?.map(c => c.name).join(', ') || 'unknown columns';
            const tableInfo = `Table: ${table.name} in document ${doc.name}. Contains ${table.rowCount} rows with columns: ${columnNames}.`;
            chunks.push({
              id: `${doc.id}-table-${table.id}-info`,
              content: tableInfo,
              metadata: {
                docId: doc.id,
                docName: doc.name,
                chunkIndex: 0,
                source: 'table',
                sourceId: table.id
              }
            });

          } catch (error: any) {
            console.warn(`Failed to process table ${table.name}: ${error.message}`);
          }
        }
      } catch (error: any) {
        console.warn(`Failed to fetch tables for document ${doc.name}: ${error.message}`);
      }
    }

    return chunks;
  }

  private async loadCachedChunks(): Promise<DocumentChunk[] | null> {
    const chunksFile = path.join(this.cacheDir, 'chunks.json');
    
    try {
      if (fs.existsSync(chunksFile)) {
        const data = fs.readFileSync(chunksFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load cached chunks:', error);
    }
    
    return null;
  }

  private async saveCachedChunks(chunks: DocumentChunk[], options: { includeTableData: boolean; maxDocuments: number }): Promise<void> {
    const chunksFile = path.join(this.cacheDir, 'chunks.json');
    const metadataFile = path.join(this.cacheDir, 'metadata.json');
    
    try {
      // Save chunks
      fs.writeFileSync(chunksFile, JSON.stringify(chunks, null, 2));
      
      // Save metadata
      const metadata: CacheMetadata = {
        lastUpdated: Date.now(),
        totalChunks: chunks.length,
        documentsProcessed: new Set(chunks.map(c => c.metadata.docId)).size,
        options
      };
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn('Failed to save cached chunks:', error);
    }
  }

  private async getCacheMetadata(): Promise<CacheMetadata | null> {
    const metadataFile = path.join(this.cacheDir, 'metadata.json');
    
    try {
      if (fs.existsSync(metadataFile)) {
        const data = fs.readFileSync(metadataFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load cache metadata:', error);
    }
    
    return null;
  }

  private isCacheStale(metadata: CacheMetadata): boolean {
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - metadata.lastUpdated > oneWeekMs;
  }

  async getCacheStatus(): Promise<{ exists: boolean; isStale: boolean; metadata?: CacheMetadata }> {
    const metadata = await this.getCacheMetadata();
    const chunksFile = path.join(this.cacheDir, 'chunks.json');
    const exists = fs.existsSync(chunksFile) && metadata !== null;
    
    return {
      exists,
      isStale: exists && metadata ? this.isCacheStale(metadata) : false,
      metadata: metadata || undefined
    };
  }

  private async searchFullPageContent(query: string): Promise<StoredPage[]> {
    const db = new CodaDatabase();
    try {
      // Search for pages that match the query
      const pages = await db.searchPages(query);
      
      // Limit to top 5 most relevant pages to avoid context overflow
      return pages.slice(0, 5);
    } finally {
      db.close();
    }
  }
}