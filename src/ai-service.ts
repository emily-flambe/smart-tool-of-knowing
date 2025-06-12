import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { LinearIssue, SummaryOptions, IssueSummary } from './types.js';

export class AIService {
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private defaultProvider: 'openai' | 'anthropic';
  private openaiModel: string;
  private anthropicModel: string;

  constructor(
    openaiKey?: string, 
    anthropicKey?: string, 
    defaultProvider: 'openai' | 'anthropic' = 'openai',
    openaiModel: string = 'gpt-4',
    anthropicModel: string = 'claude-3-5-sonnet-20241022'
  ) {
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
    this.defaultProvider = defaultProvider;
    this.openaiModel = openaiModel;
    this.anthropicModel = anthropicModel;

    if (!this.openai && !this.anthropic) {
      throw new Error('At least one AI provider (OpenAI or Anthropic) must be configured');
    }
  }

  // Static method to fetch available models
  static async getAvailableModels(provider: 'openai' | 'anthropic', apiKey: string): Promise<string[]> {
    if (provider === 'openai') {
      try {
        const openai = new OpenAI({ apiKey });
        const models = await openai.models.list();
        // Filter for chat completion models
        return models.data
          .filter(model => model.id.includes('gpt'))
          .map(model => model.id)
          .sort();
      } catch (error) {
        console.warn('Could not fetch OpenAI models, using defaults');
        return ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      }
    } else {
      // Anthropic doesn't have a public API to list models, so we return known models
      return [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
    }
  }

  static async validateModelAccess(provider: 'openai' | 'anthropic', apiKey: string, model: string): Promise<boolean> {
    try {
      if (provider === 'openai') {
        const openai = new OpenAI({ apiKey });
        await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        });
      } else {
        const anthropic = new Anthropic({ apiKey });
        await anthropic.messages.create({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async summarizeIssues(issues: LinearIssue[], options: SummaryOptions = {}): Promise<IssueSummary> {
    const provider = options.aiProvider || this.defaultProvider;
    const summaryType = options.summaryType || 'brief';
    const includeMetrics = options.includeMetrics ?? true;

    const issuesText = this.formatIssuesForSummary(issues, options.groupBy);
    const prompt = this.buildSummaryPrompt(issuesText, summaryType, includeMetrics);

    let summaryText: string;

    if (provider === 'openai' && this.openai) {
      summaryText = await this.generateOpenAISummary(prompt);
    } else if (provider === 'anthropic' && this.anthropic) {
      summaryText = await this.generateAnthropicSummary(prompt);
    } else {
      throw new Error(`Provider ${provider} is not configured`);
    }

    return this.parseSummaryResponse(summaryText, issues, includeMetrics);
  }

  async summarizeIndividualIssue(issue: LinearIssue, options: SummaryOptions = {}): Promise<string> {
    const provider = options.aiProvider || this.defaultProvider;
    const summaryType = options.summaryType || 'brief';

    const issueText = this.formatSingleIssue(issue);
    const prompt = this.buildIndividualIssueSummaryPrompt(issueText, summaryType);

    if (provider === 'openai' && this.openai) {
      return await this.generateOpenAISummary(prompt);
    } else if (provider === 'anthropic' && this.anthropic) {
      return await this.generateAnthropicSummary(prompt);
    } else {
      throw new Error(`Provider ${provider} is not configured`);
    }
  }

  private formatIssuesForSummary(issues: LinearIssue[], groupBy?: string): string {
    if (groupBy === 'project') {
      return this.groupByProject(issues);
    } else if (groupBy === 'assignee') {
      return this.groupByAssignee(issues);
    } else if (groupBy === 'priority') {
      return this.groupByPriority(issues);
    }

    return issues.map(issue => this.formatSingleIssue(issue)).join('\n\n');
  }

  private formatSingleIssue(issue: LinearIssue): string {
    return `
**${issue.identifier}**: ${issue.title}
Status: ${issue.state.name}
Priority: ${this.formatPriority(issue.priority)}
Assignee: ${issue.assignee?.name || 'Unassigned'}
${issue.description ? `Description: ${issue.description}` : ''}
${issue.estimate ? `Estimate: ${issue.estimate} points` : ''}
${issue.project ? `Project: ${issue.project.name}` : ''}
${issue.labels?.length ? `Labels: ${issue.labels.map(l => l.name).join(', ')}` : ''}
`.trim();
  }

  private groupByProject(issues: LinearIssue[]): string {
    const grouped = issues.reduce((acc, issue) => {
      const projectName = issue.project?.name || 'No Project';
      if (!acc[projectName]) acc[projectName] = [];
      acc[projectName].push(issue);
      return acc;
    }, {} as Record<string, LinearIssue[]>);

    return Object.entries(grouped)
      .map(([project, projectIssues]) => {
        return `**Project: ${project}**\n${projectIssues.map(issue => this.formatSingleIssue(issue)).join('\n\n')}`;
      })
      .join('\n\n---\n\n');
  }

  private groupByAssignee(issues: LinearIssue[]): string {
    const grouped = issues.reduce((acc, issue) => {
      const assigneeName = issue.assignee?.name || 'Unassigned';
      if (!acc[assigneeName]) acc[assigneeName] = [];
      acc[assigneeName].push(issue);
      return acc;
    }, {} as Record<string, LinearIssue[]>);

    return Object.entries(grouped)
      .map(([assignee, assigneeIssues]) => {
        return `**Assignee: ${assignee}**\n${assigneeIssues.map(issue => this.formatSingleIssue(issue)).join('\n\n')}`;
      })
      .join('\n\n---\n\n');
  }

  private groupByPriority(issues: LinearIssue[]): string {
    const priorityNames = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];
    const grouped = issues.reduce((acc, issue) => {
      const priorityName = this.formatPriority(issue.priority);
      if (!acc[priorityName]) acc[priorityName] = [];
      acc[priorityName].push(issue);
      return acc;
    }, {} as Record<string, LinearIssue[]>);

    return priorityNames
      .filter(priority => grouped[priority])
      .map(priority => {
        return `**Priority: ${priority}**\n${grouped[priority].map(issue => this.formatSingleIssue(issue)).join('\n\n')}`;
      })
      .join('\n\n---\n\n');
  }

  private formatPriority(priority: number): string {
    const priorities = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];
    return priorities[priority] || 'Unknown';
  }

  private buildSummaryPrompt(issuesText: string, summaryType: string, includeMetrics: boolean): string {
    const basePrompt = `Analyze the following Linear issues and provide a ${summaryType} summary:

${issuesText}

Please provide:
1. A concise overview of the current state
2. Key themes and patterns
3. Notable items or blockers`;

    if (summaryType === 'action-items') {
      return basePrompt + `
4. Specific action items and next steps
5. Priority recommendations`;
    }

    if (includeMetrics) {
      return basePrompt + `
4. Key metrics and progress indicators`;
    }

    return basePrompt;
  }

  private buildIndividualIssueSummaryPrompt(issueText: string, summaryType: string): string {
    return `Analyze this Linear issue and provide a ${summaryType} summary:

${issueText}

Focus on:
1. What this issue is about
2. Current status and progress
3. Key considerations or dependencies
${summaryType === 'action-items' ? '4. Next steps and action items' : ''}`;
  }

  private async generateOpenAISummary(prompt: string): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not configured');

    const response = await this.openai.chat.completions.create({
      model: this.openaiModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generateAnthropicSummary(prompt: string): Promise<string> {
    if (!this.anthropic) throw new Error('Anthropic not configured');

    const response = await this.anthropic.messages.create({
      model: this.anthropicModel,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.type === 'text' ? response.content[0].text : '';
  }

  private parseSummaryResponse(summaryText: string, issues: LinearIssue[], includeMetrics: boolean): IssueSummary {
    const keyPoints = this.extractKeyPoints(summaryText);
    const actionItems = this.extractActionItems(summaryText);

    const summary: IssueSummary = {
      summary: summaryText,
      keyPoints,
    };

    if (actionItems.length > 0) {
      summary.actionItems = actionItems;
    }

    if (includeMetrics) {
      summary.metrics = this.calculateMetrics(issues);
    }

    return summary;
  }

  private extractKeyPoints(text: string): string[] {
    const lines = text.split('\n');
    const keyPoints: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^[-*•]\s/)) {
        keyPoints.push(line.replace(/^[-*•]\s/, '').trim());
      } else if (line.match(/^\d+\.\s/)) {
        keyPoints.push(line.replace(/^\d+\.\s/, '').trim());
      }
    }

    return keyPoints.slice(0, 10); // Limit to 10 key points
  }

  private extractActionItems(text: string): string[] {
    const actionKeywords = ['action', 'next step', 'todo', 'should', 'need to', 'recommend'];
    const lines = text.split('\n');
    const actionItems: string[] = [];

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (actionKeywords.some(keyword => lowerLine.includes(keyword))) {
        if (line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/)) {
          actionItems.push(line.replace(/^[-*•\d+\.\s]+/, '').trim());
        }
      }
    }

    return actionItems;
  }

  private calculateMetrics(issues: LinearIssue[]): {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    estimatedHours?: number;
  } {
    const completedStates = ['completed', 'done', 'closed'];
    const inProgressStates = ['in progress', 'in review', 'started'];

    const completedIssues = issues.filter(issue => 
      completedStates.some(state => issue.state.name.toLowerCase().includes(state))
    ).length;

    const inProgressIssues = issues.filter(issue => 
      inProgressStates.some(state => issue.state.name.toLowerCase().includes(state))
    ).length;

    const totalEstimate = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);

    return {
      totalIssues: issues.length,
      completedIssues,
      inProgressIssues,
      estimatedHours: totalEstimate > 0 ? totalEstimate : undefined,
    };
  }
}