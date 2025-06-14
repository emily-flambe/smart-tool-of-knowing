# Unified Data Layer Guide

## Overview

The unified data layer provides a single interface to search, sync, and analyze data across all your team's platforms: **Coda**, **Linear**, and **GitHub**. All data is stored locally in a SQLite database with a common schema, enabling powerful cross-source queries and insights.

## Quick Start

```bash
# 1. Check what sources are configured
team unified status

# 2. Sync data from all sources
team unified sync

# 3. Search across everything
team unified query --search "authentication"

# 4. Generate a weekly newsletter
team unified newsletter --start 2025-06-07 --end 2025-06-14
```

## Data Sources & Content Types

### Coda Integration
- **Source**: `coda`
- **Content Types**:
  - `coda-document` - Top-level Coda documents
  - `coda-page` - Individual pages within documents
  - `coda-canvas` - Canvas-type pages
  - `coda-table` - Table-type pages

**Data Extracted**:
- Page titles, content, and metadata
- Document hierarchy and relationships
- Creation and update timestamps
- Full markdown content with frontmatter

### Linear Integration
- **Source**: `linear`
- **Content Types**:
  - `linear-issue` - Individual issues/tickets
  - `linear-project` - Projects containing issues
  - `linear-cycle` - Sprint/development cycles
  - `linear-team` - Team definitions

**Data Extracted**:
- Issue details, descriptions, and status
- Assignees, labels, and priorities
- Project and cycle relationships
- Team structure and membership

### GitHub Integration
- **Source**: `github`
- **Content Types**:
  - `github-repository` - Repository information
  - `github-commit` - Individual commits
  - `github-pull-request` - Pull requests
  - `github-issue` - GitHub issues

**Data Extracted**:
- Repository metadata and topics
- Commit messages and authors
- PR/issue titles, descriptions, and labels
- Assignees and review status

## Commands Reference

### `team unified status`
Check the health and configuration of all data sources.

```bash
team unified status
```

**Output**:
- Connection status for each configured source
- Data statistics (total items per source)
- Configuration details

### `team unified sync`
Synchronize data from configured sources into the local database.

```bash
# Sync all sources
team unified sync

# Sync specific source only
team unified sync --source coda
team unified sync --source linear
team unified sync --source github

# Use incremental sync (only new/changed items)
team unified sync --incremental
```

**What it does**:
- Extracts data from each source using their APIs/files
- Stores everything in a unified SQLite database
- Tracks sync history and handles incremental updates
- Reports statistics on items processed/added/updated

### `team unified query`
Search and filter data across all sources with powerful options.

#### Basic Search
```bash
# Text search across all content
team unified query --search "deployment"

# Search specific sources
team unified query --search "auth" --sources coda,linear

# Search specific content types
team unified query --types linear-issue,github-pull-request
```

#### Advanced Filtering
```bash
# Filter by date range
team unified query --since 2025-06-01 --until 2025-06-14

# Combine filters
team unified query --search "database" --sources linear --since 2025-06-01

# Pagination
team unified query --limit 10 --search "api"
```

#### Output Formats
```bash
# Table format (default)
team unified query --format table

# JSON output
team unified query --format json --search "auth"

# Markdown format
team unified query --format markdown --limit 5
```

**Search Fields**:
- `title` - Item titles
- `content` - Full content/descriptions
- `searchable_text` - Optimized search text
- `metadata` - Source-specific metadata

### `team unified newsletter`
Generate comprehensive activity reports across all data sources.

#### Basic Newsletter
```bash
# Last week (default)
team unified newsletter

# Custom date range
team unified newsletter --start 2025-06-01 --end 2025-06-14

# Specific sources only
team unified newsletter --sources linear,github
```

#### Grouping Options
```bash
# Group by source (default)
team unified newsletter --group-by source

# Group by content type
team unified newsletter --group-by contentType

# Group by assignee
team unified newsletter --group-by assignee

# Group by project
team unified newsletter --group-by project
```

#### Output Options
```bash
# Markdown format (default)
team unified newsletter --format markdown

# Plain text
team unified newsletter --format text

# Save to file
team unified newsletter --output weekly-report.md
```

## Data Schema Reference

### Unified Content Structure
Every item in the database follows this common structure:

```typescript
interface UnifiedContent {
  metadata: {
    id: string              // Unique identifier
    source: DataSource      // 'coda' | 'linear' | 'github'
    contentType: ContentType // Specific type (e.g., 'linear-issue')
    title: string           // Display title
    description?: string    // Brief description
    url?: string           // Link to original item
    createdAt: string       // Creation timestamp
    updatedAt: string       // Last update timestamp
    extractedAt: string     // When we synced this item
    parentId?: string       // Related parent item
    sourceMetadata: object  // Source-specific data
  }
  content: string           // Full text content
  searchableText: string    // Optimized for search
  keywords: string[]        // Extracted keywords
  structuredData?: {        // Parsed structured data
    status?: string         // Current status
    assignees?: Array<{name: string, email?: string}>
    labels?: Array<{name: string, color?: string}>
    priority?: number | string
    // ... other structured fields
  }
}
```

