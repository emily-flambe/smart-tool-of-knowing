# Phase 5: Frontend Implementation - Implementation Plan

## Execution Context for AI Agent
This document provides exact implementation steps for building the React frontend application with TypeScript, including all components, state management, API integration, and mobile-responsive design. Execute each step sequentially after completing Phase 4.

## Prerequisites
- Phase 1-4 completed (API endpoints available)
- Node.js and npm installed
- React development environment

## Step 1: Frontend Project Setup

### Action 1.1: Initialize React Application
```bash
cd web
npm create vite@latest . -- --template react-ts
```

### Action 1.2: Update TypeScript Configuration
Update file: `web/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"],
      "@assets/*": ["src/assets/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Action 1.3: Install Dependencies
Create/Update file: `web/package.json`
```json
{
  "name": "engineering-dashboard-web",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.16.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.5.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.8.0",
    "clsx": "^2.0.0",
    "react-hot-toast": "^2.4.1",
    "@headlessui/react": "^1.7.17",
    "@heroicons/react": "^2.0.18",
    "framer-motion": "^10.16.4",
    "react-markdown": "^9.0.0",
    "react-hook-form": "^7.46.1",
    "zod": "^3.22.2",
    "@hookform/resolvers": "^3.3.1",
    "zustand": "^4.4.1",
    "tailwindcss": "^3.3.3",
    "autoprefixer": "^10.4.15",
    "postcss": "^8.4.29"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "eslint": "^8.45.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "typescript": "^5.0.2",
    "vite": "^4.4.5",
    "vitest": "^0.34.6",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.3",
    "@testing-library/user-event": "^14.5.1",
    "msw": "^1.3.2"
  }
}
```

### Action 1.4: Setup Tailwind CSS
Create file: `web/tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
```

## Step 2: Type Definitions

### Action 2.1: Create Frontend Types
Create file: `web/src/types/index.ts`
```typescript
// Re-export relevant types from backend
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

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  state: IssueState;
  assignee?: User;
  project?: Project;
  cycle?: Cycle;
  labels: Label[];
  completedAt?: string;
  canceledAt?: string;
  startedAt?: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  branchName?: string;
}

export interface IssueState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
  color: string;
}

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  author: User;
  assignees: User[];
  reviewers: User[];
  labels: Label[];
  headRef: string;
  baseRef: string;
  draft: boolean;
  merged: boolean;
  mergedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  url: string;
  repository: Repository;
  linkedIssues?: string[];
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  state: string;
  progress: number;
}

