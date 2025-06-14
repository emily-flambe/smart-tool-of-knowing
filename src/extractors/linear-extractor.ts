import { DataExtractor, UnifiedContent, LinearContent } from '../unified-types.js';
import { LinearClient } from '../linear-client.js';
import { LinearIssue, LinearCycle, LinearProject, LinearTeam } from '../types.js';

export class LinearExtractor implements DataExtractor {
  source = 'linear' as const;
  private client: LinearClient;

  constructor(apiKey: string) {
    this.client = new LinearClient(apiKey);
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.client.validateApiKey();
      return true;
    } catch {
      return false;
    }
  }

  async extract(): Promise<UnifiedContent[]> {
    const content: UnifiedContent[] = [];

    try {
      // Extract teams first as they're referenced by other entities
      const teams = await this.client.getTeams();
      for (const team of teams) {
        content.push(this.teamToUnifiedContent(team));
      }

      // Extract projects
      const projects = await this.client.getProjects();
      for (const project of projects) {
        content.push(this.projectToUnifiedContent(project));
      }

      // Extract recent cycles (last 6 months)
      const cycles = await this.client.getRecentCycles(6);
      for (const cycle of cycles) {
        content.push(this.cycleToUnifiedContent(cycle));
      }

      // Extract issues for each team
      for (const team of teams) {
        const issues = await this.client.getIssuesForTeam(team.id, 100);
        for (const issue of issues) {
          content.push(this.issueToUnifiedContent(issue));
        }
      }

      return content;
    } catch (error) {
      throw new Error(`Linear extraction failed: ${error}`);
    }
  }

  async incrementalSync(lastSyncTime: string): Promise<UnifiedContent[]> {
    // For now, we'll do a full sync since Linear doesn't provide easy incremental sync
    // In a production version, we'd use Linear's webhook system or filter by updatedAt
    return this.extract();
  }

  private issueToUnifiedContent(issue: LinearIssue): LinearContent {
    const extractedAt = new Date().toISOString();
    
    // Build searchable text
    const searchableText = [
      issue.title,
      issue.description || '',
      issue.identifier,
      issue.state.name,
      issue.assignee?.name || '',
      issue.project?.name || '',
      issue.labels?.map(l => l.name).join(' ') || ''
    ].join(' ').toLowerCase();

    // Extract keywords
    const keywords = [
      issue.identifier,
      issue.state.name,
      issue.assignee?.name || '',
      issue.project?.name || '',
      ...(issue.labels?.map(l => l.name) || [])
    ].filter(Boolean);

    return {
      metadata: {
        id: `linear-issue-${issue.id}`,
        source: 'linear',
        contentType: 'linear-issue',
        title: `${issue.identifier}: ${issue.title}`,
        description: issue.description,
        url: `https://linear.app/issue/${issue.identifier}`,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
        extractedAt,
        parentId: issue.project ? `linear-project-${issue.project.id}` : undefined,
        sourceMetadata: {
          identifier: issue.identifier,
          teamId: issue.project?.id, // This might need adjustment based on Linear's data structure
          projectId: issue.project?.id,
        }
      },
      content: issue.description || '',
      searchableText,
      keywords,
      structuredData: {
        status: issue.state.name,
        state: issue.state.type,
        priority: issue.priority,
        estimate: issue.estimate,
        assignees: issue.assignee ? [{
          name: issue.assignee.name,
          email: issue.assignee.email
        }] : [],
        labels: issue.labels?.map(l => ({
          name: l.name,
          color: l.color
        })) || [],
        project: issue.project ? {
          id: issue.project.id,
          name: issue.project.name
        } : undefined,
        linearSpecific: {
          stateType: issue.state.type,
          priorityValue: issue.priority
        }
      }
    };
  }

  private projectToUnifiedContent(project: LinearProject): LinearContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      project.name,
      project.description || '',
      project.state
    ].join(' ').toLowerCase();

    const keywords = [
      project.name,
      project.state
    ].filter(Boolean);

    return {
      metadata: {
        id: `linear-project-${project.id}`,
        source: 'linear',
        contentType: 'linear-project',
        title: project.name,
        description: project.description,
        url: `https://linear.app/project/${project.id}`,
        createdAt: project.startDate || extractedAt,
        updatedAt: extractedAt,
        extractedAt,
        sourceMetadata: {}
      },
      content: project.description || '',
      searchableText,
      keywords,
      structuredData: {
        status: project.state,
        state: project.state,
        startDate: project.startDate,
        endDate: project.targetDate,
        dueDate: project.targetDate,
        linearSpecific: {
          projectState: project.state
        }
      }
    };
  }

  private cycleToUnifiedContent(cycle: LinearCycle): LinearContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      cycle.name,
      cycle.team.name,
      cycle.status || ''
    ].join(' ').toLowerCase();

    const keywords = [
      cycle.name,
      cycle.team.name,
      cycle.team.key,
      cycle.status || ''
    ].filter(Boolean);

    return {
      metadata: {
        id: `linear-cycle-${cycle.id}`,
        source: 'linear',
        contentType: 'linear-cycle',
        title: `${cycle.name} (${cycle.team.name})`,
        description: `Cycle for team ${cycle.team.name}`,
        url: `https://linear.app/cycle/${cycle.id}`,
        createdAt: cycle.startsAt,
        updatedAt: extractedAt,
        extractedAt,
        sourceMetadata: {
          teamId: cycle.team.id,
          teamName: cycle.team.name,
          teamKey: cycle.team.key
        }
      },
      content: `Cycle ${cycle.name} for team ${cycle.team.name}`,
      searchableText,
      keywords,
      structuredData: {
        status: cycle.status || (cycle.isActive ? 'active' : 'completed'),
        state: cycle.status || (cycle.isActive ? 'active' : 'completed'),
        startDate: cycle.startsAt,
        endDate: cycle.endsAt,
        team: {
          id: cycle.team.id,
          name: cycle.team.name,
          key: cycle.team.key
        },
        linearSpecific: {
          isActive: cycle.isActive,
          cycleStatus: cycle.status
        }
      }
    };
  }

  private teamToUnifiedContent(team: LinearTeam): LinearContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      team.name,
      team.key
    ].join(' ').toLowerCase();

    const keywords = [
      team.name,
      team.key
    ].filter(Boolean);

    return {
      metadata: {
        id: `linear-team-${team.id}`,
        source: 'linear',
        contentType: 'linear-team',
        title: team.name,
        description: `Linear team: ${team.name} (${team.key})`,
        url: `https://linear.app/team/${team.key}`,
        createdAt: extractedAt,
        updatedAt: extractedAt,
        extractedAt,
        sourceMetadata: {
          teamId: team.id,
          teamName: team.name,
          teamKey: team.key
        }
      },
      content: `Team ${team.name} with key ${team.key}`,
      searchableText,
      keywords,
      structuredData: {
        team: {
          id: team.id,
          name: team.name,
          key: team.key
        },
        linearSpecific: {
          teamKey: team.key
        }
      }
    };
  }
}