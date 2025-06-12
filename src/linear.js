import fetch from 'node-fetch';

export class LinearClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.linear.app/graphql';
  }

  async query(query, variables = {}) {
    // Support both personal API keys and OAuth2 tokens
    const authHeader = this.apiKey.startsWith('lin_oauth_') 
      ? `Bearer ${this.apiKey}`
      : this.apiKey;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`Linear API Error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return data.data;
  }

  async getCurrentCycle() {
    const query = `
      query {
        cycles(filter: { isActive: { eq: true } }) {
          nodes {
            id
            name
            startsAt
            endsAt
            team {
              id
              name
            }
          }
        }
      }
    `;
    
    const data = await this.query(query);
    return data.cycles.nodes;
  }

  async getIssuesInCycle(cycleId) {
    const query = `
      query($cycleId: String!) {
        cycle(id: $cycleId) {
          issues {
            nodes {
              id
              identifier
              title
              state {
                name
                type
              }
              assignee {
                name
                email
              }
              priority
              estimate
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const data = await this.query(query, { cycleId });
    return data.cycle?.issues?.nodes || [];
  }

  async validateApiKey() {
    try {
      const query = `
        query {
          viewer {
            id
            name
            email
          }
        }
      `;
      
      const data = await this.query(query);
      return data.viewer;
    } catch (error) {
      throw new Error('Invalid Linear API key');
    }
  }
}