### Source-Specific Metadata

#### Coda Items
```typescript
sourceMetadata: {
  docId: string           // Coda document ID
  docName: string         // Document name
  pageId: string          // Page ID
  isSubpage: boolean      // Whether it's a subpage
  parentPageId?: string   // Parent page if subpage
  parentPageName?: string // Parent page name
}
```

#### Linear Items
```typescript
sourceMetadata: {
  identifier?: string     // Issue identifier (e.g., "ENG-123")
  teamId?: string        // Team ID
  teamName?: string      // Team name
  teamKey?: string       // Team key
  projectId?: string     // Project ID
  cycleId?: string       // Cycle ID
}
```

#### GitHub Items
```typescript
sourceMetadata: {
  owner: string          // Repository owner
  repository: string     // Repository name
  number?: number        // PR/Issue number
  sha?: string          // Commit SHA
  branch?: string       // Branch name
  baseBranch?: string   // Base branch for PRs
}
```

## Configuration

### Setting Up Data Sources

#### Coda Configuration
```bash
# Set the data directory (where markdown files are stored)
team config set CODA_DATA_DIRECTORY ./data/coda

# The unified layer uses existing Coda markdown files
# Make sure you've extracted Coda data first:
team coda extract-all
```

#### Linear Configuration
```bash
# Set your Linear API token
team config set LINEAR_API_KEY your_token_here

# The unified layer will extract:
# - All teams and projects
# - Recent cycles (last 6 months)
# - Issues for each team
```

#### GitHub Configuration
```bash
# Set your GitHub token
team config set GITHUB_TOKEN your_token_here

# Optionally specify repositories to monitor
team config set GITHUB_REPOSITORIES "owner/repo1,owner/repo2"

# If no repositories specified, will use all accessible repos
```

### Database Location
The unified database is stored at `./data/unified.db` by default.

## Use Cases & Workflows

### 1. Daily Standup Preparation
```bash
# See what happened yesterday
team unified newsletter --start $(date -d yesterday +%Y-%m-%d) --end $(date +%Y-%m-%d)

# Check your assigned work
team unified query --search "assigned:$(whoami)" --sources linear
```

### 2. Sprint Planning
```bash
# Review completed work from last cycle
team unified query --types linear-issue --search "status:completed" --since 2025-06-01

# Find related documentation
team unified query --search "capacity planning" --sources coda
```

### 3. Cross-Platform Investigation
```bash
# Find everything related to authentication
team unified query --search "authentication OR auth OR login"

# See commits and issues for a specific feature
team unified query --search "user management" --types github-commit,linear-issue
```

### 4. Team Activity Reports
```bash
# Weekly team newsletter
team unified newsletter --group-by assignee --start 2025-06-07

# Project-focused report
team unified newsletter --group-by project --sources linear,github
```

### 5. Knowledge Discovery
```bash
# Find deployment-related information across all sources
team unified query --search "deployment OR deploy OR release"

# Search for specific error messages
team unified query --search "connection timeout" --sources github,linear
```

## Advanced Tips

### Incremental Syncing
- Use `--incremental` flag to only sync new/changed items
- Particularly useful for GitHub which can have many commits
- Linear and Coda extractors automatically detect changes

### Query Optimization
- Use specific `--sources` to limit search scope
- Combine `--types` with `--search` for precise results
- Use `--since` and `--until` for time-bounded searches

### Newsletter Customization
- Use `--group-by assignee` for team-focused reports
- Use `--group-by project` for project status updates
- Save newsletters with `--output` for regular distribution

### Data Relationships
- Items automatically link to related content (parent/child relationships)
- Linear issues link to their projects and cycles
- Coda pages link to their parent documents
- Use these relationships for comprehensive analysis

## Troubleshooting

### Sync Issues
```bash
# Check source connections
team unified status

# Try syncing individual sources
team unified sync --source coda
team unified sync --source linear

# Clear and rebuild database
rm ./data/unified.db
team unified sync
```

### Query Problems
```bash
# Check available data
team unified query --limit 5

# Verify specific sources have data
team unified query --sources coda --limit 1
team unified query --sources linear --limit 1
```

### Configuration Issues
```bash
# Check current configuration
team config show

# Verify API keys are set
team config check
```

## Data Privacy & Security

- All data is stored locally in SQLite database
- No external services except source APIs (Linear, GitHub, Coda)
- API tokens stored securely in local configuration
- Database can be backed up/restored as needed
- Data can be cleared by deleting `./data/unified.db`

## Extending the System

The unified data layer is designed to be extensible:

- **New Sources**: Implement the `DataExtractor` interface
- **Custom Queries**: Use the `UnifiedDataService` class directly
- **Enhanced Processing**: Add custom structured data extractors
- **Integration**: Use the SQLite database directly for custom analysis

See the source code in `src/unified-types.ts` and `src/unified-data-service.ts` for implementation details.