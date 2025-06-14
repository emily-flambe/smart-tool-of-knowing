import { DataExtractor, UnifiedContent, CodaContent } from '../unified-types.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface CodaFrontmatter {
  title: string;
  page_id: string;
  doc_id: string;
  doc_name: string;
  url: string;
  content_type: string;
  parent_page_id: string | null;
  parent_page_name: string | null;
  is_subpage: boolean;
  created_at: string;
  updated_at: string;
  extracted_at: string;
}

export class CodaExtractor implements DataExtractor {
  source = 'coda' as const;
  private dataDirectory: string;

  constructor(dataDirectory: string = './data/coda') {
    this.dataDirectory = dataDirectory;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const files = readdirSync(this.dataDirectory);
      return files.length > 0;
    } catch {
      return false;
    }
  }

  async extract(): Promise<UnifiedContent[]> {
    const content: UnifiedContent[] = [];

    try {
      const files = readdirSync(this.dataDirectory);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      for (const file of markdownFiles) {
        const filePath = join(this.dataDirectory, file);
        const fileContent = readFileSync(filePath, 'utf-8');
        const unifiedContent = this.parseMarkdownFile(fileContent, file);
        
        if (unifiedContent) {
          content.push(unifiedContent);
        }
      }

      return content;
    } catch (error) {
      throw new Error(`Coda extraction failed: ${error}`);
    }
  }

  async incrementalSync(lastSyncTime: string): Promise<UnifiedContent[]> {
    const content: UnifiedContent[] = [];

    try {
      const files = readdirSync(this.dataDirectory);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      for (const file of markdownFiles) {
        const filePath = join(this.dataDirectory, file);
        const stats = statSync(filePath);
        
        // Only process files modified since last sync
        if (stats.mtime.toISOString() > lastSyncTime) {
          const fileContent = readFileSync(filePath, 'utf-8');
          const unifiedContent = this.parseMarkdownFile(fileContent, file);
          
          if (unifiedContent) {
            content.push(unifiedContent);
          }
        }
      }

      return content;
    } catch (error) {
      throw new Error(`Coda incremental sync failed: ${error}`);
    }
  }

  private parseMarkdownFile(fileContent: string, filename: string): CodaContent | null {
    try {
      // Extract frontmatter and content
      const frontmatterMatch = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      
      if (!frontmatterMatch) {
        console.warn(`No frontmatter found in ${filename}`);
        return null;
      }

      const [, frontmatterYaml, markdownContent] = frontmatterMatch;
      const frontmatter = this.parseFrontmatter(frontmatterYaml);
      
      if (!frontmatter) {
        console.warn(`Invalid frontmatter in ${filename}`);
        return null;
      }

      // Determine content type
      const contentType = this.mapContentType(frontmatter.content_type);
      
      // Build searchable text
      const searchableText = [
        frontmatter.title,
        markdownContent,
        frontmatter.doc_name,
        frontmatter.parent_page_name || ''
      ].join(' ').toLowerCase().replace(/[#*`\[\]()]/g, '');

      // Extract keywords from content
      const keywords = this.extractKeywords(frontmatter, markdownContent);

      // Determine parent ID if this is a subpage
      const parentId = frontmatter.parent_page_id 
        ? `coda-page-${frontmatter.parent_page_id}`
        : frontmatter.doc_id !== frontmatter.page_id 
          ? `coda-document-${frontmatter.doc_id}`
          : undefined;

      const extractedAt = new Date().toISOString();

      return {
        metadata: {
          id: `coda-${frontmatter.content_type}-${frontmatter.page_id}`,
          source: 'coda',
          contentType,
          title: frontmatter.title,
          description: this.extractDescription(markdownContent),
          url: frontmatter.url,
          createdAt: frontmatter.created_at,
          updatedAt: frontmatter.updated_at,
          extractedAt,
          parentId,
          sourceMetadata: {
            docId: frontmatter.doc_id,
            docName: frontmatter.doc_name,
            pageId: frontmatter.page_id,
            isSubpage: frontmatter.is_subpage,
            parentPageId: frontmatter.parent_page_id || undefined,
            parentPageName: frontmatter.parent_page_name || undefined
          }
        },
        content: markdownContent,
        searchableText,
        keywords,
        structuredData: {
          contentType: frontmatter.content_type,
          documentName: frontmatter.doc_name,
          isSubpage: frontmatter.is_subpage,
          codaSpecific: {
            originalContentType: frontmatter.content_type,
            docId: frontmatter.doc_id,
            pageId: frontmatter.page_id,
            parentInfo: frontmatter.parent_page_id ? {
              id: frontmatter.parent_page_id,
              name: frontmatter.parent_page_name
            } : undefined
          }
        }
      };
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
      return null;
    }
  }

  private parseFrontmatter(yaml: string): CodaFrontmatter | null {
    try {
      const lines = yaml.trim().split('\n');
      const frontmatter: any = {};

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        // Handle different value types
        if (value === 'null' || value === '') {
          frontmatter[key] = null;
        } else if (value === 'true') {
          frontmatter[key] = true;
        } else if (value === 'false') {
          frontmatter[key] = false;
        } else {
          frontmatter[key] = value;
        }
      }

      // Validate required fields
      const required = ['title', 'page_id', 'doc_id', 'doc_name', 'url', 'content_type', 'created_at', 'updated_at'];
      for (const field of required) {
        if (!frontmatter[field]) {
          console.warn(`Missing required field ${field} in frontmatter`);
          return null;
        }
      }

      return frontmatter as CodaFrontmatter;
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return null;
    }
  }

  private mapContentType(codaContentType: string): 'coda-document' | 'coda-page' | 'coda-canvas' | 'coda-table' {
    switch (codaContentType.toLowerCase()) {
      case 'canvas':
        return 'coda-canvas';
      case 'table':
        return 'coda-table';
      case 'document':
        return 'coda-document';
      default:
        return 'coda-page';
    }
  }

  private extractDescription(content: string): string | undefined {
    // Try to find the first paragraph or meaningful content
    const lines = content.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip headers, empty lines, and markdown syntax
      if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('---')) {
        continue;
      }
      
      // Return first meaningful line as description
      if (trimmed.length > 20) {
        return trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '');
      }
    }
    
    return undefined;
  }

  private extractKeywords(frontmatter: CodaFrontmatter, content: string): string[] {
    const keywords = new Set<string>();
    
    // Add document and page names
    keywords.add(frontmatter.doc_name);
    keywords.add(frontmatter.title);
    
    if (frontmatter.parent_page_name) {
      keywords.add(frontmatter.parent_page_name);
    }
    
    // Extract keywords from content
    const contentWords = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);
    
    // Add common technical terms and important words
    const importantTerms = [
      'deployment', 'production', 'staging', 'development', 'setup', 'configuration',
      'database', 'api', 'authentication', 'security', 'incident', 'outage',
      'performance', 'monitoring', 'testing', 'deployment', 'infrastructure',
      'team', 'process', 'workflow', 'documentation', 'guide', 'tutorial'
    ];
    
    for (const word of contentWords) {
      if (importantTerms.includes(word) || 
          this.isCapitalizedTerm(content, word) ||
          this.isRepeatedTerm(contentWords, word)) {
        keywords.add(word);
      }
    }
    
    // Limit to most relevant keywords
    return Array.from(keywords).slice(0, 20);
  }

  private isCapitalizedTerm(content: string, word: string): boolean {
    // Check if the word appears capitalized in the original content
    const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
    return content.includes(capitalizedWord);
  }

  private isRepeatedTerm(words: string[], word: string): boolean {
    // Check if the word appears multiple times (indicates importance)
    const count = words.filter(w => w === word).length;
    return count >= 3;
  }
}