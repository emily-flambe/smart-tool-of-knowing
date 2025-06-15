export interface LinearIssue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: number
  estimate?: number
  state: {
    id: string
    name: string
    type: string
  }
  assignee?: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    name: string
    color: string
  }
  cycle?: {
    id: string
    name: string
  }
  labels: Array<{
    id: string
    name: string
    color: string
  }>
}

export interface LinearCycle {
  id: string
  name: string
  number: number
  startsAt: string
  endsAt: string
  completedAt?: string
  issues: LinearIssue[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface ProjectSummary {
  id: string
  name: string
  color: string
  totalPoints: number
  issueCount: number
}

export const PRIORITY_LABELS = {
  1: { label: 'Urgent', color: 'bg-red-500' },
  2: { label: 'High', color: 'bg-orange-500' },
  3: { label: 'Medium', color: 'bg-yellow-500' },
  4: { label: 'Low', color: 'bg-green-500' }
} as const