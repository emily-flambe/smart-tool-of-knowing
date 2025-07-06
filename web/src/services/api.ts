interface ApiConfig {
  baseUrl: string;
}

class ApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getHealth() {
    return this.request<{ status: string }>('/health');
  }

  async getLinearTeams() {
    return this.request<any[]>('/api/team-members');
  }

  async getLinearUsers() {
    return this.request<any[]>('/api/active-engineers');
  }

  async getLinearCycles() {
    return this.request<any[]>('/api/cycles');
  }

  async getLinearIssues(cycleId?: string) {
    const endpoint = cycleId 
      ? `/api/backlog?cycleId=${cycleId}`
      : '/api/backlog';
    return this.request<any[]>(endpoint);
  }

  async generateNewsletter(options: { cycleId: string; format?: string }) {
    return this.request<{ content: string }>('/api/linear/newsletter', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getCycleReview(cycleId: string) {
    return this.request<any>(`/api/linear/cycles/${cycleId}/review`);
  }
}

const apiClient = new ApiClient({
  baseUrl: 'http://localhost:3001',
});

export default apiClient;