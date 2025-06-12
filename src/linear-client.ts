import fetch from 'node-fetch';
import { LinearIssue, LinearCycle, LinearProject, LinearTeam, LinearViewer } from './types.js';

export class LinearClient {
  private apiKey: string;
  private baseUrl = 'https://api.linear.app/graphql';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async query(query: string, variables: Record<string, any> = {}): Promise<any> {
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

    const data = await response.json() as any;
    
    if (data.errors) {
      throw new Error(`Linear API Error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    return data.data;
  }

  async validateApiKey(): Promise<LinearViewer> {
    const query = `
      query {
        viewer {
          id
          name
          email
        }
      }
    `;
    
    try {
      const data = await this.query(query);
      return data.viewer;
    } catch (error) {
      throw new Error('Invalid Linear API key');
    }
  }

  async getCurrentCycles(): Promise<LinearCycle[]> {
    const query = `
      query {
        cycles(filter: { isActive: { eq: true } }) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            team {
              id
              name
              key
            }
          }
        }
      }
    `;
    
    const data = await this.query(query);
    return data.cycles.nodes.map((cycle: any) => ({
      ...cycle,
      // Use number if name is null, or generate a default name
      name: cycle.name || `Cycle ${cycle.number}` || `Cycle ${cycle.id.slice(0, 8)}`,
      startsAt: cycle.startsAt,
      endsAt: cycle.endsAt,
    }));
  }

  async getRecentCycles(monthsBack: number = 3): Promise<LinearCycle[]> {
    // Calculate date 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - monthsBack);
    const threeMonthsAgoISO = threeMonthsAgo.toISOString();

    const query = `
      query($startDate: DateTimeOrDuration!) {
        cycles(
          filter: { 
            startsAt: { gte: $startDate }
          }
          first: 50
        ) {
          nodes {
            id
            name
            number
            startsAt
            endsAt
            team {
              id
              name
              key
            }
          }
        }
      }
    `;
    
    const data = await this.query(query, { startDate: threeMonthsAgoISO });
    
    // Sort by start date descending and determine status
    const currentDate = new Date();
    return data.cycles.nodes
      .map((cycle: any) => {
        const startDate = new Date(cycle.startsAt);
        const endDate = new Date(cycle.endsAt);
        
        let status: 'active' | 'completed' | 'future';
        if (currentDate < startDate) {
          status = 'future';
        } else if (currentDate >= startDate && currentDate <= endDate) {
          status = 'active';
        } else {
          status = 'completed';
        }

        return {
          ...cycle,
          // Use number if name is null, or generate a default name
          name: cycle.name || `Cycle ${cycle.number}` || `Cycle ${cycle.id.slice(0, 8)}`,
          startsAt: cycle.startsAt,
          endsAt: cycle.endsAt,
          // Keep isActive for backward compatibility
          isActive: status === 'active',
          status,
        };
      })
      .sort((a: any, b: any) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  }

  async getIssuesInCycle(cycleId: string): Promise<LinearIssue[]> {
    const query = `
      query($cycleId: String!) {
        cycle(id: $cycleId) {
          issues {
            nodes {
              id
              identifier
              title
              description
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
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              project {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { cycleId });
    return data.cycle?.issues?.nodes || [];
  }

  async getIssuesByProject(projectId: string): Promise<LinearIssue[]> {
    const query = `
      query($projectId: String!) {
        project(id: $projectId) {
          issues {
            nodes {
              id
              identifier
              title
              description
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
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              project {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { projectId });
    return data.project?.issues?.nodes || [];
  }

  async getProjects(): Promise<LinearProject[]> {
    const query = `
      query {
        projects {
          nodes {
            id
            name
            description
            state
            startDate
            targetDate
          }
        }
      }
    `;
    
    const data = await this.query(query);
    return data.projects.nodes;
  }

  async getTeams(): Promise<LinearTeam[]> {
    const query = `
      query {
        teams {
          nodes {
            id
            name
            key
          }
        }
      }
    `;
    
    const data = await this.query(query);
    return data.teams.nodes;
  }

  async getIssuesForTeam(teamId: string, limit = 50): Promise<LinearIssue[]> {
    const query = `
      query($teamId: String!, $first: Int!) {
        team(id: $teamId) {
          issues(first: $first) {
            nodes {
              id
              identifier
              title
              description
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
              labels {
                nodes {
                  id
                  name
                  color
                }
              }
              project {
                id
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.query(query, { teamId, first: limit });
    return data.team?.issues?.nodes || [];
  }

  async getIssue(issueId: string): Promise<LinearIssue | null> {
    const query = `
      query($issueId: String!) {
        issue(id: $issueId) {
          id
          identifier
          title
          description
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
          labels {
            nodes {
              id
              name
              color
            }
          }
          project {
            id
            name
          }
        }
      }
    `;

    try {
      const data = await this.query(query, { issueId });
      return data.issue;
    } catch (error) {
      return null;
    }
  }
}