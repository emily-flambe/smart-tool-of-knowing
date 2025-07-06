import { BaseEntity } from './base.types';

export interface GitHubPullRequest extends BaseEntity {
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  author: GitHubUser;
  assignees: GitHubUser[];
  reviewers: GitHubUser[];
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  headRef: string;
  baseRef: string;
  draft: boolean;
  mergeable?: boolean;
  merged: boolean;
  mergedAt?: Date;
  closedAt?: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision?: 'approved' | 'changes_requested' | 'review_required';
  url: string;
  repository: GitHubRepository;
  linkedIssues?: string[];
}

export interface GitHubUser {
  id: string;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  type: 'User' | 'Bot';
}

export interface GitHubRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  private: boolean;
  defaultBranch: string;
  url: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: GitHubUser;
  committedDate: Date;
  additions: number;
  deletions: number;
  changedFiles: number;
  url: string;
}

export interface GitHubLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubMilestone {
  id: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed';
  dueOn?: Date;
  closedAt?: Date;
}

export interface GitHubReview {
  id: string;
  author: GitHubUser;
  state: 'pending' | 'commented' | 'approved' | 'changes_requested' | 'dismissed';
  body?: string;
  submittedAt?: Date;
}