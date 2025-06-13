import { pipeline, env } from '@xenova/transformers';

// Allow remote model loading for first-time setup
env.allowRemoteModels = true;
env.allowLocalModels = true;

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    docId: string;
    docName: string;
    chunkIndex: number;
    source: 'table' | 'page' | 'section';
    sourceId?: string;
  };
  embedding?: number[];
}

export interface SimilarityResult {
  chunk: DocumentChunk;
  similarity: number;
}

export class EmbeddingService {
  private embedder: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Use a lightweight, fast model for embeddings
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true, // Use quantized version for faster loading and less memory
      });
      this.initialized = true;
    } catch (error: any) {
      throw new Error(`Failed to initialize embedding model: ${error.message}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Clean and normalize the text
      const cleanText = this.cleanText(text);
      if (!cleanText.trim()) {
        throw new Error('Empty text provided for embedding');
      }

      // Generate embedding
      const output = await this.embedder(cleanText, { pooling: 'mean', normalize: true });
      
      // Convert tensor to array
      const embedding = Array.from(output.data as number[]);
      return embedding;
    } catch (error: any) {
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async embedDocumentChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    const embeddedChunks: DocumentChunk[] = [];

    for (const chunk of chunks) {
      try {
        const embedding = await this.generateEmbedding(chunk.content);
        embeddedChunks.push({
          ...chunk,
          embedding
        });
      } catch (error: any) {
        console.warn(`Failed to embed chunk ${chunk.id}: ${error.message}`);
        // Include chunk without embedding so it's not lost
        embeddedChunks.push(chunk);
      }
    }

    return embeddedChunks;
  }

  calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (normA * normB);
  }

  async findSimilarChunks(
    query: string, 
    chunks: DocumentChunk[], 
    topK: number = 5,
    threshold: number = 0.3
  ): Promise<SimilarityResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);

    // Calculate similarities
    const similarities: SimilarityResult[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) {
        continue; // Skip chunks without embeddings
      }

      const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding);
      
      if (similarity >= threshold) {
        similarities.push({
          chunk,
          similarity
        });
      }
    }

    // Sort by similarity (highest first) and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?;:()"']/g, '') // Remove special characters except common punctuation
      .trim()
      .substring(0, 8192); // Limit text length for embedding model
  }

  chunkDocument(content: string, docId: string, docName: string, maxChunkSize: number = 1000): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      // If adding this sentence would exceed the chunk size, finalize the current chunk
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          id: `${docId}-chunk-${chunkIndex}`,
          content: currentChunk.trim(),
          metadata: {
            docId,
            docName,
            chunkIndex,
            source: 'page'
          }
        });
        
        currentChunk = sentence;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    // Add the final chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        id: `${docId}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          docId,
          docName,
          chunkIndex,
          source: 'page'
        }
      });
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - can be improved with more sophisticated NLP
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.'); // Add period back
  }

  chunkTableData(rows: any[], tableName: string, docId: string, docName: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    rows.forEach((row, index) => {
      // Convert row to text representation
      const rowText = this.rowToText(row, tableName);
      
      if (rowText.trim()) {
        chunks.push({
          id: `${docId}-table-${tableName}-row-${index}`,
          content: rowText,
          metadata: {
            docId,
            docName,
            chunkIndex: index,
            source: 'table',
            sourceId: tableName
          }
        });
      }
    });

    return chunks;
  }

  private rowToText(row: any, tableName: string): string {
    const values = Object.entries(row.values || {})
      .map(([column, value]) => `${column}: ${this.valueToString(value)}`)
      .join(', ');
    
    return `Table ${tableName} - ${values}`;
  }

  private valueToString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}