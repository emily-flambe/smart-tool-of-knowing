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

## Configuration Quick Setup

```bash
# Check what's configured
team unified status

# Configure Coda (uses existing markdown files)
team config set CODA_DATA_DIRECTORY ./data/coda

# Configure Linear
team config set LINEAR_API_KEY your_linear_token

# Configure GitHub
team config set GITHUB_TOKEN your_github_token
team config set GITHUB_REPOSITORIES "owner/repo1,owner/repo2"

# Sync everything
team unified sync
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data showing | Run `team unified sync` first |
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