# Cycle Review Feature Design Document

## Overview

The Cycle Review feature will provide teams with an informative breakdown of work completed in past Linear cycles. This tool will aggregate data from Linear (issues) and GitHub (pull requests) to create a comprehensive summary suitable for retrospectives, stakeholder updates, and team newsletters.

## User Stories

1. **As a team lead**, I want to review all work completed in a specific past cycle so I can prepare status updates for stakeholders.
2. **As a product manager**, I want to see which features were delivered and their associated technical changes to understand the cycle's output.
3. **As an engineer**, I want to see a summary of my contributions including issues completed and PRs merged during a cycle.
4. **As a team member**, I want to export cycle summaries for inclusion in newsletters or documentation.

## Feature Requirements

### Core Functionality

1. **Cycle Selection**
   - Dropdown or date picker to select any past completed cycle
   - Display cycle name, start date, end date, and duration
   - Show only completed cycles (not current or future)
   - Default to most recently completed cycle

2. **Data Aggregation**
   - Fetch all issues that were completed during the selected cycle
   - Match Linear issues to GitHub pull requests via:
     - Issue key references in PR titles/descriptions (e.g., "DDX-123")
     - Branch names containing issue keys
     - Commit messages referencing issues
   - Group related issues and PRs together

3. **Summary Views**
   - **Overview Stats**
     - Total issues completed
     - Total story points delivered
     - Number of PRs merged
   
   - **Newsletter View**
     - Digestible overview organized by project
     - Projects sorted by total points (descending)
     - Hyperlinked Linear IDs with issue titles and assignees
     - Copy-to-clipboard functionality for email newsletters
     - Plain text format preview for easy copying
   
   - **By Project Breakdown**
     - Issues and points completed per Linear project
     - Full project list always displayed (no truncation)
     - Key features/epics delivered
     - Associated technical changes (PRs)
   
   - **By Engineer Breakdown**
     - Individual contributor stats
     - Issues completed per person
     - PRs merged per person
     - Story points delivered per person
   
   - **By Issue Type** (if available)
     - Features vs bugs vs tasks
     - Distribution of work types

4. **Issue Details**
   - Issue title and description with hyperlinks to Linear issues
   - Story points
   - Assignee
   - Labels/tags
   - Sortable table with columns: Issue, Project, Assignee, Points
   - All issue identifiers hyperlinked to their Linear URLs
   - Linked pull requests with:
     - PR title
     - Files changed count
     - Lines added/removed
     - Merge date

5. **Export Options**
   - Markdown export for documentation
   - HTML email template for newsletters
   - CSV export for further analysis
   - Copy to clipboard functionality

### UI/UX Design

1. **Page Layout**
   ```
   +----------------------------------+
   |  Cycle Review                    |
   |  [Cycle Selector v] [Export ▼]  |
   +----------------------------------+
   |  Overview Cards                  |
   |  [Issues] [Points] [Projects]    |
   +----------------------------------+
   |  Tab Navigation                  |
   |  [Summary | Newsletter View]    |
   +----------------------------------+
   |  Content Area                    |
   |  - Summary: Sortable Issues Table|
   |  - Newsletter: Project-grouped   |
   |    issues with copy-to-clipboard |
   |  - Hyperlinked Issue IDs         |
   +----------------------------------+
   ```

2. **Visual Elements**
   - Cards for high-level metrics (Issues, Points, Projects)
   - Sortable table for completed issues with proper alignment
   - Hyperlinked issue identifiers that open in Linear
   - Full project lists without truncation
   - Progress bars for project/person contributions
   - Timeline visualization for issue completion over cycle
   - Color coding by project (matching Linear colors)
   - Cycle display by number (e.g., "Cycle 77") not "Unnamed Cycle"

3. **Interactive Features**
   - Click on metrics to drill down
   - Sort issues table by any column header (Issue, Project, Assignee, Points)
   - Hyperlinked issue IDs that open Linear issues in new tabs
   - Expand/collapse detailed sections
   - Filter by project or assignee within views

## Technical Architecture

### Data Flow