export interface Cycle {
  id: string;
  number: number;
  name?: string;
  startsAt: string;
  endsAt: string;
  progress: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface EngineerActivity {
  engineer: Engineer;
  timeRange: TimeRange;
  linearIssues: LinearIssue[];
  pullRequests: GitHubPullRequest[];
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

export interface TimeRange {
  start: string;
  end: string;
}

export type TimeView = 'today' | 'thisWeek' | 'thisSprint' | 'thisMonth' | 'custom';

export interface DashboardFilter {
  timeView: TimeView;
  customRange?: TimeRange;
  engineers?: string[];
  projects?: string[];
  labels?: string[];
  issueStates?: string[];
  prStates?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ReportType = 'weekly' | 'sprint' | 'monthly' | 'quarterly' | 'individual';
export type ExportFormat = 'markdown' | 'html' | 'pdf' | 'email' | 'json';

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  timeRangeStart: string;
  timeRangeEnd: string;
}
```

## Step 3: API Client Setup

### Action 3.1: Create API Client
Create file: `web/src/services/api.ts`
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '@/types';
import toast from 'react-hot-toast';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse<any>>) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        } else if (error.response?.data?.error) {
          // Show error message
          toast.error(error.response.data.error.message);
        } else if (error.request) {
          toast.error('Network error. Please check your connection.');
        } else {
          toast.error('An unexpected error occurred.');
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data!;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data!;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data!;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Request failed');
    }
    return response.data.data!;
  }
}

export const apiClient = new ApiClient();
```

### Action 3.2: Create API Service Hooks
Create file: `web/src/services/dashboard.service.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api';
import { 
  EngineerActivity, 
  Team, 
  DashboardFilter,
  Report,
  ReportType,
  ExportFormat 
} from '@/types';

// Team queries
export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => apiClient.get<Team[]>('/teams'),
  });
};

export const useTeam = (teamId: string) => {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => apiClient.get<Team>(`/teams/${teamId}`),
    enabled: !!teamId,
  });
};

// Dashboard queries
export const useTeamActivity = (teamId: string, filter: DashboardFilter) => {
  return useQuery({
    queryKey: ['teamActivity', teamId, filter],
    queryFn: () => apiClient.get<EngineerActivity[]>(
      `/dashboard/teams/${teamId}/activity`,
      filter
    ),
    enabled: !!teamId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

export const useCurrentSprint = (teamId: string) => {
  return useQuery({
    queryKey: ['currentSprint', teamId],
    queryFn: () => apiClient.get(`/dashboard/teams/${teamId}/sprint`),
    enabled: !!teamId,
  });
};

export const useEngineerActivity = (engineerId: string, timeView: string) => {
  return useQuery({
    queryKey: ['engineerActivity', engineerId, timeView],
    queryFn: () => apiClient.get(
      `/dashboard/engineers/${engineerId}/activity`,
      { timeView }
    ),
    enabled: !!engineerId,
  });
};

// Sync mutations
export const useSyncTeam = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (teamId: string) => 
      apiClient.post(`/dashboard/teams/${teamId}/sync`),
    onSuccess: (_, teamId) => {
      queryClient.invalidateQueries({ queryKey: ['teamActivity', teamId] });
      queryClient.invalidateQueries({ queryKey: ['currentSprint', teamId] });
      toast.success('Team data synced successfully');
    },
  });
};

// Report queries and mutations
export const useReports = (teamId?: string, type?: ReportType) => {
  return useQuery({
    queryKey: ['reports', teamId, type],
    queryFn: () => apiClient.get<Report[]>('/reports', { teamId, type }),
  });
};

export const useReport = (reportId: string) => {
  return useQuery({
    queryKey: ['reports', reportId],
    queryFn: () => apiClient.get(`/reports/${reportId}`),
    enabled: !!reportId,
  });
};

export const useGenerateReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (options: {
      type: ReportType;
      teamId: string;
      format?: ExportFormat;
      timeRange?: { start: string; end: string };
      filters?: any;
    }) => apiClient.post('/reports/generate', options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report generated successfully');
    },
  });
};

export const useExportReport = () => {
  return useMutation({
    mutationFn: ({ reportId, format }: { reportId: string; format: ExportFormat }) =>
      apiClient.post(`/reports/${reportId}/export`, { format }),
  });
};

export const useEmailReport = () => {
  return useMutation({
    mutationFn: ({ 
      reportId, 
      recipients, 
      subject 
    }: { 
      reportId: string; 
      recipients: string[]; 
      subject?: string;
    }) => apiClient.post(`/reports/${reportId}/email`, { recipients, subject }),
    onSuccess: () => {
      toast.success('Report sent successfully');
    },
  });
};

// Auth queries
export const useAuthStatus = () => {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: async () => {
      const [linear, github] = await Promise.all([
        apiClient.get<{ connected: boolean }>('/auth/linear/status'),
        apiClient.get<{ connected: boolean }>('/auth/github/status'),
      ]);
      return { linear, github };
    },
  });
};
```

## Step 4: Core Components

### Action 4.1: Create Layout Components
Create file: `web/src/components/Layout/MainLayout.tsx`
```typescript
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  Cog6ToothIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useSyncTeam } from '@/services/dashboard.service';
import { useStore } from '@/store';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Sprint', href: '/sprint', icon: ChartBarIcon },
  { name: 'Reports', href: '/reports', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { selectedTeam } = useStore();
  const syncTeam = useSyncTeam();

  const handleSync = () => {
    if (selectedTeam) {
      syncTeam.mutate(selectedTeam.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">
            Engineering Dashboard
          </h1>
        </div>
        
        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon
                  className={clsx(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sync button */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleSync}
            disabled={!selectedTeam || syncTeam.isPending}
            className="flex w-full items-center justify-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon 
              className={clsx(
                'mr-2 h-4 w-4',
                syncTeam.isPending && 'animate-spin'
              )} 
            />
            {syncTeam.isPending ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white shadow-sm">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center space-x-4">
              {selectedTeam && (
                <div className="text-sm text-gray-600">
                  Team: <span className="font-medium text-gray-900">{selectedTeam.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User menu would go here */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

### Action 4.2: Create Dashboard Components
Create file: `web/src/components/Dashboard/TeamActivityCard.tsx`
```typescript
import React from 'react';
import { EngineerActivity } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  CodeBracketIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface TeamActivityCardProps {
  activity: EngineerActivity;
  onClick?: () => void;
}

export const TeamActivityCard: React.FC<TeamActivityCardProps> = ({ 
  activity, 
  onClick 
}) => {
  const { engineer, metrics, linearIssues, pullRequests } = activity;
  
  const currentIssue = linearIssues.find(i => i.state.type === 'started');
  const blockedIssues = linearIssues.filter(i => 
    i.labels.some(l => l.name.toLowerCase().includes('blocked'))
  );
  const recentPRs = pullRequests
    .filter(pr => pr.state === 'open')
    .slice(0, 3);

  return (
    <div 
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      {/* Engineer header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {engineer.avatarUrl ? (
            <img
              src={engineer.avatarUrl}
              alt={engineer.name}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
              <span className="text-sm font-medium text-gray-600">
                {engineer.name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">{engineer.name}</h3>
            <p className="text-xs text-gray-500">{engineer.email}</p>
          </div>
        </div>
        
        {blockedIssues.length > 0 && (
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        )}
      </div>

      {/* Current work */}
      {currentIssue && (
        <div className="mb-4 rounded-md bg-blue-50 p-3">
          <div className="flex items-start space-x-2">
            <ClockIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="flex-1 text-xs">
              <p className="font-medium text-blue-900">
                {currentIssue.identifier}: {currentIssue.title}
              </p>
              {currentIssue.startedAt && (
                <p className="mt-1 text-blue-700">
                  Started {formatDistanceToNow(new Date(currentIssue.startedAt))} ago
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="flex items-center justify-center space-x-1">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-lg font-semibold text-gray-900">
              {metrics.issuesCompleted}
            </span>
          </div>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        
        <div>
          <div className="flex items-center justify-center space-x-1">
            <CodeBracketIcon className="h-4 w-4 text-purple-600" />
            <span className="text-lg font-semibold text-gray-900">
              {metrics.pullRequestsMerged}
            </span>
          </div>
          <p className="text-xs text-gray-500">PRs Merged</p>
        </div>
        
        <div>
          <div className="flex items-center justify-center space-x-1">
            <ClockIcon className="h-4 w-4 text-blue-600" />
            <span className="text-lg font-semibold text-gray-900">
              {metrics.issuesInProgress}
            </span>
          </div>
          <p className="text-xs text-gray-500">In Progress</p>
        </div>
      </div>

      {/* Recent PRs */}
      {recentPRs.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-medium text-gray-700">Open PRs</p>
          <div className="space-y-1">
            {recentPRs.map(pr => (
              <div key={pr.id} className="text-xs text-gray-600">
                #{pr.number}: {pr.title.substring(0, 50)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

### Action 4.3: Create Sprint Overview Component
Create file: `web/src/components/Sprint/SprintOverview.tsx`
```typescript
import React from 'react';
import { useCurrentSprint } from '@/services/dashboard.service';
import { useStore } from '@/store';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const SprintOverview: React.FC = () => {
  const { selectedTeam } = useStore();
  const { data: sprint, isLoading } = useCurrentSprint(selectedTeam?.id || '');

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!sprint) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active sprint found</p>
      </div>
    );
  }

  // Prepare chart data
  const velocityData = {
    labels: sprint.engineerSummaries.map(e => e.engineer.name),
    datasets: [
      {
        label: 'Story Points Completed',
        data: sprint.engineerSummaries.map(e => e.storyPointsCompleted),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const issueStatusData = {
    labels: ['Completed', 'In Progress', 'Not Started', 'Blocked'],
    datasets: [
      {
        data: [
          sprint.completedIssues,
          sprint.inProgressIssues,
          sprint.totalIssues - sprint.completedIssues - sprint.inProgressIssues - sprint.blockedIssues,
          sprint.blockedIssues,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(156, 163, 175, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  };

  const burndownData = {
    labels: generateDateLabels(sprint.startDate, sprint.endDate),
    datasets: [
      {
        label: 'Ideal',
        data: generateIdealBurndown(sprint.totalIssues, sprint.startDate, sprint.endDate),
        borderColor: 'rgb(156, 163, 175)',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
      },
      {
        label: 'Actual',
        data: generateActualBurndown(sprint), // This would need real historical data
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Sprint {sprint.cycle.number}
          {sprint.cycle.name && `: ${sprint.cycle.name}`}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {format(new Date(sprint.startDate), 'MMM d')} - {format(new Date(sprint.endDate), 'MMM d, yyyy')}
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Completion"
          value={`${Math.round((sprint.completedIssues / sprint.totalIssues) * 100)}%`}
          subtitle={`${sprint.completedIssues} of ${sprint.totalIssues} issues`}
          trend={sprint.velocity > 0 ? 'up' : 'neutral'}
        />
        <SummaryCard
          title="Velocity"
          value={sprint.velocity}
          subtitle="Story points"
          trend="neutral"
        />
        <SummaryCard
          title="In Progress"
          value={sprint.inProgressIssues}
          subtitle="Issues"
          trend="neutral"
        />
        <SummaryCard
          title="Blocked"
          value={sprint.blockedIssues}
          subtitle="Issues"
          trend={sprint.blockedIssues > 0 ? 'down' : 'neutral'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Sprint Burndown</h3>
          <Line data={burndownData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Issue Status</h3>
          <Doughnut data={issueStatusData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>

        <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
          <h3 className="mb-4 text-lg font-medium text-gray-900">Team Velocity</h3>
          <Bar data={velocityData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
      </div>

      {/* Project breakdown */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Project Progress</h2>
        <div className="space-y-4">
          {sprint.summary.projectBreakdown.map(project => (
            <div key={project.project.id} className="rounded-lg bg-white p-4 shadow">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{project.project.name}</h3>
                <span className="text-sm text-gray-600">
                  {project.issuesCompleted} / {project.issuesTotal} issues
                </span>
              </div>
              <div className="relative pt-1">
                <div className="overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.engineers.map(eng => (
                  <span
                    key={eng.id}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
                  >
                    {eng.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper components and functions
const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
}> = ({ title, value, subtitle, trend }) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${trendColors[trend]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

function generateDateLabels(start: string, end: string): string[] {
  const labels: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  
  while (current <= endDate) {
    labels.push(format(current, 'MMM d'));
    current.setDate(current.getDate() + 1);
  }
  
  return labels;
}

function generateIdealBurndown(total: number, start: string, end: string): number[] {
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
  const burnRate = total / days;
  const data: number[] = [];
  
  for (let i = 0; i <= days; i++) {
    data.push(Math.round(total - (burnRate * i)));
  }
  
  return data;
}

function generateActualBurndown(sprint: any): number[] {
  // This is a placeholder - in real implementation, you'd fetch historical data
  const days = Math.ceil((new Date(sprint.endDate).getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const current = Math.floor((new Date().getTime() - new Date(sprint.startDate).getTime()) / (1000 * 60 * 60 * 24));
  const data: number[] = [];
  
  for (let i = 0; i <= Math.min(current, days); i++) {
    // Simulate burndown
    const remaining = sprint.totalIssues - Math.floor((sprint.completedIssues / current) * i);
    data.push(remaining);
  }
  
  return data;
}
```

### Action 4.4: Create Report Components
Create file: `web/src/components/Reports/ReportGenerator.tsx`
```typescript
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGenerateReport } from '@/services/dashboard.service';
import { useStore } from '@/store';
import { ReportType, ExportFormat } from '@/types';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const reportSchema = z.object({
  type: z.enum(['weekly', 'sprint', 'monthly', 'quarterly', 'individual']),
  format: z.enum(['markdown', 'html', 'pdf', 'email', 'json']),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  engineers: z.array(z.string()).optional(),
  includeMetrics: z.boolean().default(true),
  includeCharts: z.boolean().default(false),
});

type ReportFormData = z.infer<typeof reportSchema>;

export const ReportGenerator: React.FC = () => {
  const { selectedTeam } = useStore();
  const generateReport = useGenerateReport();
  const [showPreview, setShowPreview] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: 'weekly',
      format: 'markdown',
      includeMetrics: true,
      includeCharts: false,
    },
  });

  const reportType = watch('type');

  const onSubmit = async (data: ReportFormData) => {
    if (!selectedTeam) return;

    const result = await generateReport.mutateAsync({
      ...data,
      teamId: selectedTeam.id,
    });

    setGeneratedReport(result);
    setShowPreview(true);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generate Report</h1>
        <p className="mt-2 text-sm text-gray-600">
          Create customized reports for your team's activity and progress
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <select
            {...register('type')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="weekly">Weekly Report</option>
            <option value="sprint">Sprint Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="quarterly">Quarterly Report</option>
            <option value="individual">Individual Report</option>
          </select>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
          )}
        </div>

        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Export Format
          </label>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {(['markdown', 'html', 'pdf', 'email', 'json'] as ExportFormat[]).map(format => (
              <label key={format} className="relative flex cursor-pointer rounded-lg border border-gray-300 bg-white p-4 shadow-sm focus:outline-none">
                <input
                  type="radio"
                  {...register('format')}
                  value={format}
                  className="sr-only"
                />
                <span className="flex flex-1">
                  <span className="flex flex-col">
                    <span className="block text-sm font-medium text-gray-900">
                      {format.toUpperCase()}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range (for non-sprint reports) */}
        {reportType !== 'sprint' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  {...register('timeRange.start')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <div className="relative mt-1">
                <input
                  type="date"
                  {...register('timeRange.end')}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pl-10 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        )}

        {/* Engineers (for individual reports) */}
        {reportType === 'individual' && selectedTeam && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Select Engineer
            </label>
            <select
              {...register('engineers.0')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Select an engineer</option>
              {selectedTeam.engineers.map(engineer => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Options */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('includeMetrics')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Include metrics and statistics
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('includeCharts')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Include charts and visualizations
            </label>
          </div>
        </div>

        {/* Submit button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={generateReport.isPending || !selectedTeam}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </form>

      {/* Report Preview Modal */}
      {showPreview && generatedReport && (
        <ReportPreview
          report={generatedReport}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

// Report Preview Component would go here
const ReportPreview: React.FC<{ report: any; onClose: () => void }> = ({ report, onClose }) => {
  // Implementation for preview modal
  return null;
};
```

## Step 5: State Management

### Action 5.1: Create Zustand Store
Create file: `web/src/store/index.ts`
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Team, DashboardFilter, TimeView } from '@/types';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  
  // Team selection
  selectedTeam: Team | null;
  
  // Dashboard filters
  dashboardFilter: DashboardFilter;
  
  // Actions
  setAuth: (isAuthenticated: boolean, user: any) => void;
  setSelectedTeam: (team: Team | null) => void;
  setDashboardFilter: (filter: Partial<DashboardFilter>) => void;
  resetFilters: () => void;
}

const defaultFilter: DashboardFilter = {
  timeView: 'thisWeek',
  engineers: [],
  projects: [],
  labels: [],
  issueStates: [],
  prStates: [],
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // State
      isAuthenticated: false,
      user: null,
      selectedTeam: null,
      dashboardFilter: defaultFilter,

      // Actions
      setAuth: (isAuthenticated, user) => set({ isAuthenticated, user }),
      
      setSelectedTeam: (team) => set({ selectedTeam: team }),
      
      setDashboardFilter: (filter) =>
        set((state) => ({
          dashboardFilter: { ...state.dashboardFilter, ...filter },
        })),
      
      resetFilters: () => set({ dashboardFilter: defaultFilter }),
    }),
    {
      name: 'engineering-dashboard',
      partialize: (state) => ({
        selectedTeam: state.selectedTeam,
        dashboardFilter: state.dashboardFilter,
      }),
    }
  )
);
```

## Step 6: Pages

### Action 6.1: Create Dashboard Page
Create file: `web/src/pages/Dashboard.tsx`
```typescript
import React from 'react';
import { useTeamActivity } from '@/services/dashboard.service';
import { useStore } from '@/store';
import { TeamActivityCard } from '@/components/Dashboard/TeamActivityCard';
import { DashboardFilters } from '@/components/Dashboard/DashboardFilters';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedTeam, dashboardFilter } = useStore();
  const { data: activities, isLoading, error } = useTeamActivity(
    selectedTeam?.id || '',
    dashboardFilter
  );

  if (!selectedTeam) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please select a team from settings</p>
          <button
            onClick={() => navigate('/settings')}
            className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <p className="text-red-800">Error loading dashboard: {error.message}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track your team's current activity and progress
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* Activity Grid */}
      {isLoading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities?.map((activity) => (
            <TeamActivityCard
              key={activity.engineer.id}
              activity={activity}
              onClick={() => navigate(`/engineer/${activity.engineer.id}`)}
            />
          ))}
        </div>
      )}

      {activities?.length === 0 && (
        <div className="mt-12 text-center">
          <p className="text-gray-500">No activity found for the selected filters</p>
        </div>
      )}
    </div>
  );
};
```

### Action 6.2: Create App Router
Create file: `web/src/App.tsx`
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { MainLayout } from '@/components/Layout/MainLayout';
import { DashboardPage } from '@/pages/Dashboard';
import { SprintPage } from '@/pages/Sprint';
import { ReportsPage } from '@/pages/Reports';
import { SettingsPage } from '@/pages/Settings';
import { EngineerDetailPage } from '@/pages/EngineerDetail';
import { LoginPage } from '@/pages/Login';
import { useStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  const { isAuthenticated } = useStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" />} />
            </>
          ) : (
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sprint" element={<SprintPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/engineer/:id" element={<EngineerDetailPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />
      
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
```

## Step 7: Mobile Responsive Design

### Action 7.1: Create Mobile Navigation
Create file: `web/src/components/Layout/MobileNav.tsx`
```typescript
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose, navigation }) => {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/80" />
        </Transition.Child>

        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
              <Transition.Child
                as={Fragment}
                enter="ease-in-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in-out duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button type="button" className="-m-2.5 p-2.5" onClick={onClose}>
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
              </Transition.Child>
              
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <h1 className="text-xl font-semibold">Engineering Dashboard</h1>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              onClick={onClose}
                              className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                            >
                              <item.icon
                                className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary-600"
                                aria-hidden="true"
                              />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
```

## Step 8: Testing Setup

### Action 8.1: Create Test Setup
Create file: `web/src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Action 8.2: Create Component Tests
Create file: `web/src/components/Dashboard/__tests__/TeamActivityCard.test.tsx`
```typescript
import { render, screen } from '@testing-library/react';
import { TeamActivityCard } from '../TeamActivityCard';
import { EngineerActivity } from '@/types';

const mockActivity: EngineerActivity = {
  engineer: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    isActive: true,
  },
  timeRange: {
    start: '2024-01-01',
    end: '2024-01-07',
  },
  linearIssues: [
    {
      id: '1',
      identifier: 'ENG-123',
      title: 'Implement new feature',
      state: { type: 'started', name: 'In Progress', color: 'blue' },
      startedAt: '2024-01-05T10:00:00Z',
      labels: [],
    },
  ],
  pullRequests: [],
  metrics: {
    issuesCompleted: 5,
    issuesInProgress: 2,
    pullRequestsMerged: 3,
    pullRequestsOpen: 1,
    pullRequestsReviewing: 0,
    codeAdditions: 500,
    codeDeletions: 100,
    reviewsGiven: 4,
    workTypeBreakdown: {
      features: 3,
      bugs: 2,
      techDebt: 0,
      other: 0,
    },
  },
};

