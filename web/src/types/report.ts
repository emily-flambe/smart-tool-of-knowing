export interface ReportConfig {
  dateRange: {
    start: Date;
    end: Date;
    preset?: string;
  };
  reportType: string;
  includeSources: {
    linear: boolean;
    github: boolean;
    coda: boolean;
  };
}

export interface ReportMetrics {
  issuesCompleted: number;
  prsMerged: number;
  storyPoints: number;
  contributors: number;
}

export interface ProjectSummary {
  name: string;
  completedIssues: number;
  summary?: string;
  contributors?: string[];
}

export interface CompletedIssue {
  identifier: string;
  title: string;
  assignee: string;
  project: string;
  url?: string;
  linkedPRs?: Array<{
    number: number;
    url: string;
  }>;
}

export interface ReportData {
  title: string;
  summary?: string;
  metrics?: ReportMetrics;
  highlights?: string[];
  projectSummaries?: ProjectSummary[];
  completedIssues?: CompletedIssue[];
  actionItems?: string[];
  generatedAt: string;
}