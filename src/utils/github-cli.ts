import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitHubPR {
  number: number;
  title: string;
  url: string;
  author: {
    login: string;
  };
  mergedAt: string | null;
  additions: number;
  deletions: number;
  files: any[];
  body: string;
  headRefName: string;
}

export class GitHubCLI {
  private token: string | undefined;

  constructor() {
    this.token = process.env.GITHUB_TOKEN;
  }

  private async runGHCommand(command: string): Promise<string> {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    try {
      const { stdout } = await execAsync(command, {
        env: { ...process.env, GH_TOKEN: this.token }
      });
      return stdout.trim();
    } catch (error: any) {
      console.error(`GitHub CLI error: ${error.message}`);
      throw error;
    }
  }

  async searchPRsByPattern(pattern: string, repo?: string): Promise<GitHubPR[]> {
    const repoFlag = repo ? `--repo ${repo}` : '';
    const command = `gh pr list --state merged --search "${pattern}" ${repoFlag} --json number,title,url,author,mergedAt,additions,deletions,files,body,headRefName --limit 100`;
    
    try {
      const output = await this.runGHCommand(command);
      if (!output) return [];
      
      return JSON.parse(output) as GitHubPR[];
    } catch (error) {
      console.error(`Failed to search PRs with pattern "${pattern}":`, error);
      return [];
    }
  }

  async searchPRsForIssue(issueIdentifier: string, repos: string[] = []): Promise<GitHubPR[]> {
    const searchPatterns = [
      `"${issueIdentifier}" in:title`,
      `"${issueIdentifier}" in:body`, 
      `"Fixes ${issueIdentifier}"`,
      `"Closes ${issueIdentifier}"`,
      `"Resolves ${issueIdentifier}"`,
      `head:${issueIdentifier}`
    ];

    const allPRs: GitHubPR[] = [];
    const searchedPRIds = new Set<string>();

    for (const pattern of searchPatterns) {
      if (repos.length > 0) {
        // Search specific repos
        for (const repo of repos) {
          const prs = await this.searchPRsByPattern(pattern, repo);
          for (const pr of prs) {
            const prId = `${repo}#${pr.number}`;
            if (!searchedPRIds.has(prId)) {
              searchedPRIds.add(prId);
              allPRs.push(pr);
            }
          }
        }
      } else {
        // Search all repos the user has access to
        const prs = await this.searchPRsByPattern(pattern);
        for (const pr of prs) {
          const prId = `${pr.url}`;
          if (!searchedPRIds.has(prId)) {
            searchedPRIds.add(prId);
            allPRs.push(pr);
          }
        }
      }
    }

    return allPRs;
  }

  async getPRDetails(prNumber: number, repo: string): Promise<GitHubPR | null> {
    const command = `gh pr view ${prNumber} --repo ${repo} --json number,title,url,author,mergedAt,additions,deletions,files,body,headRefName`;
    
    try {
      const output = await this.runGHCommand(command);
      if (!output) return null;
      
      return JSON.parse(output) as GitHubPR;
    } catch (error) {
      console.error(`Failed to get PR details for ${repo}#${prNumber}:`, error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!this.token;
  }
}