describe('TeamActivityCard', () => {
  it('renders engineer information', () => {
    render(<TeamActivityCard activity={mockActivity} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays current work', () => {
    render(<TeamActivityCard activity={mockActivity} />);
    
    expect(screen.getByText(/ENG-123: Implement new feature/)).toBeInTheDocument();
    expect(screen.getByText(/Started/)).toBeInTheDocument();
  });

  it('shows metrics correctly', () => {
    render(<TeamActivityCard activity={mockActivity} />);
    
    expect(screen.getByText('5')).toBeInTheDocument(); // Completed
    expect(screen.getByText('3')).toBeInTheDocument(); // PRs Merged
    expect(screen.getByText('2')).toBeInTheDocument(); // In Progress
  });
});
```

## Step 9: Environment Configuration

### Action 9.1: Create Environment File
Create file: `web/.env.example`
```bash
VITE_API_URL=http://localhost:3001/api
VITE_APP_URL=http://localhost:5173
```

### Action 9.2: Update Vite Configuration
Create file: `web/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

## Completion Checklist

Upon completing Phase 5:

1. ✓ React application with TypeScript setup
2. ✓ Tailwind CSS for styling
3. ✓ Component library (Dashboard, Sprint, Reports)
4. ✓ State management with Zustand
5. ✓ API integration with React Query
6. ✓ Routing with React Router
7. ✓ Mobile-responsive design
8. ✓ Real-time data synchronization
9. ✓ Testing framework setup
10. ✓ Error handling and loading states

## Verification Steps

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Next Phase Dependencies

Phase 5 enables:
- Phase 6: Production deployment and performance optimization

## Key Implementation Notes

1. **Type Safety**: Shared types between frontend and backend
2. **Performance**: React Query for caching and background refetching
3. **Mobile First**: Responsive design with Tailwind breakpoints
4. **Accessibility**: ARIA labels and keyboard navigation
5. **Error Handling**: Graceful degradation with error boundaries
6. **State Management**: Persistent filters and team selection