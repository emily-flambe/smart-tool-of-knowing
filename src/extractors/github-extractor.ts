import { DataExtractor, UnifiedContent, GitHubContent } from '../unified-types.js';
import axios from 'axios';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string;
  topics: string[];
  private: boolean;
  default_branch: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    html_url: string;
  } | null;
  html_url: string;
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  user: {
    login: string;
    html_url: string;
  };
  assignees: Array<{
    login: string;
    html_url: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: {
    login: string;
    html_url: string;
  };
  assignees: Array<{
    login: string;
    html_url: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export class GitHubExtractor implements DataExtractor {
  source = 'github' as const;
  private token: string;
  private baseUrl = 'https://api.github.com';
  private repositories: string[]; // Array of owner/repo strings

  constructor(token: string, repositories: string[] = []) {
    this.token = token;
    this.repositories = repositories;
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async extract(): Promise<UnifiedContent[]> {
    const content: UnifiedContent[] = [];

    try {
      // If no specific repositories are configured, get user's repositories
      let reposToProcess = this.repositories;
      if (reposToProcess.length === 0) {
        reposToProcess = await this.getUserRepositories();
      }

      for (const repoName of reposToProcess) {
        const [owner, repo] = repoName.split('/');
        
        // Extract repository info
        const repository = await this.getRepository(owner, repo);
        if (repository) {
          content.push(this.repositoryToUnifiedContent(repository));
        }

        // Extract recent commits (last 30 days)
        const commits = await this.getRecentCommits(owner, repo, 30);
        for (const commit of commits) {
          content.push(this.commitToUnifiedContent(commit, owner, repo));
        }

        // Extract recent pull requests
        const pullRequests = await this.getRecentPullRequests(owner, repo);
        for (const pr of pullRequests) {
          content.push(this.pullRequestToUnifiedContent(pr, owner, repo));
        }

        // Extract recent issues
        const issues = await this.getRecentIssues(owner, repo);
        for (const issue of issues) {
          content.push(this.issueToUnifiedContent(issue, owner, repo));
        }
      }

      return content;
    } catch (error) {
      throw new Error(`GitHub extraction failed: ${error}`);
    }
  }

  async incrementalSync(lastSyncTime: string): Promise<UnifiedContent[]> {
    // GitHub API supports filtering by updated since timestamp
    const content: UnifiedContent[] = [];

    try {
      let reposToProcess = this.repositories;
      if (reposToProcess.length === 0) {
        reposToProcess = await this.getUserRepositories();
      }

      for (const repoName of reposToProcess) {
        const [owner, repo] = repoName.split('/');
        
        // Get commits since last sync
        const commits = await this.getCommitsSince(owner, repo, lastSyncTime);
        for (const commit of commits) {
          content.push(this.commitToUnifiedContent(commit, owner, repo));
        }

        // Get pull requests updated since last sync
        const pullRequests = await this.getPullRequestsSince(owner, repo, lastSyncTime);
        for (const pr of pullRequests) {
          content.push(this.pullRequestToUnifiedContent(pr, owner, repo));
        }

        // Get issues updated since last sync
        const issues = await this.getIssuesSince(owner, repo, lastSyncTime);
        for (const issue of issues) {
          content.push(this.issueToUnifiedContent(issue, owner, repo));
        }
      }

      return content;
    } catch (error) {
      throw new Error(`GitHub incremental sync failed: ${error}`);
    }
  }

  private async apiCall<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      params
    });
    return response.data;
  }

  private async getUserRepositories(): Promise<string[]> {
    const repos = await this.apiCall<GitHubRepository[]>('/user/repos', {
      per_page: 100,
      sort: 'updated'
    });
    return repos.map(repo => repo.full_name);
  }

  private async getRepository(owner: string, repo: string): Promise<GitHubRepository | null> {
    try {
      return await this.apiCall<GitHubRepository>(`/repos/${owner}/${repo}`);
    } catch {
      return null;
    }
  }

  private async getRecentCommits(owner: string, repo: string, days: number): Promise<GitHubCommit[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    return await this.apiCall<GitHubCommit[]>(`/repos/${owner}/${repo}/commits`, {
      since: since.toISOString(),
      per_page: 100
    });
  }

  private async getCommitsSince(owner: string, repo: string, since: string): Promise<GitHubCommit[]> {
    return await this.apiCall<GitHubCommit[]>(`/repos/${owner}/${repo}/commits`, {
      since,
      per_page: 100
    });
  }

  async getRecentPullRequests(owner: string, repo: string): Promise<GitHubPullRequest[]> {
    return await this.apiCall<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls`, {
      state: 'all',
      sort: 'updated',
      per_page: 50
    });
  }

  private async getPullRequestsSince(owner: string, repo: string, since: string): Promise<GitHubPullRequest[]> {
    // GitHub doesn't support since parameter for PRs, so we'll fetch recent and filter
    const prs = await this.getRecentPullRequests(owner, repo);
    return prs.filter(pr => new Date(pr.updated_at) >= new Date(since));
  }

  private async getRecentIssues(owner: string, repo: string): Promise<GitHubIssue[]> {
    return await this.apiCall<GitHubIssue[]>(`/repos/${owner}/${repo}/issues`, {
      state: 'all',
      sort: 'updated',
      per_page: 50
    });
  }

  private async getIssuesSince(owner: string, repo: string, since: string): Promise<GitHubIssue[]> {
    return await this.apiCall<GitHubIssue[]>(`/repos/${owner}/${repo}/issues`, {
      state: 'all',
      sort: 'updated',
      since,
      per_page: 50
    });
  }

  private repositoryToUnifiedContent(repo: GitHubRepository): GitHubContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      repo.name,
      repo.description || '',
      repo.language || '',
      repo.topics.join(' ')
    ].join(' ').toLowerCase();

    const keywords = [
      repo.name,
      repo.language || '',
      ...repo.topics
    ].filter(Boolean);

    return {
      metadata: {
        id: `github-repo-${repo.id}`,
        source: 'github',
        contentType: 'github-repository',
        title: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        extractedAt,
        sourceMetadata: {
          owner: repo.full_name.split('/')[0],
          repository: repo.name,
          branch: repo.default_branch
        }
      },
      content: repo.description || '',
      searchableText,
      keywords,
      structuredData: {
        language: repo.language,
        topics: repo.topics,
        private: repo.private,
        defaultBranch: repo.default_branch,
        lastPush: repo.pushed_at,
        githubSpecific: {
          repoId: repo.id,
          fullName: repo.full_name,
          isPrivate: repo.private
        }
      }
    };
  }

  private commitToUnifiedContent(commit: GitHubCommit, owner: string, repo: string): GitHubContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      commit.commit.message,
      commit.commit.author.name,
      commit.author?.login || ''
    ].join(' ').toLowerCase();

    const keywords = [
      commit.commit.author.name,
      commit.author?.login || ''
    ].filter(Boolean);

    return {
      metadata: {
        id: `github-commit-${commit.sha}`,
        source: 'github',
        contentType: 'github-commit',
        title: commit.commit.message.split('\n')[0], // First line as title
        description: commit.commit.message,
        url: commit.html_url,
        createdAt: commit.commit.author.date,
        updatedAt: commit.commit.author.date,
        extractedAt,
        sourceMetadata: {
          owner,
          repository: repo,
          sha: commit.sha
        }
      },
      content: commit.commit.message,
      searchableText,
      keywords,
      structuredData: {
        assignees: commit.author ? [{
          name: commit.author.login,
          email: commit.commit.author.email
        }] : [],
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email
        },
        githubSpecific: {
          sha: commit.sha,
          authorLogin: commit.author?.login,
          authorUrl: commit.author?.html_url
        }
      }
    };
  }

  private pullRequestToUnifiedContent(pr: GitHubPullRequest, owner: string, repo: string): GitHubContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      pr.title,
      pr.body || '',
      pr.user.login,
      pr.assignees.map(a => a.login).join(' '),
      pr.labels.map(l => l.name).join(' ')
    ].join(' ').toLowerCase();

    const keywords = [
      pr.user.login,
      ...pr.assignees.map(a => a.login),
      ...pr.labels.map(l => l.name),
      pr.state
    ].filter(Boolean);

    return {
      metadata: {
        id: `github-pr-${pr.id}`,
        source: 'github',
        contentType: 'github-pull-request',
        title: `#${pr.number}: ${pr.title}`,
        description: pr.body,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        extractedAt,
        sourceMetadata: {
          owner,
          repository: repo,
          number: pr.number,
          branch: pr.head.ref,
          baseBranch: pr.base.ref
        }
      },
      content: pr.body || '',
      searchableText,
      keywords,
      structuredData: {
        status: pr.state,
        state: pr.state,
        assignees: pr.assignees.map(a => ({
          name: a.login,
          email: '' // GitHub doesn't provide email in this context
        })),
        labels: pr.labels.map(l => ({
          name: l.name,
          color: l.color
        })),
        author: {
          name: pr.user.login,
          url: pr.user.html_url
        },
        closedAt: pr.closed_at,
        mergedAt: pr.merged_at,
        githubSpecific: {
          prNumber: pr.number,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
          isMerged: !!pr.merged_at
        }
      }
    };
  }

  private issueToUnifiedContent(issue: GitHubIssue, owner: string, repo: string): GitHubContent {
    const extractedAt = new Date().toISOString();
    
    const searchableText = [
      issue.title,
      issue.body || '',
      issue.user.login,
      issue.assignees.map(a => a.login).join(' '),
      issue.labels.map(l => l.name).join(' ')
    ].join(' ').toLowerCase();

    const keywords = [
      issue.user.login,
      ...issue.assignees.map(a => a.login),
      ...issue.labels.map(l => l.name),
      issue.state
    ].filter(Boolean);

    return {
      metadata: {
        id: `github-issue-${issue.id}`,
        source: 'github',
        contentType: 'github-issue',
        title: `#${issue.number}: ${issue.title}`,
        description: issue.body,
        url: issue.html_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        extractedAt,
        sourceMetadata: {
          owner,
          repository: repo,
          number: issue.number
        }
      },
      content: issue.body || '',
      searchableText,
      keywords,
      structuredData: {
        status: issue.state,
        state: issue.state,
        assignees: issue.assignees.map(a => ({
          name: a.login,
          email: '' // GitHub doesn't provide email in this context
        })),
        labels: issue.labels.map(l => ({
          name: l.name,
          color: l.color
        })),
        author: {
          name: issue.user.login,
          url: issue.user.html_url
        },
        closedAt: issue.closed_at,
        githubSpecific: {
          issueNumber: issue.number,
          isClosed: issue.state === 'closed'
        }
      }
    };
  }
}