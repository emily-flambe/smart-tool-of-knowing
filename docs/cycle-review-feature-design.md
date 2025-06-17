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
     - Number of contributors
     - Cycle velocity (points/week)
   
   - **By Project Breakdown**
     - Issues and points completed per Linear project
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
   - Issue title and description (truncated)
   - Story points
   - Assignee
   - Labels/tags
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
   |  [Issues] [Points] [PRs] [Team] |
   +----------------------------------+
   |  Tab Navigation                  |
   |  [Summary | By Project | By      |
   |   Engineer | Timeline]           |
   +----------------------------------+
   |  Content Area                    |
   |  (Dynamic based on selected tab) |
   +----------------------------------+
   ```

2. **Visual Elements**
   - Cards for high-level metrics
   - Collapsible sections for detailed views
   - Progress bars for project/person contributions
   - Timeline visualization for issue completion over cycle
   - Color coding by project (matching Linear colors)

3. **Interactive Features**
   - Click on metrics to drill down
   - Expand/collapse detailed sections
   - Sort tables by different columns
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

3. Implement GitHub integration
   - Search PRs by date range of cycle
   - Match PRs to Linear issues via regex
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
1. Connect to GitHub API
2. Match PRs to issues
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