1. **Frontend Components**
   ```
   CycleReviewPage
   ├── CycleSelector
   ├── ExportMenu
   ├── OverviewCards
   ├── TabNavigation
   └── ContentPanels
       ├── SummaryPanel
       ├── ProjectBreakdownPanel
       ├── EngineerBreakdownPanel
       └── TimelinePanel
   ```

2. **API Endpoints**
   ```
   GET /api/completed-cycles
   GET /api/cycle-review/:cycleId
   GET /api/cycle-review/:cycleId/github-data
   POST /api/cycle-review/:cycleId/export
   ```

3. **Data Models**
   ```typescript
   interface CycleReview {
     cycle: {
       id: string;
       name: string;
       startedAt: Date;
       completedAt: Date;
     };
     stats: {
       totalIssues: number;
       totalPoints: number;
       totalPRs: number;
       uniqueContributors: number;
       velocity: number;
     };
     issues: CompletedIssue[];
     pullRequests: LinkedPullRequest[];
   }

   interface CompletedIssue {
     id: string;
     identifier: string;
     title: string;
     description: string;
     estimate: number;
     assignee: User;
     project: Project;
     labels: Label[];
     completedAt: Date;
     linkedPRs: string[]; // PR ids
   }

   interface LinkedPullRequest {
     id: string;
     number: number;
     title: string;
     url: string;
     author: string;
     mergedAt: Date;
     additions: number;
     deletions: number;
     filesChanged: number;
     linkedIssues: string[]; // Issue ids
   }
   ```

### Implementation Steps

#### Phase 1: Backend Foundation
1. Create cycle fetching endpoint
   - Query Linear for completed cycles
   - Sort by completion date
   - Return cycle metadata

2. Create cycle review data endpoint
   - Fetch all issues completed in cycle
   - Include issue details and metadata
   - Calculate aggregate statistics

3. Implement GitHub integration (see detailed plan below)
   - Query Linear API for issue attachments
   - Use GitHub CLI for PR matching fallback
   - Store PR metadata

#### Phase 2: Frontend Structure
1. Create new route `/cycle-review`
2. Build CycleReviewPage component
3. Implement cycle selector dropdown
4. Create overview cards with stats

#### Phase 3: Detail Views
1. Build summary view with grouped data
2. Create project breakdown with charts
3. Add engineer breakdown with tables
4. Implement timeline visualization

#### Phase 4: GitHub Integration
1. Implement Linear attachments query
2. Add GitHub CLI fallback matching
3. Display linked PR information
4. Add PR stats to summaries

#### Phase 5: Export Functionality
1. Create markdown generator
2. Build HTML email template
3. Implement CSV export
4. Add copy-to-clipboard

#### Phase 6: Polish & Optimization
1. Add loading states
2. Implement error handling
3. Cache cycle data
4. Add refresh functionality
5. Performance optimization

### API Design Details

#### GET /api/completed-cycles
Returns list of completed cycles for selection
```json
{
  "cycles": [
    {
      "id": "cycle-id",
      "name": "Sprint 23",
      "number": 23,
      "startedAt": "2024-01-01T00:00:00Z",
      "completedAt": "2024-01-14T00:00:00Z"
    }
  ]
}
```

#### GET /api/cycle-review/:cycleId
Returns comprehensive cycle review data
```json
{
  "cycle": { ... },
  "stats": {
    "totalIssues": 42,
    "totalPoints": 76,
    "totalPRs": 38,
    "uniqueContributors": 8,
    "velocity": 38
  },
  "issuesByProject": { ... },
  "issuesByEngineer": { ... },
  "completedIssues": [ ... ]
}
```

#### GET /api/cycle-review/:cycleId/github-data
Returns GitHub PR data linked to cycle issues
```json
{
  "pullRequests": [
    {
      "id": "pr-123",
      "number": 123,
      "title": "Fix: Authentication bug (DDX-456)",
      "linkedIssues": ["DDX-456"],
      "author": "engineer-name",
      "mergedAt": "2024-01-10T00:00:00Z",
      "stats": {
        "additions": 150,
        "deletions": 30,
        "filesChanged": 5
      }
    }
  ]
}
```

### GitHub Integration Strategy

Based on the Linear API documentation, there are two approaches to linking GitHub pull requests with Linear issues:

