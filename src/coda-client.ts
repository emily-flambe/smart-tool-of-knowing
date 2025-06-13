import axios, { AxiosInstance } from 'axios';

export interface CodaDoc {
  id: string;
  name: string;
  type: string;
  href: string;
  browserLink: string;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    type: string;
  };
  folder?: {
    id: string;
    name: string;
    type: string;
  };
  owner: {
    name: string;
    email: string;
  };
}

export interface CodaTable {
  id: string;
  name: string;
  type: string;
  href: string;
  browserLink: string;
  displayColumn: {
    id: string;
    name: string;
  };
  rowCount: number;
  columns: CodaColumn[];
}

export interface CodaColumn {
  id: string;
  name: string;
  type: string;
  display: boolean;
}

export interface CodaRow {
  id: string;
  name: string;
  index: number;
  browserLink: string;
  createdAt: string;
  updatedAt: string;
  values: Record<string, any>;
}

export interface CodaDocsResponse {
  items: CodaDoc[];
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface CodaTablesResponse {
  items: CodaTable[];
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface CodaRowsResponse {
  items: CodaRow[];
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface CodaPage {
  id: string;
  name: string;
  type: string;
  href: string;
  browserLink: string;
  subtitle?: string;
  createdAt: string;
  updatedAt: string;
  contentType: string;
  parent?: {
    id: string;
    name: string;
    type: string;
  };
  children?: {
    id: string;
    name: string;
    type: string;
  }[];
}

export interface CodaPagesResponse {
  items: CodaPage[];
  nextPageToken?: string;
  nextPageLink?: string;
}

export interface CodaUser {
  name: string;
  loginId: string;
  type: string;
  href: string;
  tokenName: string;
  scoped: boolean;
  pictureLink: string;
  workspace: {
    id: string;
    type: string;
    browserLink: string;
    name: string;
  };
}

export class CodaClient {
  private client: AxiosInstance;
  private baseUrl = 'https://coda.io/apis/v1';

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async validateApiKey(): Promise<CodaUser> {
    try {
      const response = await this.client.get('/whoami');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid Coda API key');
      }
      throw new Error(`Coda API Error: ${error.message}`);
    }
  }

  async listDocs(limit: number = 25): Promise<CodaDocsResponse> {
    try {
      const response = await this.client.get('/docs', {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda docs: ${error.response?.data?.message || error.message}`);
    }
  }

  async getDoc(docId: string): Promise<CodaDoc> {
    try {
      const response = await this.client.get(`/docs/${docId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda doc: ${error.response?.data?.message || error.message}`);
    }
  }

  async listTables(docId: string, limit: number = 25): Promise<CodaTablesResponse> {
    try {
      const response = await this.client.get(`/docs/${docId}/tables`, {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda tables: ${error.response?.data?.message || error.message}`);
    }
  }

  async getTable(docId: string, tableId: string): Promise<CodaTable> {
    try {
      const response = await this.client.get(`/docs/${docId}/tables/${tableId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda table: ${error.response?.data?.message || error.message}`);
    }
  }

  async listRows(docId: string, tableId: string, limit: number = 25): Promise<CodaRowsResponse> {
    try {
      const response = await this.client.get(`/docs/${docId}/tables/${tableId}/rows`, {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda rows: ${error.response?.data?.message || error.message}`);
    }
  }

  async getRow(docId: string, tableId: string, rowId: string): Promise<CodaRow> {
    try {
      const response = await this.client.get(`/docs/${docId}/tables/${tableId}/rows/${rowId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda row: ${error.response?.data?.message || error.message}`);
    }
  }

  async searchDocs(query: string, limit: number = 10): Promise<CodaDocsResponse> {
    try {
      const response = await this.client.get('/docs', {
        params: { 
          query,
          limit 
        }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to search Coda docs: ${error.response?.data?.message || error.message}`);
    }
  }

  async listPages(docId: string, limit: number = 25): Promise<CodaPagesResponse> {
    try {
      const response = await this.client.get(`/docs/${docId}/pages`, {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda pages: ${error.response?.data?.message || error.message}`);
    }
  }

  async getAllPages(docId: string): Promise<CodaPage[]> {
    const allPages: CodaPage[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 1000; // Safety limit to prevent infinite loops
    
    do {
      try {
        const params: any = { limit: 100 };
        if (nextPageToken) {
          // Use the correct parameter name for pagination
          params.nextPageToken = nextPageToken;
        }
        
        console.log(`[PAGINATION] Fetching page ${Math.floor(pageCount / 100) + 1} (${pageCount} pages so far)...`);
        const response = await this.client.get(`/docs/${docId}/pages`, { params });
        const pagesResponse: CodaPagesResponse = response.data;
        
        allPages.push(...pagesResponse.items);
        pageCount += pagesResponse.items.length;
        nextPageToken = pagesResponse.nextPageToken;
        
        console.log(`[PAGINATION] Found ${pagesResponse.items.length} pages, total: ${pageCount}, next token: ${nextPageToken ? 'yes' : 'no'}`);
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`[PAGINATION] Reached safety limit of ${maxPages} pages, stopping pagination`);
          break;
        }
        
        // Add delay to avoid rate limiting
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        throw new Error(`Failed to fetch all pages: ${error.response?.data?.message || error.message}`);
      }
    } while (nextPageToken);
    
    console.log(`[PAGINATION] Pagination complete. Total pages: ${allPages.length}`);
    return allPages;
  }

  async getPage(docId: string, pageId: string): Promise<CodaPage> {
    try {
      const response = await this.client.get(`/docs/${docId}/pages/${pageId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch Coda page: ${error.response?.data?.message || error.message}`);
    }
  }

  async getPageContent(docId: string, pageId: string): Promise<string> {
    // Try the new async export API first
    try {
      return await this.getPageContentAsync(docId, pageId);
    } catch (error: any) {
      // If async export fails, try fallback to old sync method
      if (error.message.includes('No request was found') || error.message.includes('expired')) {
        try {
          const response = await this.client.get(`/docs/${docId}/pages/${pageId}/export`, {
            params: { 
              outputFormat: 'markdown' 
            }
          });
          return response.data;
        } catch (fallbackError: any) {
          // If both methods fail, just return empty content instead of throwing
          console.warn(`Could not extract content for page ${pageId}: ${error.message}`);
          return '';
        }
      }
      throw error;
    }
  }

  private async getPageContentAsync(docId: string, pageId: string): Promise<string> {
    // Use raw fetch for the entire operation to avoid any axios issues
    const fetch = await import('node-fetch');
    const apiKey = this.client.defaults.headers['Authorization']?.toString().replace('Bearer ', '');
    
    console.log(`[EXPORT] Starting async export for page ${pageId}`);
    
    // Start the export
    const exportResponse = await fetch.default(`https://coda.io/apis/v1/docs/${docId}/pages/${pageId}/export`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ outputFormat: 'markdown' })
    });
    
    if (!exportResponse.ok) {
      throw new Error(`Export request failed: ${exportResponse.statusText}`);
    }
    
    const exportData = await exportResponse.json() as any;
    const statusUrl = exportData.href;
    console.log(`[EXPORT] Export started, status URL: ${statusUrl}`);
    
    // Poll for status using the proper endpoint from the response
    const maxAttempts = 30; // 30 attempts = ~60 seconds max wait time
    for (let i = 0; i < maxAttempts; i++) {
      // Always wait before checking status (exports need time to process)
      console.log(`[EXPORT] Waiting 2 seconds before status check ${i + 1}/${maxAttempts}...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second between polls
      
      const statusResponse = await fetch.default(statusUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!statusResponse.ok) {
        console.warn(`[EXPORT] Status check attempt ${i + 1} failed: ${statusResponse.statusText}`);
        if (i === maxAttempts - 1) {
          throw new Error(`Status check failed after ${maxAttempts} attempts: ${statusResponse.statusText}`);
        }
        continue; // Try again
      }
      
      const statusData = await statusResponse.json() as any;
      console.log(`[EXPORT] Status check ${i + 1}: ${statusData.status}`);
      
      if (statusData.status === 'complete') {
        console.log(`[EXPORT] Export complete, downloading content...`);
        // Download the content
        const downloadResponse = await fetch.default(statusData.downloadLink);
        
        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.statusText}`);
        }
        
        const buffer = await downloadResponse.arrayBuffer();
        console.log(`[EXPORT] Downloaded ${buffer.byteLength} bytes`);
        
        // The content is likely gzipped, try to decompress
        const zlib = await import('zlib');
        try {
          const decompressed = zlib.gunzipSync(Buffer.from(buffer));
          console.log(`[EXPORT] Decompressed to ${decompressed.length} characters`);
          return decompressed.toString('utf-8');
        } catch {
          // If decompression fails, try as plain text
          const plainText = Buffer.from(buffer).toString('utf-8');
          console.log(`[EXPORT] Using plain text (${plainText.length} characters)`);
          return plainText;
        }
      } else if (statusData.status === 'failed') {
        throw new Error(`Export failed: ${statusData.error || 'Unknown error'}`);
      }
      
      // Status is still 'inProgress', continue polling
    }
    
    throw new Error(`Export timed out after ${maxAttempts} attempts - status never became complete`);
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion - remove tags and decode entities
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}