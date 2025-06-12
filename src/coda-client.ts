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

  async validateApiKey(): Promise<{ user: any }> {
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
}