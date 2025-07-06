import { LinearClient } from '../linear-client.js';
import { GitHubCLI } from '../utils/github-cli.js';

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  url: string;
  author: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  filesChanged: number;
  linkedIssues: string[];
  confidence: number;
}

export interface LinearAttachment {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  creator: {
    id: string;
    name: string;
  };
  metadata: any;
}

export interface IssueWithPRs {
  issueId: string;
  issueIdentifier: string;
  pullRequests: GitHubPullRequest[];
}

export class GitHubIntegrationService {
  private linearClient: LinearClient;
  private githubCLI: GitHubCLI;
  private githubRepos: string[];

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
    this.githubCLI = new GitHubCLI();
    this.githubRepos = process.env.GITHUB_REPOS?.split(',').map(r => r.trim()) || [];
  }

  async getLinkedPRsForIssue(issueId: string, issueIdentifier: string): Promise<GitHubPullRequest[]> {
    // Primary: Try Linear attachments first
    const attachments = await this.linearClient.getIssueAttachments(issueId);
    const attachedPRs = this.extractGitHubPRsFromAttachments(attachments, issueIdentifier);
    
    if (attachedPRs.length > 0) {
      return attachedPRs;
    }
    
    // Fallback: Use GitHub CLI search
    return this.searchGitHubPRsByPattern(issueIdentifier);
  }

  async getLinkedPRsForIssues(issues: Array<{ id: string; identifier: string }>): Promise<Map<string, GitHubPullRequest[]>> {
    const issueIds = issues.map(i => i.id);
    const attachmentsMap = await this.linearClient.getIssuesWithAttachments(issueIds);
    
    const prMap = new Map<string, GitHubPullRequest[]>();
    
    // Process attachments for all issues
    for (const issue of issues) {
      const attachments = attachmentsMap.get(issue.id) || [];
      const attachedPRs = this.extractGitHubPRsFromAttachments(attachments, issue.identifier);
      
      if (attachedPRs.length > 0) {
        prMap.set(issue.id, attachedPRs);
      } else {
        // Fallback to GitHub CLI search for issues without attachments
        const searchedPRs = await this.searchGitHubPRsByPattern(issue.identifier);
        if (searchedPRs.length > 0) {
          prMap.set(issue.id, searchedPRs);
        }
      }
    }
    
    return prMap;
  }

  private extractGitHubPRsFromAttachments(attachments: LinearAttachment[], issueIdentifier: string): GitHubPullRequest[] {
    const githubPRs: GitHubPullRequest[] = [];
    
    for (const attachment of attachments) {
      // Check if this is a GitHub PR URL
      const prMatch = attachment.url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (prMatch) {
        const [, org, repo, prNumber] = prMatch;
        
        // Check if this repo is in our configured list
        if (this.githubRepos.length === 0 || this.githubRepos.includes(`${org}/${repo}`)) {
          githubPRs.push({
            id: `${org}/${repo}#${prNumber}`,
            number: parseInt(prNumber, 10),
            title: attachment.title,
            url: attachment.url,
            author: attachment.creator?.name || 'Unknown',
            mergedAt: attachment.createdAt,
            additions: 0, // Will be enriched later
            deletions: 0,
            filesChanged: 0,
            linkedIssues: [issueIdentifier],
            confidence: 1.0 // 100% confidence for Linear attachments
          });
        }
      }
    }
    
    return githubPRs;
  }

  private async searchGitHubPRsByPattern(issueIdentifier: string): Promise<GitHubPullRequest[]> {
    if (!this.githubCLI.isConfigured()) {
      console.warn('GITHUB_TOKEN not set, skipping GitHub CLI search');
      return [];
    }

    const prs = await this.githubCLI.searchPRsForIssue(issueIdentifier, this.githubRepos);
    const allPRs: GitHubPullRequest[] = [];

    for (const pr of prs) {
      // Extract repo from URL
      const urlMatch = pr.url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
      if (urlMatch) {
        const [, org, repo] = urlMatch;
        
        // Check if this repo is in our configured list (if any)
        if (this.githubRepos.length === 0 || this.githubRepos.includes(`${org}/${repo}`)) {
          allPRs.push({
            id: `${org}/${repo}#${pr.number}`,
            number: pr.number,
            title: pr.title,
            url: pr.url,
            author: pr.author?.login || 'Unknown',
            mergedAt: pr.mergedAt,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            filesChanged: pr.files?.length || 0,
            linkedIssues: [issueIdentifier],
            confidence: this.calculateConfidence(pr, issueIdentifier)
          });
        }
      }
    }

    // Deduplicate PRs by ID and return highest confidence matches
    const deduplicatedPRs = this.deduplicateAndScore(allPRs);
    return deduplicatedPRs;
  }

  private calculateConfidence(pr: any, issueIdentifier: string): number {
    let confidence = 0.5; // Base confidence for CLI search

    // Higher confidence if issue ID is in title
    if (pr.title && pr.title.includes(issueIdentifier)) {
      confidence += 0.3;
    }

    // Higher confidence if issue ID is in body with fix/close/resolve patterns
    if (pr.body) {
      const body = pr.body.toLowerCase();
      const issueIdLower = issueIdentifier.toLowerCase();
      
      if (body.includes(`fixes ${issueIdLower}`) || 
          body.includes(`closes ${issueIdLower}`) || 
          body.includes(`resolves ${issueIdLower}`)) {
        confidence += 0.2;
      } else if (body.includes(issueIdLower)) {
        confidence += 0.1;
      }
    }

    // Higher confidence if branch name contains issue ID
    if (pr.headRefName && pr.headRefName.includes(issueIdentifier)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95); // Cap at 95% for CLI searches
  }

  private deduplicateAndScore(prs: GitHubPullRequest[]): GitHubPullRequest[] {
    const prMap = new Map<string, GitHubPullRequest>();

    for (const pr of prs) {
      const existing = prMap.get(pr.id);
      if (!existing || pr.confidence > existing.confidence) {
        prMap.set(pr.id, pr);
      }
    }

    return Array.from(prMap.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  async enrichPRData(prs: GitHubPullRequest[]): Promise<GitHubPullRequest[]> {
    if (!this.githubCLI.isConfigured() || prs.length === 0) {
      return prs;
    }

    // If we already have full data (from GitHub CLI), return as is
    if (prs.every(pr => pr.additions > 0 || pr.deletions > 0)) {
      return prs;
    }

    // Otherwise, fetch additional data for each PR
    const enrichedPRs: GitHubPullRequest[] = [];

    for (const pr of prs) {
      try {
        const repoMatch = pr.url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
        if (repoMatch) {
          const [, org, repo, prNumber] = repoMatch;
          
          const prDetails = await this.githubCLI.getPRDetails(parseInt(prNumber), `${org}/${repo}`);
          
          if (prDetails) {
            enrichedPRs.push({
              ...pr,
              additions: prDetails.additions || pr.additions,
              deletions: prDetails.deletions || pr.deletions,
              filesChanged: prDetails.files?.length || pr.filesChanged
            });
          } else {
            enrichedPRs.push(pr);
          }
        } else {
          enrichedPRs.push(pr);
        }
      } catch (error) {
        console.error(`Error enriching PR data for ${pr.id}:`, error);
        enrichedPRs.push(pr);
      }
    }

    return enrichedPRs;
  }
}