#### Approach 1: Linear Attachments API (Primary)

Linear automatically creates attachments for GitHub pull requests when they are linked to issues. This happens when:
- PR descriptions contain Linear issue references (e.g., "Fixes DDX-123", "Closes ENG-456")
- Branch names include issue identifiers
- Commit messages reference Linear issues

**Implementation Plan:**

1. **Query Linear Attachments**
   ```graphql
   query GetIssueAttachments($issueId: String!) {
     issue(id: $issueId) {
       attachments(first: 10) {
         nodes {
           id
           title
           url
           createdAt
           creator {
             name
           }
           metadata
         }
       }
     }
   }
   ```

2. **Filter GitHub Attachments**
   - Filter attachments by URL pattern (github.com/org/repo/pull/)
   - Extract PR number from URL
   - Parse attachment metadata for PR details

3. **Enrich PR Data**
   - Use GitHub API to fetch additional PR metadata
   - Get merge date, file changes, lines added/removed
   - Store author, reviewers, and status information

#### Approach 2: GitHub CLI Search (Fallback)

For issues that don't have Linear attachments (due to missing references or manual linking), implement a fallback search using GitHub CLI:

**Implementation Plan:**

1. **Search Strategy**
   ```bash
   # Search PR titles and descriptions for Linear issue IDs
   gh pr list --state merged --search "DDX-123 in:title,body"
   
   # Search by date range to limit scope
   gh pr list --state merged --search "merged:2024-01-01..2024-01-14"
   
   # Search branch names for issue patterns
   gh pr list --state merged --search "head:DDX-123"
   ```

2. **Pattern Matching**
   - Search for issue identifiers in PR titles: `/(DDX|ENG|PROJ)-\d+/g`
   - Search PR body text for "Fixes", "Closes", "Resolves" + issue ID
   - Check branch names for issue patterns
   - Parse commit messages in PR for issue references

3. **Data Collection**
   ```typescript
   interface GitHubPRSearch {
     searchByIssueId(issueId: string): Promise<PullRequest[]>;
     searchByDateRange(start: Date, end: Date): Promise<PullRequest[]>;
     searchByBranchPattern(pattern: string): Promise<PullRequest[]>;
   }
   ```

#### Hybrid Implementation

**Primary Flow:**
1. For each completed issue in cycle, query Linear attachments API
2. Filter for GitHub PR attachments
3. Extract PR URLs and basic metadata

**Fallback Flow:**
1. For issues without GitHub attachments, search GitHub CLI
2. Use multiple search patterns (title, body, branch, commits)
3. Confidence scoring for matched PRs
4. Manual verification flags for uncertain matches

**Code Structure:**
```typescript
class GitHubIntegrationService {
  async getLinkedPRs(issue: LinearIssue): Promise<LinkedPullRequest[]> {
    // Primary: Linear attachments
    const attachments = await this.getLinearAttachments(issue.id);
    const attachedPRs = this.extractGitHubPRs(attachments);
    
    if (attachedPRs.length > 0) {
      return await this.enrichPRData(attachedPRs);
    }
    
    // Fallback: GitHub CLI search
    const searchedPRs = await this.searchGitHubPRs(issue);
    return await this.enrichPRData(searchedPRs);
  }
  
  private async searchGitHubPRs(issue: LinearIssue): Promise<PullRequest[]> {
    const patterns = [
      `${issue.identifier} in:title`,
      `${issue.identifier} in:body`,
      `head:${issue.identifier}`,
      `"Fixes ${issue.identifier}"`,
      `"Closes ${issue.identifier}"`
    ];
    
    const results = [];
    for (const pattern of patterns) {
      const prs = await this.githubCLI.searchPRs(pattern);
      results.push(...prs);
    }
    
    return this.deduplicateAndScore(results, issue);
  }
}
```

#### Data Synchronization

**Caching Strategy:**
- Cache Linear attachment data (refreshed when issues update)
- Cache GitHub PR metadata (refreshed daily for active repos)
- Store confidence scores for CLI-matched PRs

**Update Triggers:**
- Manual refresh button for recent cycles
- Webhook support for real-time Linear attachment updates
- Scheduled background refresh for GitHub data

#### Error Handling

