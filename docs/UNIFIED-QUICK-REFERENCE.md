# Unified Data Layer - Quick Reference

## Essential Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `team unified status` | Check connections & data stats | `team unified status` |
| `team unified sync` | Sync all/specific sources | `team unified sync --source linear` |
| `team unified query` | Search across all data | `team unified query --search "auth"` |
| `team unified newsletter` | Generate activity reports | `team unified newsletter --start 2025-06-01` |

## Data Sources & Types

| Source | Content Types | What's Included |
|--------|---------------|-----------------|
| **Coda** | `coda-document`, `coda-page`, `coda-canvas`, `coda-table` | Pages, docs, content, hierarchy |
| **Linear** | `linear-issue`, `linear-project`, `linear-cycle`, `linear-team` | Issues, projects, sprints, teams |
| **GitHub** | `github-repository`, `github-commit`, `github-pull-request`, `github-issue` | Repos, commits, PRs, issues |

## Query Filters

| Filter | Purpose | Example |
|--------|---------|---------|
| `--search "text"` | Full-text search | `--search "deployment"` |
| `--sources coda,linear` | Limit to specific sources | `--sources linear,github` |
| `--types linear-issue` | Filter content types | `--types github-commit,github-pull-request` |
| `--since 2025-06-01` | Items after date | `--since 2025-06-01 --until 2025-06-14` |
| `--limit 10` | Limit results | `--limit 5` |
| `--format json` | Output format | `--format markdown` |

## Newsletter Options

| Option | Purpose | Example |
|--------|---------|---------|
| `--start/--end` | Date range | `--start 2025-06-01 --end 2025-06-14` |
| `--group-by` | Grouping method | `--group-by assignee` (source, contentType, project, cycle) |
| `--sources` | Include specific sources | `--sources linear,github` |
| `--format` | Output format | `--format markdown` (text, html) |
| `--output file.md` | Save to file | `--output weekly-report.md` |

## Common Workflows

### Daily Standup Prep
```bash
# Yesterday's activity
team unified newsletter --start $(date -d yesterday +%Y-%m-%d)

# My assigned work
team unified query --search "assigned:$(whoami)" --sources linear
```

### Sprint Review
```bash
# Completed issues this cycle
team unified query --types linear-issue --search "completed" --since 2025-06-01

# Related commits
team unified query --types github-commit --since 2025-06-01
```

### Cross-Platform Search
```bash
# Find authentication-related items everywhere
team unified query --search "authentication OR auth OR login"

# Deployment docs and issues
team unified query --search "deployment" --sources coda,linear
```

### Team Reports
```bash
# Weekly team newsletter by person
team unified newsletter --group-by assignee --start 2025-06-07

# Project status across all sources
team unified newsletter --group-by project
```

## Data Flow Overview

```
Coda API → team coda extract-all → ./data/coda/*.md → team unified sync → ./data/unified.db
Linear API → team unified sync → ./data/unified.db  
GitHub API → team unified sync → ./data/unified.db
```

## Configuration Quick Setup

```bash
# Step 1: Configure API keys and settings
team config setup  # Interactive setup (recommended)

# OR configure individually:
team config set LINEAR_API_KEY your_linear_token
team config set GITHUB_TOKEN your_github_token
team config set GITHUB_REPOSITORIES "owner/repo1,owner/repo2"
team config set CODA_API_KEY your_coda_token
team config set CODA_DATA_DIRECTORY ./data/coda

# Step 2: Extract data from sources
team coda extract-all  # REQUIRED: Extract Coda to markdown files
# (Linear and GitHub extract automatically during sync)

# Step 3: Sync into unified database
team unified sync

# Step 4: Verify data loaded
team unified status
team unified query --limit 5
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data showing | 1. Extract Coda: `team coda extract-all` 2. Sync all: `team unified sync` |
| Coda data missing | Must run `team coda extract-all` first, then `team unified sync` |
| Source not connected | Check `team unified status`, verify API keys with `team config check` |
| Sync fails | Try individual sources: `team unified sync --source coda` |
| Query returns nothing | Check available data: `team unified query --limit 5` |
| Database issues | Delete `./data/unified.db` and re-sync |

## Data Schema Quick Reference

```typescript
// Every item has this structure:
{
  metadata: {
    id: "unique-identifier",
    source: "coda" | "linear" | "github",
    contentType: "linear-issue" | "coda-page" | etc.,
    title: "Display title",
    url: "Link to original",
    createdAt: "2025-06-14T...",
    updatedAt: "2025-06-14T...",
    sourceMetadata: { /* source-specific data */ }
  },
  content: "Full text content",
  searchableText: "Optimized search text",
  keywords: ["tag1", "tag2"],
  structuredData: {
    status: "completed",
    assignees: [{name: "John", email: "john@example.com"}],
    labels: [{name: "bug", color: "red"}],
    priority: 1
  }
}
```

## File Locations

- **Database**: `./data/unified.db`
- **Coda Data**: `./data/coda/` (markdown files)
- **Config**: `.env` file in project root
- **Logs**: Console output during sync operations