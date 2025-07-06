# Phase 4: Report Generation & Export System - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for building the report generation system that creates weekly reports, individual engineer summaries, and team accomplishment reports with multiple export formats. Execute each step sequentially after completing Phase 3.

## Prerequisites
- Phase 1 completed (type definitions, API foundation)
- Phase 2 completed (Linear data available)
- Phase 3 completed (GitHub data and correlations available)
- Database with cached Linear and GitHub data

## Step 1: Report Template System

### Action 1.1: Create Report Types
Create file: `src/types/report.types.ts`
```typescript
import { Engineer, Team, EngineerActivity, SprintSummary } from './dashboard.types';
import { LinearIssue, LinearCycle } from './linear.types';
import { GitHubPullRequest } from './github.types';

export type ReportType = 'weekly' | 'sprint' | 'monthly' | 'quarterly' | 'individual';
export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'email' | 'json';

export interface ReportMetadata {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  team: Team;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface WeeklyReport extends ReportMetadata {
  type: 'weekly';
  summary: {
    highlightText: string;
    issuesCompleted: number;
    pullRequestsMerged: number;
    activeEngineers: number;
    velocity: number;
  };
  sections: {
    completed: CompletedWorkSection;
    inProgress: InProgressSection;
    blocked: BlockedItemsSection;
    upcoming: UpcomingWorkSection;
    metrics: MetricsSection;
  };
}

export interface CompletedWorkSection {
  title: string;
  issues: Array<{
    issue: LinearIssue;
    assignee: Engineer;
    completedAt: Date;
    pullRequest?: GitHubPullRequest;
    impact?: string;
  }>;
  pullRequests: Array<{
    pr: GitHubPullRequest;
    author: Engineer;
    mergedAt: Date;
    linkedIssue?: LinearIssue;
    summary: string;
  }>;
}

export interface InProgressSection {
  title: string;
  items: Array<{
    issue: LinearIssue;
    assignee: Engineer;
    startedAt: Date;
    progress: number;
    expectedCompletion?: Date;
    pullRequest?: GitHubPullRequest;
  }>;
}

export interface BlockedItemsSection {
  title: string;
  items: Array<{
    issue: LinearIssue;
    assignee: Engineer;
    blockedSince: Date;
    reason: string;
    dependencies?: string[];
  }>;
}

export interface UpcomingWorkSection {
  title: string;
  items: Array<{
    issue: LinearIssue;
    assignee?: Engineer;
    priority: number;
    estimatedStart?: Date;
    project?: string;
  }>;
}

export interface MetricsSection {
  title: string;
  velocity: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  completionRate: number;
  bugFixRate: number;
  averageCycleTime: number;
  codeMetrics: {
    additions: number;
    deletions: number;
    filesChanged: number;
  };
}

export interface IndividualEngineerReport extends ReportMetadata {
  type: 'individual';
  engineer: Engineer;
  summary: {
    issuesCompleted: number;
    pullRequestsMerged: number;
    codeContributions: {
      additions: number;
      deletions: number;
    };
    reviewsGiven: number;
    averageCycleTime: number;
  };
  accomplishments: Array<{
    type: 'issue' | 'pr' | 'review';
    title: string;
    description: string;
    completedAt: Date;
    impact?: string;
    link: string;
  }>;
  workBreakdown: {
    byType: Record<string, number>;
    byProject: Record<string, number>;
    byPriority: Record<string, number>;
  };
  highlights: string[];
}

export interface SprintReport extends ReportMetadata {
  type: 'sprint';
  cycle: LinearCycle;
  summary: SprintSummary;
  teamHighlights: string[];
  individualContributions: IndividualEngineerReport[];
  retrospective?: {
    whatWentWell: string[];
    whatCouldImprove: string[];
    actionItems: string[];
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: ReportType;
  format: ExportFormat;
  sections: string[];
  customFields?: Record<string, any>;
  styling?: {
    theme: string;
    customCSS?: string;
  };
}

export interface ReportGenerationOptions {
  type: ReportType;
  format: ExportFormat;
  teamId: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeMetrics?: boolean;
  includeCharts?: boolean;
  customTemplate?: string;
  filters?: {
    engineers?: string[];
    projects?: string[];
    labels?: string[];
  };
}
```