**Common Issues:**
- Rate limiting from GitHub API
- Missing permissions for private repositories
- Ambiguous issue ID matches (multiple PRs referencing same issue)
- False positives from CLI search

**Mitigation:**
- Exponential backoff for API rate limits
- Clear error messages for permission issues
- Confidence scoring and manual review flags
- User feedback mechanism for incorrect matches

### Configuration Requirements

1. **Environment Variables**
   ```
   GITHUB_TOKEN=<personal-access-token>
   GITHUB_ORG=<organization-name>
   GITHUB_REPOS=<comma-separated-repo-names>
   ```

2. **Permissions**
   - Linear: Read access to issues and cycles
   - GitHub: Read access to pull requests

### Future Enhancements

1. **Automated Summaries**
   - AI-generated cycle summaries
   - Key accomplishment extraction
   - Trend analysis across cycles

2. **Integrations**
   - Slack notifications for cycle completion
   - Automated email reports
   - JIRA integration for mixed teams

3. **Advanced Analytics**
   - Velocity trends over time
   - Predictive cycle planning
   - Team performance metrics
   - Burndown/burnup charts

4. **Customization**
   - Custom report templates
   - Configurable metrics
   - Team-specific views

### Security Considerations

1. **Data Access**
   - Respect Linear workspace permissions
   - Filter data based on user access
   - Sanitize GitHub data

2. **API Security**
   - Rate limiting for API endpoints
   - Authentication required
   - Audit logging for exports

### Performance Considerations

1. **Caching Strategy**
   - Cache completed cycle data (immutable)
   - Refresh GitHub data periodically
   - Use React Query for frontend caching

2. **Data Optimization**
   - Paginate large issue lists
   - Lazy load detailed information
   - Batch API requests

### Testing Strategy

1. **Unit Tests**
   - Data transformation functions
   - Statistics calculations
   - Export formatters

2. **Integration Tests**
   - API endpoint responses
   - Linear/GitHub API mocking
   - End-to-end data flow

3. **UI Tests**
   - Component rendering
   - User interactions
   - Export functionality

## Success Metrics

1. **Adoption**
   - Number of cycle reviews generated
   - Export usage statistics
   - Active users per week

2. **Performance**
   - Page load time < 2 seconds
   - Export generation < 5 seconds
   - API response time < 500ms

3. **User Satisfaction**
   - Time saved preparing summaries
   - Accuracy of issue-PR matching
   - Usefulness of generated reports

## Open Questions

1. Should we include incomplete issues that were worked on during the cycle?
2. How should we handle issues that span multiple cycles?
3. What level of detail should be included in the default summary view?
4. Should we support custom date ranges beyond Linear cycles?
5. How should we handle private repositories or issues with limited visibility?

## Phase 7: AI-Powered Summary Generation

### Overview

Enhance the Newsletter view with intelligent summary generation to create comprehensive, human-readable summaries of cycle work. This feature will analyze Linear issue descriptions and GitHub PR details to generate narrative summaries highlighting key contributions and project outcomes.

### Feature Requirements

#### Cycle-Level Summary
- **Automated Narrative**: Generate a comprehensive paragraph summarizing the cycle's overall achievements
- **Key Metrics Integration**: Weave statistics (issues completed, story points, PRs merged) into natural language
- **Theme Identification**: Identify major themes or focus areas across projects (e.g., "performance optimization", "bug fixes", "new features")
- **Contributor Highlights**: Recognize engineers who made significant contributions across multiple projects

#### Project-Level Summaries
- **Project Narrative**: Generate 2-3 sentence summaries for each project's work
- **Technical Context**: Incorporate details from PR descriptions to explain what was actually built
- **Engineer Contributions**: Highlight individual engineers who did substantial work within each project
- **Impact Assessment**: Derive business impact from issue descriptions and outcomes

#### Engineer Recognition
- **Contribution Scoring**: Algorithm to identify engineers who contributed significantly to projects
- **Cross-Project Recognition**: Highlight engineers who worked across multiple projects
- **Specialization Detection**: Identify engineers with domain expertise (frontend, backend, infrastructure)
- **Collaboration Patterns**: Recognize pair programming or mentoring based on PR review patterns

