import { BaseEntity } from './base.types';

export interface LinearIssue extends BaseEntity {
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  state: LinearIssueState;
  assignee?: LinearUser;
  project?: LinearProject;
  cycle?: LinearCycle;
  labels: LinearLabel[];
  completedAt?: Date;
  canceledAt?: Date;
  startedAt?: Date;
  url: string;
  branchName?: string;
}

export interface LinearIssueState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  color: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string;
  color: string;
  state: 'planned' | 'started' | 'paused' | 'completed' | 'canceled';
  progress: number;
  targetDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface LinearCycle {
  id: string;
  number: number;
  name?: string;
  startsAt: Date;
  endsAt: Date;
  progress: number;
  issueCount: number;
  completedIssueCount: number;
}

export interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
  description?: string;
  members: LinearUser[];
}