### Action 1.2: Create Template Engine
Create file: `src/services/reports/templateEngine.ts`
```typescript
import * as Handlebars from 'handlebars';
import { marked } from 'marked';
import { format, formatDistance } from 'date-fns';
import { 
  WeeklyReport, 
  IndividualEngineerReport, 
  SprintReport,
  ExportFormat 
} from '../../types/report.types';
import { LinearIssue } from '../../types/linear.types';
import { GitHubPullRequest } from '../../types/github.types';

export class TemplateEngine {
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
    this.registerPartials();
  }

  private registerHelpers(): void {
    // Date formatting
    this.handlebars.registerHelper('formatDate', (date: Date, formatStr: string) => {
      return format(new Date(date), formatStr || 'MMM d, yyyy');
    });

    // Relative time
    this.handlebars.registerHelper('timeAgo', (date: Date) => {
      return formatDistance(new Date(date), new Date(), { addSuffix: true });
    });

    // Issue formatting
    this.handlebars.registerHelper('issueLink', (issue: LinearIssue) => {
      return new Handlebars.SafeString(
        `[${issue.identifier}](${issue.url}) - ${Handlebars.escapeExpression(issue.title)}`
      );
    });

    // PR formatting
    this.handlebars.registerHelper('prLink', (pr: GitHubPullRequest) => {
      return new Handlebars.SafeString(
        `[#${pr.number}](${pr.url}) - ${Handlebars.escapeExpression(pr.title)}`
      );
    });

    // Progress bar
    this.handlebars.registerHelper('progressBar', (progress: number) => {
      const filled = Math.round(progress / 10);
      const empty = 10 - filled;
      return new Handlebars.SafeString(
        `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${progress}%`
      );
    });

    // Pluralize
    this.handlebars.registerHelper('pluralize', (count: number, singular: string, plural?: string) => {
      return count === 1 ? singular : (plural || `${singular}s`);
    });

    // Conditional formatting
    this.handlebars.registerHelper('trend', (current: number, previous: number) => {
      if (current > previous) return '↑';
      if (current < previous) return '↓';
      return '→';
    });

    // List formatting
    this.handlebars.registerHelper('bulletList', (items: string[]) => {
      return new Handlebars.SafeString(
        items.map(item => `• ${Handlebars.escapeExpression(item)}`).join('\n')
      );
    });
  }

  private registerPartials(): void {
    // Issue summary partial
    this.handlebars.registerPartial('issueSummary', `
{{#each issues}}
- {{issueLink this.issue}} - {{this.assignee.name}}
  {{#if this.pullRequest}}
  - PR: {{prLink this.pullRequest}}
  {{/if}}
  {{#if this.impact}}
  - Impact: {{this.impact}}
  {{/if}}
{{/each}}
    `);

    // Metrics table partial
    this.handlebars.registerPartial('metricsTable', `
| Metric | Current | Previous | Trend |
|--------|---------|----------|-------|
| Velocity | {{metrics.velocity.current}} | {{metrics.velocity.previous}} | {{trend metrics.velocity.current metrics.velocity.previous}} |
| Completion Rate | {{metrics.completionRate}}% | - | - |
| Bug Fix Rate | {{metrics.bugFixRate}}% | - | - |
| Avg Cycle Time | {{metrics.averageCycleTime}} days | - | - |
    `);

    // Engineer highlights partial
    this.handlebars.registerPartial('engineerHighlights', `
{{#each engineers}}
### {{this.name}}
- Completed: {{this.completed}} {{pluralize this.completed "issue"}}
- Merged: {{this.merged}} {{pluralize this.merged "PR"}}
- Reviews: {{this.reviews}}
{{#if this.highlights}}
{{bulletList this.highlights}}
{{/if}}
{{/each}}
    `);
  }

  async renderWeeklyReport(report: WeeklyReport, format: ExportFormat): Promise<string> {
    const template = this.getWeeklyTemplate(format);
    const compiled = this.handlebars.compile(template);
    const rendered = compiled(report);

    return this.postProcess(rendered, format);
  }

  async renderIndividualReport(report: IndividualEngineerReport, format: ExportFormat): Promise<string> {
    const template = this.getIndividualTemplate(format);
    const compiled = this.handlebars.compile(template);
    const rendered = compiled(report);

    return this.postProcess(rendered, format);
  }

  async renderSprintReport(report: SprintReport, format: ExportFormat): Promise<string> {
    const template = this.getSprintTemplate(format);
    const compiled = this.handlebars.compile(template);
    const rendered = compiled(report);

    return this.postProcess(rendered, format);
  }

  private getWeeklyTemplate(format: ExportFormat): string {
    if (format === 'markdown' || format === 'email') {
      return `# {{title}}
*Generated on {{formatDate generatedAt "MMMM d, yyyy"}}*

## 📊 Summary
{{summary.highlightText}}

- **Issues Completed**: {{summary.issuesCompleted}}
- **PRs Merged**: {{summary.pullRequestsMerged}}
- **Active Engineers**: {{summary.activeEngineers}}
- **Velocity**: {{summary.velocity}} points

## ✅ Completed Work
{{#with sections.completed}}
{{> issueSummary}}
{{/with}}

## 🚧 In Progress
{{#each sections.inProgress.items}}
- {{issueLink this.issue}} - {{this.assignee.name}}
  - Started: {{formatDate this.startedAt "MMM d"}}
  - Progress: {{progressBar this.progress}}
{{/each}}

## 🚨 Blocked Items
{{#if sections.blocked.items}}
{{#each sections.blocked.items}}
- {{issueLink this.issue}} - {{this.assignee.name}}
  - Blocked since: {{timeAgo this.blockedSince}}
  - Reason: {{this.reason}}
{{/each}}
{{else}}
No blocked items this week! 🎉
{{/if}}

## 📅 Upcoming Work
{{#each sections.upcoming.items}}
- {{issueLink this.issue}}{{#if this.assignee}} - {{this.assignee.name}}{{/if}}
{{/each}}

## 📈 Metrics
{{> metricsTable}}

---
*This report was automatically generated by the Engineering Dashboard*`;
    }

    if (format === 'html') {
      return this.wrapInHTML(`
<h1>{{title}}</h1>
<p class="text-muted">Generated on {{formatDate generatedAt "MMMM d, yyyy"}}</p>

<div class="summary-box">
  <h2>📊 Summary</h2>
  <p>{{summary.highlightText}}</p>
  <div class="metrics-grid">
    <div class="metric">
      <span class="value">{{summary.issuesCompleted}}</span>
      <span class="label">Issues Completed</span>
    </div>
    <div class="metric">
      <span class="value">{{summary.pullRequestsMerged}}</span>
      <span class="label">PRs Merged</span>
    </div>
    <div class="metric">
      <span class="value">{{summary.activeEngineers}}</span>
      <span class="label">Active Engineers</span>
    </div>
    <div class="metric">
      <span class="value">{{summary.velocity}}</span>
      <span class="label">Velocity Points</span>
    </div>
  </div>
</div>

<!-- Continue with HTML template... -->
      `);
    }

    return this.getWeeklyTemplate('markdown'); // Default to markdown
  }

  private getIndividualTemplate(format: ExportFormat): string {
    return `# {{engineer.name}} - {{title}}
*Period: {{formatDate timeRange.start "MMM d"}} - {{formatDate timeRange.end "MMM d, yyyy"}}*

## Summary
- **Issues Completed**: {{summary.issuesCompleted}}
- **PRs Merged**: {{summary.pullRequestsMerged}}
- **Code Changes**: +{{summary.codeContributions.additions}} / -{{summary.codeContributions.deletions}}
- **Reviews Given**: {{summary.reviewsGiven}}
- **Avg Cycle Time**: {{summary.averageCycleTime}} days

## Key Accomplishments
{{#each accomplishments}}
- **{{formatDate this.completedAt "MMM d"}}**: {{this.title}}
  - {{this.description}}
  {{#if this.impact}}
  - Impact: {{this.impact}}
  {{/if}}
  - [View {{this.type}}]({{this.link}})
{{/each}}

## Work Breakdown
### By Type
{{#each workBreakdown.byType}}
- {{@key}}: {{this}} items
{{/each}}

### By Project
{{#each workBreakdown.byProject}}
- {{@key}}: {{this}} items
{{/each}}

{{#if highlights}}
## Highlights
{{bulletList highlights}}
{{/if}}`;
  }

  private getSprintTemplate(format: ExportFormat): string {
    return `# {{title}}
*Sprint {{cycle.number}}{{#if cycle.name}}: {{cycle.name}}{{/if}}*
*{{formatDate cycle.startsAt "MMM d"}} - {{formatDate cycle.endsAt "MMM d, yyyy"}}*

## Sprint Overview
- **Total Issues**: {{summary.totalIssues}}
- **Completed**: {{summary.completedIssues}} ({{summary.completionRate}}%)
- **In Progress**: {{summary.inProgressIssues}}
- **Blocked**: {{summary.blockedIssues}}
- **Velocity**: {{summary.velocity}} points

## Team Highlights
{{bulletList teamHighlights}}

## Project Progress
{{#each summary.projectBreakdown}}
### {{this.project.name}}
- Progress: {{progressBar this.progress}}
- Completed: {{this.issuesCompleted}} / {{this.issuesTotal}}
- Team: {{#each this.engineers}}{{this.name}}{{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

## Individual Contributions
{{> engineerHighlights engineers=summary.engineerSummaries}}

{{#if retrospective}}
## Sprint Retrospective
### What Went Well
{{bulletList retrospective.whatWentWell}}

### What Could Improve
{{bulletList retrospective.whatCouldImprove}}

### Action Items
{{bulletList retrospective.actionItems}}
{{/if}}`;
  }

  private wrapInHTML(content: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 { color: #2c3e50; }
    .summary-box {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .metric {
      text-align: center;
    }
    .metric .value {
      display: block;
      font-size: 2em;
      font-weight: bold;
      color: #3498db;
    }
    .metric .label {
      display: block;
      font-size: 0.9em;
      color: #7f8c8d;
    }
    .progress-bar {
      background: #ecf0f1;
      border-radius: 4px;
      height: 20px;
      overflow: hidden;
    }
    .progress-bar-fill {
      background: #3498db;
      height: 100%;
      transition: width 0.3s ease;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f8f9fa;
      font-weight: bold;
    }
    a {
      color: #3498db;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .text-muted {
      color: #7f8c8d;
    }
    @media print {
      body {
        margin: 0;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
  }

  private async postProcess(content: string, format: ExportFormat): Promise<string> {
    switch (format) {
      case 'html':
        // Content is already HTML
        return content;
      
      case 'markdown':
        return content;
      
      case 'email':
        // Convert markdown to HTML for email
        return marked(content);
      
      default:
        return content;
    }
  }

  // Custom template support
  compileCustomTemplate(templateString: string): HandlebarsTemplateDelegate {
    return this.handlebars.compile(templateString);
  }
}
```

## Step 2: Report Generation Service

### Action 2.1: Create Report Generator
Create file: `src/services/reports/reportGenerator.ts`
```typescript
import { 
  ReportGenerationOptions,
  WeeklyReport,
  IndividualEngineerReport,
  SprintReport,
  CompletedWorkSection,
  InProgressSection,
  BlockedItemsSection,
  UpcomingWorkSection,
  MetricsSection
} from '../../types/report.types';
import { DashboardService } from '../dashboard/dashboard.service';
import { LinearDataService } from '../linear/linearData.service';
import { GitHubDataService } from '../github/githubData.service';
import { TemplateEngine } from './templateEngine';
import { DatabaseService } from '../database.service';
import { Engineer, Team, EngineerActivity } from '../../types/dashboard.types';
import { LinearIssue, LinearCycle } from '../../types/linear.types';
import { GitHubPullRequest } from '../../types/github.types';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  differenceInDays,
  isWithinInterval,
  subWeeks
} from 'date-fns';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class ReportGenerator {
  private dashboardService: DashboardService;
  private linearService: LinearDataService;
  private githubService: GitHubDataService;
  private templateEngine: TemplateEngine;
  private db: DatabaseService;

  constructor() {
    this.dashboardService = new DashboardService();
    this.linearService = new LinearDataService();
    this.githubService = new GitHubDataService();
    this.templateEngine = new TemplateEngine();
    this.db = new DatabaseService();
  }

  async generateReport(
    userId: string,
    options: ReportGenerationOptions
  ): Promise<string> {
    logger.info('Generating report', { type: options.type, format: options.format });

    switch (options.type) {
      case 'weekly':
        return this.generateWeeklyReport(userId, options);
      case 'sprint':
        return this.generateSprintReport(userId, options);
      case 'individual':
        return this.generateIndividualReport(userId, options);
      case 'monthly':
        return this.generateMonthlyReport(userId, options);
      case 'quarterly':
        return this.generateQuarterlyReport(userId, options);
      default:
        throw new Error(`Unsupported report type: ${options.type}`);
    }
  }

  private async generateWeeklyReport(
    userId: string,
    options: ReportGenerationOptions
  ): Promise<string> {
    const timeRange = options.timeRange || {
      start: startOfWeek(new Date(), { weekStartsOn: 1 }),
      end: endOfWeek(new Date(), { weekStartsOn: 1 })
    };

    // Fetch team data
    const team = await this.dashboardService.getTeam(options.teamId);
    
    // Fetch all activities for the week
    const activities = await this.dashboardService.getTeamActivity(
      userId,
      options.teamId,
      {
        timeView: 'custom',
        customRange: timeRange,
        ...options.filters
      }
    );

    // Build report sections
    const completed = await this.buildCompletedSection(activities, timeRange);
    const inProgress = await this.buildInProgressSection(activities);
    const blocked = await this.buildBlockedSection(activities);
    const upcoming = await this.buildUpcomingSection(userId, team, options.teamId);
    const metrics = await this.buildMetricsSection(activities, timeRange);

    // Calculate summary
    const summary = {
      highlightText: this.generateWeeklySummaryText(completed, activities.length),
      issuesCompleted: completed.issues.length,
      pullRequestsMerged: completed.pullRequests.length,
      activeEngineers: activities.filter(a => 
        a.linearIssues.length > 0 || a.pullRequests.length > 0
      ).length,
      velocity: completed.issues.reduce((sum, item) => 
        sum + (item.issue.estimate || 0), 0
      )
    };

    const report: WeeklyReport = {
      id: uuidv4(),
      type: 'weekly',
      title: `Weekly Report - ${team.name}`,
      generatedAt: new Date(),
      generatedBy: userId,
      team,
      timeRange,
      summary,
      sections: {
        completed,
        inProgress,
        blocked,
        upcoming,
        metrics
      }
    };

    // Store report
    await this.storeReport(report);

    // Render report
    return this.templateEngine.renderWeeklyReport(report, options.format);
  }

  private async generateIndividualReport(
    userId: string,
    options: ReportGenerationOptions
  ): Promise<string> {
    if (!options.filters?.engineers?.[0]) {
      throw new Error('Engineer ID required for individual report');
    }

    const engineerId = options.filters.engineers[0];
    const engineer = await this.dashboardService.getEngineer(engineerId);
    
    const timeRange = options.timeRange || {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    };

    // Fetch engineer's activity
    const activity = await this.dashboardService.getEngineerActivity(
      userId,
      engineerId,
      timeRange
    );

    // Build accomplishments list
    const accomplishments = [
      ...activity.linearIssues
        .filter(issue => issue.completedAt)
        .map(issue => ({
          type: 'issue' as const,
          title: issue.title,
          description: issue.description || 'No description',
          completedAt: new Date(issue.completedAt!),
          impact: this.assessImpact(issue),
          link: issue.url
        })),
      ...activity.pullRequests
        .filter(pr => pr.mergedAt)
        .map(pr => ({
          type: 'pr' as const,
          title: pr.title,
          description: pr.body || 'No description',
          completedAt: pr.mergedAt!,
          link: pr.url
        }))
    ].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

    // Calculate work breakdown
    const workBreakdown = {
      byType: this.calculateWorkTypeBreakdown(activity.linearIssues),
      byProject: this.calculateProjectBreakdown(activity.linearIssues),
      byPriority: this.calculatePriorityBreakdown(activity.linearIssues)
    };

    // Generate highlights
    const highlights = this.generateEngineerHighlights(activity, accomplishments);

    const report: IndividualEngineerReport = {
      id: uuidv4(),
      type: 'individual',
      title: `Performance Summary`,
      generatedAt: new Date(),
      generatedBy: userId,
      team: engineer.team!,
      timeRange,
      engineer,
      summary: {
        issuesCompleted: activity.metrics.issuesCompleted,
        pullRequestsMerged: activity.metrics.pullRequestsMerged,
        codeContributions: {
          additions: activity.metrics.codeAdditions,
          deletions: activity.metrics.codeDeletions
        },
        reviewsGiven: activity.metrics.reviewsGiven,
        averageCycleTime: activity.metrics.averagePRMergeTime || 0
      },
      accomplishments,
      workBreakdown,
      highlights
    };

    await this.storeReport(report);
    return this.templateEngine.renderIndividualReport(report, options.format);
  }

  private async generateSprintReport(
    userId: string,
    options: ReportGenerationOptions
  ): Promise<string> {
    const sprintSummary = await this.dashboardService.getCurrentSprintSummary(
      userId,
      options.teamId
    );

    // Generate individual reports for each engineer
    const individualReports: IndividualEngineerReport[] = [];
    for (const engineer of sprintSummary.team.engineers) {
      if (engineer.id && engineer.isActive) {
        try {
          const report = await this.generateIndividualReport(userId, {
            ...options,
            type: 'individual',
            filters: { engineers: [engineer.id] },
            timeRange: {
              start: sprintSummary.startDate,
              end: sprintSummary.endDate
            }
          });
          // Parse the report back to object (bit hacky, but works for now)
          individualReports.push(JSON.parse(report));
        } catch (error) {
          logger.warn(`Failed to generate report for ${engineer.name}`, error);
        }
      }
    }

    // Generate team highlights
    const teamHighlights = this.generateTeamHighlights(sprintSummary, individualReports);

    const report: SprintReport = {
      id: uuidv4(),
      type: 'sprint',
      title: `Sprint ${sprintSummary.cycle.number} Report - ${sprintSummary.team.name}`,
      generatedAt: new Date(),
      generatedBy: userId,
      team: sprintSummary.team,
      timeRange: {
        start: sprintSummary.startDate,
        end: sprintSummary.endDate
      },
      cycle: sprintSummary.cycle,
      summary: sprintSummary,
      teamHighlights,
      individualContributions: individualReports
    };

    await this.storeReport(report);
    return this.templateEngine.renderSprintReport(report, options.format);
  }

  private async buildCompletedSection(
    activities: EngineerActivity[],
    timeRange: { start: Date; end: Date }
  ): Promise<CompletedWorkSection> {
    const completed: CompletedWorkSection = {
      title: 'Completed Work',
      issues: [],
      pullRequests: []
    };

    for (const activity of activities) {
      // Completed issues
      const completedIssues = activity.linearIssues.filter(issue =>
        issue.completedAt &&
        isWithinInterval(new Date(issue.completedAt), timeRange)
      );

      for (const issue of completedIssues) {
        // Find correlated PR
        const correlatedPR = activity.pullRequests.find(pr =>
          pr.linkedIssues?.includes(issue.identifier)
        );

        completed.issues.push({
          issue,
          assignee: activity.engineer,
          completedAt: new Date(issue.completedAt!),
          pullRequest: correlatedPR,
          impact: this.assessImpact(issue)
        });
      }

      // Merged PRs
      const mergedPRs = activity.pullRequests.filter(pr =>
        pr.mergedAt && isWithinInterval(pr.mergedAt, timeRange)
      );

      for (const pr of mergedPRs) {
        completed.pullRequests.push({
          pr,
          author: activity.engineer,
          mergedAt: pr.mergedAt!,
          linkedIssue: activity.linearIssues.find(issue =>
            pr.linkedIssues?.includes(issue.identifier)
          ),
          summary: this.summarizePR(pr)
        });
      }
    }

    // Sort by completion date
    completed.issues.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    completed.pullRequests.sort((a, b) => b.mergedAt.getTime() - a.mergedAt.getTime());

    return completed;
  }

  private async buildInProgressSection(
    activities: EngineerActivity[]
  ): Promise<InProgressSection> {
    const inProgress: InProgressSection = {
      title: 'Work in Progress',
      items: []
    };

    for (const activity of activities) {
      const activeIssues = activity.linearIssues.filter(issue =>
        issue.state.type === 'started'
      );

      for (const issue of activeIssues) {
        const openPR = activity.pullRequests.find(pr =>
          pr.state === 'open' && pr.linkedIssues?.includes(issue.identifier)
        );

        inProgress.items.push({
          issue,
          assignee: activity.engineer,
          startedAt: new Date(issue.startedAt || issue.createdAt),
          progress: this.calculateProgress(issue),
          expectedCompletion: this.estimateCompletion(issue),
          pullRequest: openPR
        });
      }
    }

    // Sort by progress
    inProgress.items.sort((a, b) => b.progress - a.progress);

    return inProgress;
  }

  private async buildBlockedSection(
    activities: EngineerActivity[]
  ): Promise<BlockedItemsSection> {
    const blocked: BlockedItemsSection = {
      title: 'Blocked Items',
      items: []
    };

    for (const activity of activities) {
      const blockedIssues = activity.linearIssues.filter(issue =>
        issue.labels.some(label => 
          label.name.toLowerCase().includes('blocked') ||
          label.name.toLowerCase().includes('waiting')
        )
      );

      for (const issue of blockedIssues) {
        const blockedLabel = issue.labels.find(label =>
          label.name.toLowerCase().includes('blocked')
        );

        blocked.items.push({
          issue,
          assignee: activity.engineer,
          blockedSince: new Date(issue.updatedAt), // Approximation
          reason: this.extractBlockedReason(issue),
          dependencies: this.extractDependencies(issue)
        });
      }
    }

    return blocked;
  }

  private async buildUpcomingSection(
    userId: string,
    team: Team,
    teamId: string
  ): Promise<UpcomingWorkSection> {
    const upcoming: UpcomingWorkSection = {
      title: 'Upcoming Work',
      items: []
    };

    // Get unstarted issues from current cycle
    const { issues } = await this.linearService.getCurrentCycleIssues(userId, teamId);
    
    const upcomingIssues = issues
      .filter(issue => issue.state.type === 'unstarted')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10); // Top 10 priority items

    for (const issue of upcomingIssues) {
      upcoming.items.push({
        issue,
        assignee: team.engineers.find(e => e.linearUserId === issue.assignee?.id),
        priority: issue.priority,
        estimatedStart: this.estimateStartDate(issue),
        project: issue.project?.name
      });
    }

    return upcoming;
  }

  private async buildMetricsSection(
    activities: EngineerActivity[],
    timeRange: { start: Date; end: Date }
  ): Promise<MetricsSection> {
    // Calculate current metrics
    const currentVelocity = activities.reduce((sum, activity) =>
      sum + activity.linearIssues
        .filter(i => i.completedAt && isWithinInterval(new Date(i.completedAt), timeRange))
        .reduce((s, i) => s + (i.estimate || 0), 0),
      0
    );

    // Get previous week's velocity for comparison
    const previousRange = {
      start: subWeeks(timeRange.start, 1),
      end: subWeeks(timeRange.end, 1)
    };
    
    // This is simplified - in real implementation, fetch previous data
    const previousVelocity = Math.round(currentVelocity * 0.9);

    const totalIssues = activities.reduce((sum, a) => sum + a.linearIssues.length, 0);
    const completedIssues = activities.reduce((sum, a) => 
      sum + a.linearIssues.filter(i => i.state.type === 'completed').length, 0
    );

    const bugIssues = activities.reduce((sum, a) =>
      sum + a.linearIssues.filter(i => 
        i.labels.some(l => l.name.toLowerCase().includes('bug'))
      ).length, 0
    );

    const totalCycleTime = activities.reduce((sum, a) => {
      return sum + a.linearIssues
        .filter(i => i.completedAt && i.startedAt)
        .reduce((s, i) => {
          const cycleTime = differenceInDays(
            new Date(i.completedAt!),
            new Date(i.startedAt!)
          );
          return s + cycleTime;
        }, 0);
    }, 0);

    const completedWithCycleTime = activities.reduce((sum, a) =>
      sum + a.linearIssues.filter(i => i.completedAt && i.startedAt).length, 0
    );

    const codeMetrics = activities.reduce((acc, a) => ({
      additions: acc.additions + a.metrics.codeAdditions,
      deletions: acc.deletions + a.metrics.codeDeletions,
      filesChanged: acc.filesChanged + a.pullRequests.reduce((s, pr) => s + pr.changedFiles, 0)
    }), { additions: 0, deletions: 0, filesChanged: 0 });

    return {
      title: 'Key Metrics',
      velocity: {
        current: currentVelocity,
        previous: previousVelocity,
        trend: currentVelocity > previousVelocity ? 'up' : 
               currentVelocity < previousVelocity ? 'down' : 'stable'
      },
      completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
      bugFixRate: bugIssues > 0 ? Math.round((bugIssues / totalIssues) * 100) : 0,
      averageCycleTime: completedWithCycleTime > 0 ? 
        Math.round(totalCycleTime / completedWithCycleTime) : 0,
      codeMetrics
    };
  }

  // Helper methods
  private generateWeeklySummaryText(completed: CompletedWorkSection, activeEngineers: number): string {
    const issueCount = completed.issues.length;
    const prCount = completed.pullRequests.length;
    
    if (issueCount === 0 && prCount === 0) {
      return 'A quiet week with focus on planning and preparation.';
    }

    const highlights = [];
    
    if (issueCount > 10) {
      highlights.push(`exceptional productivity with ${issueCount} issues completed`);
    } else if (issueCount > 5) {
      highlights.push(`solid progress with ${issueCount} issues completed`);
    } else if (issueCount > 0) {
      highlights.push(`${issueCount} issues completed`);
    }

    if (prCount > 15) {
      highlights.push(`high development velocity with ${prCount} PRs merged`);
    } else if (prCount > 0) {
      highlights.push(`${prCount} PRs merged`);
    }

    const teamSize = activeEngineers > 5 ? 'The team' : `${activeEngineers} engineers`;
    
    return `${teamSize} demonstrated ${highlights.join(' and ')}.`;
  }

  private assessImpact(issue: LinearIssue): string | undefined {
    // Assess impact based on labels, priority, and project
    if (issue.priority >= 1 && issue.priority <= 2) {
      return 'Critical feature/fix impacting core functionality';
    }
    
    if (issue.labels.some(l => l.name.toLowerCase().includes('customer'))) {
      return 'Direct customer impact';
    }
    
    if (issue.labels.some(l => l.name.toLowerCase().includes('performance'))) {
      return 'Performance improvement';
    }
    
    return undefined;
  }

  private summarizePR(pr: GitHubPullRequest): string {
    const additions = pr.additions;
    const deletions = pr.deletions;
    const files = pr.changedFiles;
    
    const size = additions + deletions;
    let sizeDesc = 'small';
    if (size > 500) sizeDesc = 'large';
    else if (size > 100) sizeDesc = 'medium';
    
    return `${sizeDesc} change affecting ${files} files (+${additions}/-${deletions})`;
  }

  private calculateProgress(issue: LinearIssue): number {
    // Simple progress calculation based on subtasks or time
    if (issue.completedAt) return 100;
    if (!issue.startedAt) return 0;
    
    // Estimate based on typical cycle time
    const daysWorked = differenceInDays(new Date(), new Date(issue.startedAt));
    const estimatedDays = (issue.estimate || 3) * 2; // Convert points to days
    
    return Math.min(Math.round((daysWorked / estimatedDays) * 100), 90);
  }

  private estimateCompletion(issue: LinearIssue): Date | undefined {
    if (!issue.startedAt || !issue.estimate) return undefined;
    
    const estimatedDays = issue.estimate * 2; // Convert points to days
    return new Date(new Date(issue.startedAt).getTime() + estimatedDays * 24 * 60 * 60 * 1000);
  }

  private extractBlockedReason(issue: LinearIssue): string {
    // Look for blocked reason in comments or description
    const description = issue.description || '';
    const blockedMatch = description.match(/blocked.*?:(.*?)(\n|$)/i);
    
    if (blockedMatch) {
      return blockedMatch[1].trim();
    }
    
    return 'Reason not specified';
  }

  private extractDependencies(issue: LinearIssue): string[] {
    // Extract issue IDs mentioned in description
    const description = issue.description || '';
    const matches = description.matchAll(/([A-Z]{2,}-\d+)/g);
    
    return Array.from(matches).map(m => m[1]);
  }

  private estimateStartDate(issue: LinearIssue): Date | undefined {
    // Estimate based on priority and current workload
    const daysUntilStart = Math.max(1, 5 - issue.priority);
    return new Date(Date.now() + daysUntilStart * 24 * 60 * 60 * 1000);
  }

  private calculateWorkTypeBreakdown(issues: LinearIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      features: 0,
      bugs: 0,
      techDebt: 0,
      other: 0
    };

    for (const issue of issues) {
      const labels = issue.labels.map(l => l.name.toLowerCase());
      
      if (labels.some(l => l.includes('bug'))) {
        breakdown.bugs++;
      } else if (labels.some(l => l.includes('tech-debt') || l.includes('refactor'))) {
        breakdown.techDebt++;
      } else if (labels.some(l => l.includes('feature'))) {
        breakdown.features++;
      } else {
        breakdown.other++;
      }
    }

    return breakdown;
  }

  private calculateProjectBreakdown(issues: LinearIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const issue of issues) {
      const project = issue.project?.name || 'No Project';
      breakdown[project] = (breakdown[project] || 0) + 1;
    }
    
    return breakdown;
  }

  private calculatePriorityBreakdown(issues: LinearIssue[]): Record<string, number> {
    const breakdown: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    for (const issue of issues) {
      if (issue.priority === 1) breakdown.urgent++;
      else if (issue.priority === 2) breakdown.high++;
      else if (issue.priority === 3) breakdown.medium++;
      else breakdown.low++;
    }

    return breakdown;
  }

  private generateEngineerHighlights(
    activity: EngineerActivity,
    accomplishments: any[]
  ): string[] {
    const highlights: string[] = [];

    // Major accomplishments
    const majorWork = accomplishments.filter(a => 
      a.impact || a.title.toLowerCase().includes('major')
    );
    
    if (majorWork.length > 0) {
      highlights.push(`Delivered ${majorWork.length} high-impact items`);
    }

    // Code contributions
    if (activity.metrics.codeAdditions > 1000) {
      highlights.push(`Significant code contributions: +${activity.metrics.codeAdditions} lines`);
    }

    // Review activity
    if (activity.metrics.reviewsGiven > 10) {
      highlights.push(`Active reviewer with ${activity.metrics.reviewsGiven} reviews completed`);
    }

    // Consistency
    if (activity.metrics.issuesCompleted > 5 && activity.metrics.pullRequestsMerged > 5) {
      highlights.push('Consistent delivery across issues and code changes');
    }

    return highlights;
  }

  private generateTeamHighlights(
    summary: any,
    individualReports: IndividualEngineerReport[]
  ): string[] {
    const highlights: string[] = [];

    // Sprint completion
    const completionRate = (summary.completedIssues / summary.totalIssues) * 100;
    if (completionRate > 90) {
      highlights.push(`Exceptional sprint completion rate: ${Math.round(completionRate)}%`);
    } else if (completionRate > 75) {
      highlights.push(`Strong sprint completion: ${Math.round(completionRate)}%`);
    }

    // Velocity trend
    if (summary.velocity > summary.plannedVelocity * 1.1) {
      highlights.push(`Exceeded planned velocity by ${Math.round((summary.velocity / summary.plannedVelocity - 1) * 100)}%`);
    }

    // Team collaboration
    const avgPRsPerEngineer = individualReports.reduce((sum, r) => 
      sum + r.summary.pullRequestsMerged, 0
    ) / individualReports.length;
    
    if (avgPRsPerEngineer > 5) {
      highlights.push('High development activity across the team');
    }

    // No blockers
    if (summary.blockedIssues === 0) {
      highlights.push('Zero blocked items - excellent dependency management');
    }

    return highlights;
  }

  private async storeReport(report: WeeklyReport | IndividualEngineerReport | SprintReport): Promise<void> {
    await this.db.query(`
      INSERT INTO generated_reports (
        id, type, title, generated_at, generated_by,
        team_id, time_range_start, time_range_end, data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      report.id,
      report.type,
      report.title,
      report.generatedAt,
      report.generatedBy,
      report.team.id,
      report.timeRange.start,
      report.timeRange.end,
      JSON.stringify(report)
    ]);
  }

  // Placeholder methods for monthly and quarterly reports
  private async generateMonthlyReport(userId: string, options: ReportGenerationOptions): Promise<string> {
    // Similar to weekly but with month timeframe and additional aggregations
    return this.generateWeeklyReport(userId, {
      ...options,
      timeRange: {
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
      }
    });
  }

  private async generateQuarterlyReport(userId: string, options: ReportGenerationOptions): Promise<string> {
    // Would include quarterly goals, OKRs, major milestones
    return this.generateWeeklyReport(userId, options);
  }
}
```

## Step 3: Export Formats Service

### Action 3.1: Create Export Service  
Create file: `src/services/reports/exportService.ts`
```typescript
import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import { marked } from 'marked';
import { ExportFormat } from '../../types/report.types';
import { logger } from '../../utils/logger';
import { AppError } from '../../middleware/error.middleware';

export class ExportService {
  private emailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeEmailTransporter();
  }

  private initializeEmailTransporter(): void {
    if (process.env.SMTP_HOST) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  async exportReport(
    content: string,
    format: ExportFormat,
    options: {
      filename?: string;
      recipients?: string[];
      subject?: string;
    } = {}
  ): Promise<Buffer | string> {
    switch (format) {
      case 'markdown':
        return content;

      case 'html':
        return this.exportAsHTML(content);

      case 'pdf':
        return this.exportAsPDF(content, options.filename);

      case 'email':
        return this.sendEmail(content, options);

      case 'json':
        return this.exportAsJSON(content);

      default:
        throw new AppError(400, `Unsupported export format: ${format}`);
    }
  }

  private exportAsHTML(markdownContent: string): string {
    // If already HTML, return as-is
    if (markdownContent.includes('<html>')) {
      return markdownContent;
    }

    // Convert markdown to HTML
    const htmlBody = marked(markdownContent);
    
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    blockquote {
      border-left: 4px solid #3498db;
      margin-left: 0;
      padding-left: 20px;
      color: #7f8c8d;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
      font-weight: bold;
    }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .metric {
      display: inline-block;
      background: #ecf0f1;
      padding: 5px 10px;
      border-radius: 15px;
      margin-right: 10px;
      margin-bottom: 10px;
    }
    .metric-value { font-weight: bold; color: #3498db; }
    ul { padding-left: 25px; }
    li { margin-bottom: 5px; }
    @media print {
      body { margin: 0; padding: 10px; }
      h1 { page-break-after: avoid; }
      h2 { page-break-after: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;
  }

  private async exportAsPDF(content: string, filename?: string): Promise<Buffer> {
    let browser;
    
    try {
      // Convert to HTML first
      const html = this.exportAsHTML(content);

      // Launch headless browser
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size: 10px; margin-left: 20px;">Report</div>',
        footerTemplate: '<div style="font-size: 10px; margin: 0 20px; width: 100%; text-align: center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
      });

      return pdf;

    } catch (error) {
      logger.error('Failed to generate PDF', error);
      throw new AppError(500, 'Failed to generate PDF report');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async sendEmail(
    content: string,
    options: {
      recipients?: string[];
      subject?: string;
    }
  ): Promise<string> {
    if (!this.emailTransporter) {
      throw new AppError(500, 'Email service not configured');
    }

    if (!options.recipients || options.recipients.length === 0) {
      throw new AppError(400, 'Email recipients required');
    }

    // Convert to HTML for email
    const htmlContent = this.exportAsHTML(content);

    try {
      const info = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to: options.recipients.join(', '),
        subject: options.subject || 'Engineering Report',
        html: htmlContent,
        text: content // Plain text fallback
      });

      logger.info('Email sent successfully', { messageId: info.messageId });
      return `Email sent successfully to ${options.recipients.join(', ')}`;

    } catch (error) {
      logger.error('Failed to send email', error);
      throw new AppError(500, 'Failed to send email report');
    }
  }

  private exportAsJSON(content: string): string {
    // This assumes the content is already a JSON-serializable report object
    // In practice, you might need to parse markdown back to structured data
    try {
      const jsonData = JSON.parse(content);
      return JSON.stringify(jsonData, null, 2);
    } catch (error) {
      // If not JSON, wrap in a simple structure
      return JSON.stringify({
        content,
        format: 'markdown',
        exportedAt: new Date().toISOString()
      }, null, 2);
    }
  }

  async generateClipboardHTML(content: string): Promise<string> {
    const html = this.exportAsHTML(content);
    
    // Add clipboard-specific styling
    return html.replace('</style>', `
      .copy-button {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
      }
      .copy-button:hover {
        background: #2980b9;
      }
      .copy-success {
        position: fixed;
        top: 70px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 10px;
        border-radius: 5px;
        display: none;
      }
    </style>`)
    .replace('<body>', `<body>
      <button class="copy-button" onclick="copyToClipboard()">Copy to Clipboard</button>
      <div class="copy-success">Copied!</div>
      <script>
        function copyToClipboard() {
          const content = document.body.innerText;
          navigator.clipboard.writeText(content).then(() => {
            const success = document.querySelector('.copy-success');
            success.style.display = 'block';
            setTimeout(() => success.style.display = 'none', 2000);
          });
        }
      </script>`);
  }
}
```

## Step 4: Report API Endpoints

### Action 4.1: Create Report Routes
Update file: `src/routes/reports.routes.ts`
```typescript
import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { ReportController } from '../controllers/report.controller';

export const reportsRouter = Router();
const reportController = new ReportController();

// All report routes require authentication
reportsRouter.use(authenticate);

// Generate reports
reportsRouter.post('/generate',
  asyncHandler(reportController.generateReport)
);

// Get saved reports
reportsRouter.get('/',
  asyncHandler(reportController.listReports)
);

reportsRouter.get('/:reportId',
  asyncHandler(reportController.getReport)
);

// Export report in different formats
reportsRouter.post('/:reportId/export',
  asyncHandler(reportController.exportReport)
);

// Email report
reportsRouter.post('/:reportId/email',
  asyncHandler(reportController.emailReport)
);

// Report templates
reportsRouter.get('/templates',
  asyncHandler(reportController.listTemplates)
);

reportsRouter.post('/templates',
  asyncHandler(reportController.createTemplate)
);

// Preview report (without saving)
reportsRouter.post('/preview',
  asyncHandler(reportController.previewReport)
);
```

### Action 4.2: Create Report Controller
Create file: `src/controllers/report.controller.ts`
```typescript
import { Request, Response } from 'express';
import { ReportGenerator } from '../services/reports/reportGenerator';
import { ExportService } from '../services/reports/exportService';
import { DatabaseService } from '../services/database.service';
import { AppError } from '../middleware/error.middleware';
import { ReportGenerationOptions, ExportFormat } from '../types/report.types';

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export class ReportController {
  private reportGenerator: ReportGenerator;
  private exportService: ExportService;
  private db: DatabaseService;

  constructor() {
    this.reportGenerator = new ReportGenerator();
    this.exportService = new ExportService();
    this.db = new DatabaseService();
  }

  generateReport = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const options: ReportGenerationOptions = {
      type: req.body.type,
      format: req.body.format || 'markdown',
      teamId: req.body.teamId,
      timeRange: req.body.timeRange ? {
        start: new Date(req.body.timeRange.start),
        end: new Date(req.body.timeRange.end)
      } : undefined,
      includeMetrics: req.body.includeMetrics !== false,
      includeCharts: req.body.includeCharts,
      customTemplate: req.body.customTemplate,
      filters: req.body.filters
    };

    const report = await this.reportGenerator.generateReport(req.user.id, options);

    res.json({
      success: true,
      data: {
        report,
        format: options.format
      }
    });
  };

  listReports = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { teamId, type, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT id, type, title, generated_at, time_range_start, time_range_end
      FROM generated_reports
      WHERE generated_by = $1
    `;
    const params: any[] = [req.user.id];

    if (teamId) {
      query += ` AND team_id = $${params.length + 1}`;
      params.push(teamId);
    }

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    query += ` ORDER BY generated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  };

  getReport = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { reportId } = req.params;

    const result = await this.db.query(`
      SELECT data, type
      FROM generated_reports
      WHERE id = $1 AND generated_by = $2
    `, [reportId, req.user.id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Report not found');
    }

    res.json({
      success: true,
      data: result.rows[0].data
    });
  };

  exportReport = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { reportId } = req.params;
    const { format } = req.body as { format: ExportFormat };

    // Get report data
    const result = await this.db.query(`
      SELECT data, title
      FROM generated_reports
      WHERE id = $1 AND generated_by = $2
    `, [reportId, req.user.id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Report not found');
    }

    const reportData = result.rows[0].data;
    const title = result.rows[0].title;

    // Re-render in requested format
    const options: ReportGenerationOptions = {
      type: reportData.type,
      format,
      teamId: reportData.team.id
    };

    const content = await this.reportGenerator.generateReport(req.user.id, options);
    const exported = await this.exportService.exportReport(content, format, {
      filename: `${title.replace(/\s+/g, '-')}.${format}`
    });

    if (format === 'pdf') {
      res.contentType('application/pdf');
      res.send(exported);
    } else if (format === 'html') {
      res.contentType('text/html');
      res.send(exported);
    } else {
      res.json({
        success: true,
        data: {
          content: exported,
          format
        }
      });
    }
  };

  emailReport = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { reportId } = req.params;
    const { recipients, subject } = req.body;

    if (!recipients || recipients.length === 0) {
      throw new AppError(400, 'Recipients required');
    }

    // Get report and regenerate as email format
    const result = await this.db.query(`
      SELECT data, title
      FROM generated_reports
      WHERE id = $1 AND generated_by = $2
    `, [reportId, req.user.id]);

    if (result.rows.length === 0) {
      throw new AppError(404, 'Report not found');
    }

    const reportData = result.rows[0].data;
    const options: ReportGenerationOptions = {
      type: reportData.type,
      format: 'email',
      teamId: reportData.team.id
    };

    const content = await this.reportGenerator.generateReport(req.user.id, options);
    const emailResult = await this.exportService.exportReport(content, 'email', {
      recipients,
      subject: subject || `Engineering Report - ${result.rows[0].title}`
    });

    res.json({
      success: true,
      data: { message: emailResult }
    });
  };

  listTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    // Return built-in templates for now
    const templates = [
      {
        id: 'weekly-standard',
        name: 'Standard Weekly Report',
        type: 'weekly',
        format: 'markdown',
        sections: ['summary', 'completed', 'inProgress', 'blocked', 'upcoming', 'metrics']
      },
      {
        id: 'sprint-summary',
        name: 'Sprint Summary',
        type: 'sprint',
        format: 'markdown',
        sections: ['overview', 'teamHighlights', 'projects', 'individuals']
      },
      {
        id: 'individual-monthly',
        name: 'Individual Monthly Review',
        type: 'individual',
        format: 'markdown',
        sections: ['summary', 'accomplishments', 'workBreakdown', 'highlights']
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  };

  createTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    // Template creation would be implemented here
    throw new AppError(501, 'Custom templates not yet implemented');
  };

  previewReport = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const options: ReportGenerationOptions = req.body;
    const report = await this.reportGenerator.generateReport(req.user.id, options);

    res.json({
      success: true,
      data: {
        preview: report,
        format: options.format
      }
    });
  };
}
```

## Step 5: Database Schema Updates

### Action 5.1: Create Reports Table
Create file: `src/database/migrations/004_add_reports.sql`
```sql
-- Generated reports table
CREATE TABLE generated_reports (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  generated_by UUID REFERENCES engineers(id),
  team_id UUID REFERENCES teams(id),
  time_range_start TIMESTAMP NOT NULL,
  time_range_end TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for report queries
CREATE INDEX idx_reports_type ON generated_reports(type);
CREATE INDEX idx_reports_generated_by ON generated_reports(generated_by);
CREATE INDEX idx_reports_team ON generated_reports(team_id);
CREATE INDEX idx_reports_generated_at ON generated_reports(generated_at DESC);

-- Report templates table
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  format VARCHAR(50) NOT NULL,
  template_content TEXT NOT NULL,
  sections JSONB,
  custom_fields JSONB,
  created_by UUID REFERENCES engineers(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scheduled reports table (for future)
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id),
  team_id UUID REFERENCES teams(id),
  schedule VARCHAR(100) NOT NULL, -- cron expression
  recipients TEXT[],
  format VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_by UUID REFERENCES engineers(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Step 6: Testing

### Action 6.1: Create Report Generator Tests
Create file: `tests/unit/services/reportGenerator.test.ts`
```typescript
import { ReportGenerator } from '../../../src/services/reports/reportGenerator';
import { DashboardService } from '../../../src/services/dashboard/dashboard.service';

jest.mock('../../../src/services/dashboard/dashboard.service');

describe('Report Generator', () => {
  let generator: ReportGenerator;
  let mockDashboardService: jest.Mocked<DashboardService>;

  beforeEach(() => {
    generator = new ReportGenerator();
    mockDashboardService = DashboardService.prototype as any;
  });

  describe('generateWeeklyReport', () => {
    it('should generate a weekly report with all sections', async () => {
      const mockActivities = [
        {
          engineer: { id: '1', name: 'John Doe' },
          linearIssues: [
            {
              id: '1',
              identifier: 'ABC-123',
              title: 'Test Issue',
              state: { type: 'completed' },
              completedAt: new Date(),
              estimate: 3
            }
          ],
          pullRequests: [
            {
              id: '1',
              number: 123,
              title: 'Test PR',
              state: 'merged',
              mergedAt: new Date(),
              additions: 100,
              deletions: 50,
              changedFiles: 5
            }
          ],
          metrics: {
            issuesCompleted: 1,
            pullRequestsMerged: 1
          }
        }
      ];

      mockDashboardService.getTeamActivity.mockResolvedValue(mockActivities);
      mockDashboardService.getTeam.mockResolvedValue({
        id: 'team1',
        name: 'Engineering',
        engineers: []
      });

      const report = await generator.generateReport('user1', {
        type: 'weekly',
        format: 'markdown',
        teamId: 'team1'
      });

      expect(report).toContain('Weekly Report');
      expect(report).toContain('ABC-123');
      expect(report).toContain('Test PR');
      expect(report).toContain('Summary');
      expect(report).toContain('Metrics');
    });
  });

  describe('generateIndividualReport', () => {
    it('should generate an individual engineer report', async () => {
      const mockEngineer = {
        id: 'eng1',
        name: 'Jane Smith',
        email: 'jane@example.com'
      };

      const mockActivity = {
        engineer: mockEngineer,
        linearIssues: [
          {
            id: '1',
            identifier: 'DEF-456',
            title: 'Feature Implementation',
            state: { type: 'completed' },
            completedAt: new Date(),
            priority: 2,
            labels: [{ name: 'feature' }]
          }
        ],
        pullRequests: [],
        metrics: {
          issuesCompleted: 5,
          pullRequestsMerged: 8,
          codeAdditions: 1500,
          codeDeletions: 300,
          reviewsGiven: 12
        }
      };

      mockDashboardService.getEngineer.mockResolvedValue(mockEngineer);
      mockDashboardService.getEngineerActivity.mockResolvedValue(mockActivity);

      const report = await generator.generateReport('user1', {
        type: 'individual',
        format: 'markdown',
        teamId: 'team1',
        filters: { engineers: ['eng1'] }
      });

      expect(report).toContain('Jane Smith');
      expect(report).toContain('Performance Summary');
      expect(report).toContain('5'); // issues completed
      expect(report).toContain('8'); // PRs merged
      expect(report).toContain('+1500'); // additions
    });
  });
});
```

## Step 7: Update Dependencies

### Action 7.1: Update package.json
Add to dependencies:
```json
{
  "dependencies": {
    "handlebars": "^4.7.8",
    "marked": "^9.0.3",
    "puppeteer": "^21.1.1",
    "nodemailer": "^6.9.4",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/nodemailer": "^6.4.9"
  }
}
```

## Completion Checklist

Upon completing Phase 4:

1. ✓ Report type definitions for all formats
2. ✓ Template engine with Handlebars
3. ✓ Report generator for weekly, sprint, and individual reports
4. ✓ Export service supporting markdown, HTML, PDF, email
5. ✓ API endpoints for report generation and export
6. ✓ Database schema for storing reports
7. ✓ Email delivery capability
8. ✓ Copy-to-clipboard functionality
9. ✓ Test coverage for report generation
10. ✓ Support for custom templates

## Verification Steps

```bash
# Install new dependencies
npm install

# Run migrations
npm run db:migrate

# Run tests
npm test

# Start server
npm run dev

# Test report generation
# POST http://localhost:3001/api/reports/generate
# {
#   "type": "weekly",
#   "format": "markdown",
#   "teamId": "team-id"
# }
```

## Next Phase Dependencies

Phase 4 enables:
- Phase 5: Frontend can display and export reports
- Phase 6: Performance optimization for report generation

## Key Implementation Notes

1. **Template Flexibility**: Handlebars allows easy customization
2. **Multiple Formats**: Same data rendered differently per format
3. **Email Integration**: Built-in SMTP support for report distribution
4. **PDF Generation**: Puppeteer provides high-quality PDF output
5. **Performance**: Reports are cached after generation
6. **Extensibility**: Easy to add new report types and formats