### Technical Architecture

#### Data Sources and Processing

**1. Linear Issue Analysis**
```typescript
interface IssueAnalysis {
  issueId: string
  title: string
  description: string
  businessContext: string    // Extracted from description
  technicalScope: string     // Derived from labels/estimates
  impactKeywords: string[]   // Performance, security, user experience, etc.
}
```

**2. GitHub PR Analysis**
```typescript
interface PRAnalysis {
  prId: string
  title: string
  description: string
  technicalSummary: string   // What was actually implemented
  codeChanges: {
    filesChanged: number
    additions: number
    deletions: number
    complexity: 'low' | 'medium' | 'high'
  }
  reviewContext: string      // Insights from review comments
}
```

**3. Engineer Contribution Scoring**
```typescript
interface ContributionScore {
  engineerId: string
  name: string
  projectContributions: {
    projectId: string
    score: number             // Based on points, PR complexity, reviews
    roleType: 'lead' | 'contributor' | 'reviewer'
    specializations: string[] // Frontend, backend, infrastructure, etc.
  }[]
  crossProjectImpact: number
  mentorshipScore: number     // Based on code reviews given
}
```

#### AI Integration Strategy

**Approach 1: Local Processing (Recommended)**
- Use local LLM (e.g., Ollama with Llama 2/3) for privacy and cost control
- Implement prompt engineering for consistent, structured outputs
- Process descriptions locally to avoid sending sensitive data to external APIs

**Approach 2: External API Integration**
- OpenAI GPT-4 or Claude API for higher quality summaries
- Implement data sanitization to remove sensitive information
- Cost management with request batching and caching

**Prompt Engineering Framework**
```typescript
interface SummaryPrompts {
  cycleOverview: {
    systemPrompt: string
    template: string
    variables: ['cycleStats', 'projectSummaries', 'topContributors']
  }
  projectSummary: {
    systemPrompt: string
    template: string
    variables: ['projectName', 'issues', 'prs', 'engineers', 'businessContext']
  }
  engineerHighlight: {
    systemPrompt: string
    template: string
    variables: ['engineerName', 'contributions', 'technicalImpact', 'collaboration']
  }
}
```

### Implementation Phases

#### Phase 7a: Data Analysis Infrastructure
1. **Content Extraction Service**
   - Parse Linear issue descriptions for business context and technical requirements
   - Extract meaningful information from PR descriptions and commit messages
   - Identify keywords and themes using text analysis

2. **Contribution Analysis Engine**
   - Calculate engineer contribution scores based on multiple factors:
     - Story points completed
     - PR complexity (file changes, lines modified)
     - Code review participation
     - Cross-project involvement
   - Weight contributions by project importance (story point allocation)

3. **Context Aggregation**
   - Combine issue and PR data into coherent project narratives
   - Identify technical achievements and business outcomes
   - Map engineer activities to project goals

#### Phase 7b: AI Summary Generation
1. **Local LLM Integration**
   - Set up Ollama or similar local LLM solution
   - Implement prompt templates for different summary types
   - Create feedback loop for prompt optimization

2. **Summary Generation Service**
   ```typescript
   class SummaryGenerationService {
     async generateCycleSummary(cycleData: CycleAnalysis): Promise<CycleSummary>
     async generateProjectSummary(projectData: ProjectAnalysis): Promise<ProjectSummary>
     async generateEngineerHighlights(contributions: ContributionScore[]): Promise<EngineerHighlight[]>
   }
   ```

3. **Output Formatting**
   - Generate markdown-formatted summaries
   - Create HTML email templates with rich formatting
   - Provide plain text versions for copy-paste

#### Phase 7c: Newsletter View Enhancement
1. **Summary Display Components**
   - Expandable cycle overview section
   - Project summary cards with engineer highlights
   - Contributor spotlight section

2. **Manual Override Capabilities**
   - Allow manual editing of generated summaries
   - Save custom templates for future cycles
   - Version control for summary drafts

3. **Export Enhancements**
   - Enhanced newsletter templates with AI summaries
   - Multiple output formats (markdown, HTML, plain text)
   - Customizable summary length and detail level

### Data Models

