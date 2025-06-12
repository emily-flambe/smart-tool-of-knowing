export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: {
    name: string;
    type: string;
  };
  assignee?: {
    name: string;
    email: string;
  };
  priority: number;
  estimate?: number;
  createdAt: string;
  updatedAt: string;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  project?: {
    id: string;
    name: string;
  };
}

export interface LinearCycle {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive?: boolean;
  status?: 'active' | 'completed' | 'future';
  team: {
    id: string;
    name: string;
  };
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  startDate?: string;
  targetDate?: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearViewer {
  id: string;
  name: string;
  email: string;
}

export interface SummaryOptions {
  groupBy?: 'project' | 'cycle' | 'assignee' | 'priority';
  aiProvider?: 'openai' | 'anthropic';
  summaryType?: 'brief' | 'detailed' | 'action-items';
  includeMetrics?: boolean;
}

export interface IssueSummary {
  summary: string;
  keyPoints: string[];
  actionItems?: string[];
  metrics?: {
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    estimatedHours?: number;
  };
}