import { LinearIssue, LinearUser, LinearCycle, LinearProject } from './linear.types';
import { GitHubPullRequest, GitHubCommit } from './github.types';
import { TimeRange, TimeView } from './base.types';

export interface Engineer {
  id: string;
  name: string;
  email: string;
  linearUserId?: string;
  githubUsername?: string;
  avatarUrl?: string;
  team?: Team;
  isActive: boolean;
}

export interface Team {
  id: string;
  name: string;
  linearTeamId?: string;
  engineers: Engineer[];
  lead?: Engineer;
}

export interface EngineerActivity {
  engineer: Engineer;
  timeRange: TimeRange;
  linearIssues: LinearIssue[];
  pullRequests: GitHubPullRequest[];
  commits: GitHubCommit[];
  metrics: EngineerMetrics;
}

export interface EngineerMetrics {
  issuesCompleted: number;
  issuesInProgress: number;
  pullRequestsMerged: number;
  pullRequestsOpen: number;
  pullRequestsReviewing: number;
  codeAdditions: number;
  codeDeletions: number;
  reviewsGiven: number;
  averagePRMergeTime?: number;
  workTypeBreakdown: WorkTypeBreakdown;
}

export interface WorkTypeBreakdown {
  features: number;
  bugs: number;
  techDebt: number;
  other: number;
}

export interface SprintSummary {
  cycle: LinearCycle;
  team: Team;
  startDate: Date;
  endDate: Date;
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  blockedIssues: number;
  velocity: number;
  engineerSummaries: EngineerSprintSummary[];
  projectBreakdown: ProjectBreakdown[];
}

export interface EngineerSprintSummary {
  engineer: Engineer;
  plannedIssues: number;
  completedIssues: number;
  addedIssues: number;
  removedIssues: number;
  storyPointsCompleted: number;
  pullRequestsMerged: number;
}

export interface ProjectBreakdown {
  project: LinearProject;
  issuesCompleted: number;
  issuesTotal: number;
  progress: number;
  engineers: Engineer[];
}

export interface WeeklyReport {
  team: Team;
  weekStartDate: Date;
  weekEndDate: Date;
  summary: {
    issuesCompleted: LinearIssue[];
    pullRequestsMerged: GitHubPullRequest[];
    engineerHighlights: EngineerHighlight[];
    blockers: Blocker[];
    upcomingWork: LinearIssue[];
  };
  metrics: TeamMetrics;
  generatedAt: Date;
}

export interface EngineerHighlight {
  engineer: Engineer;
  accomplishments: string[];
  issueCount: number;
  prCount: number;
}

export interface Blocker {
  issue: LinearIssue;
  reason: string;
  duration: number;
  assignee: Engineer;
}

export interface TeamMetrics {
  velocity: number;
  completionRate: number;
  averageCycleTime: number;
  bugFixRate: number;
  reviewTurnaroundTime: number;
}

export interface DashboardFilter {
  timeView: TimeView;
  customRange?: TimeRange;
  engineers?: string[];
  projects?: string[];
  labels?: string[];
  issueStates?: string[];
  prStates?: string[];
}