#### Summary Data Structures
```typescript
interface CycleSummary {
  id: string
  cycleId: string
  overview: string              // 2-3 paragraph cycle summary
  keyAchievements: string[]     // Bullet points of major wins
  metrics: {
    totalIssues: number
    totalPoints: number
    totalPRs: number
    participatingEngineers: number
  }
  themes: string[]             // Major focus areas identified
  generatedAt: Date
  isManuallyEdited: boolean
}

interface ProjectSummary {
  id: string
  projectName: string
  overview: string             // 2-3 sentence project summary
  technicalHighlights: string // What was actually built
  businessImpact: string       // Why it matters
  keyContributors: {
    engineerId: string
    name: string
    role: string              // Lead, contributor, reviewer
    highlight: string         // Specific contribution
  }[]
  metrics: {
    issuesCompleted: number
    pointsDelivered: number
    prsSubmitted: number
  }
}

interface EngineerHighlight {
  engineerId: string
  name: string
  overallContribution: string  // Narrative of their cycle impact
  projectRoles: {
    projectName: string
    role: 'lead' | 'contributor' | 'reviewer'
    impact: string
  }[]
  specializations: string[]    // Technical areas of focus
  collaborationScore: number   // How much they helped others
}
```

### API Endpoints

```typescript
// Generate summaries for a cycle
POST /api/cycle-review/:cycleId/generate-summaries
{
  includeProjectSummaries: boolean
  includeEngineerHighlights: boolean
  summaryLength: 'brief' | 'detailed' | 'comprehensive'
}

// Get generated summaries
GET /api/cycle-review/:cycleId/summaries

// Update manual edits
PATCH /api/cycle-review/:cycleId/summaries/:summaryId
{
  content: string
  isManuallyEdited: true
}

// Export enhanced newsletter
GET /api/cycle-review/:cycleId/export/newsletter
?format=markdown|html|text&includeSummaries=true
```

### Configuration Options

#### Summary Generation Settings
```typescript
interface SummaryConfig {
  ai: {
    provider: 'local' | 'openai' | 'claude'
    model: string
    maxTokens: number
    temperature: number
  }
  content: {
    cycleOverviewLength: 'brief' | 'detailed'
    projectSummaryLength: 'brief' | 'detailed'
    includeEngineerHighlights: boolean
    highlightThreshold: number    // Minimum contribution score for highlights
  }
  privacy: {
    sanitizeIssueDescriptions: boolean
    excludePrivateRepos: boolean
    redactSensitiveKeywords: string[]
  }
}
```

### Privacy and Security Considerations

1. **Data Handling**
   - Option to process data locally vs. external API
   - Sanitization of sensitive information before AI processing
   - Audit trail of what data was sent to external services

2. **Content Filtering**
   - Configurable keyword filtering for sensitive information
   - Option to exclude private repository data
   - Manual review process before final summary generation

3. **Access Control**
   - Role-based access to summary generation features
   - Approval workflow for public newsletter distribution
   - Version control and change tracking for summaries

### Success Metrics

1. **Adoption and Usage**
   - Percentage of cycles with generated summaries
   - User satisfaction with summary quality
   - Time saved in newsletter preparation

2. **Content Quality**
   - Manual edit frequency (lower is better)
   - Accuracy of engineer contribution recognition
   - Relevance of identified themes and highlights

3. **Business Impact**
   - Increased stakeholder engagement with cycle summaries
   - Improved team recognition and morale
   - Enhanced documentation of engineering achievements

### Future Enhancements

1. **Advanced AI Features**
   - Trend analysis across multiple cycles
   - Predictive insights for team capacity and project success
   - Automated identification of technical debt and improvements

2. **Integration Expansions**
   - Slack/Teams integration for automatic summary posting
   - Calendar integration for milestone and deadline context
   - Customer feedback integration for impact validation

3. **Personalization**
   - Manager-specific views highlighting their team's contributions
   - Engineer-specific achievement summaries for performance reviews
   - Stakeholder-specific summaries focusing on business impact

This AI-powered summary generation will transform the cycle review from a manual reporting task into an intelligent, comprehensive narrative of engineering achievements, making it easier for teams to communicate their impact and for stakeholders to understand the value delivered.