# Team Knowledge CLI

A comprehensive command-line interface that integrates Linear, Coda, and AI providers (OpenAI and Anthropic) to provide intelligent team insights, documentation access, and project management.

## Features

🚀 **Linear Integration**
- List current cycles and issues
- Filter issues by team, project, cycle, assignee, and status
- View detailed issue information
- Support for both Personal API keys and OAuth2 tokens
- Planning analysis with workload distribution

📚 **Coda Integration**
- List and search Coda documents and pages
- Extract page content to local markdown files
- View document details, pages, and subpages with hierarchical display
- AI-powered Q&A with RAG (Retrieval-Augmented Generation) service
- Local database caching with SQLite for fast searches
- Bulk content extraction with filtering options
- Seamless document discovery and content management

🤖 **AI-Powered Analysis**
- Summarize individual issues, cycles, projects, or teams
- Ask questions about your Coda documentation using natural language
- Support for OpenAI (GPT-4) and Anthropic (Claude) with configurable models
- Multiple summary types: brief, detailed, action-items
- Group summaries by project, assignee, or priority
- Automatic metrics calculation
- RAG-powered document search and Q&A

📊 **Rich Output**
- Colorized and formatted output
- Progress indicators with spinners
- Interactive prompts for easy selection
- Comprehensive error handling

## Installation

```bash
npm install
npm run build
```

## Setup

1. **Get your Linear API key**
   - Go to [Linear Settings > API](https://linear.app/settings/api)
   - Create a personal API key with appropriate permissions

2. **Get AI provider API keys**
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Anthropic**: Get your API key from [Anthropic Console](https://console.anthropic.com/)

3. **Get your Coda API key (optional)**
   - Go to [Coda Account Settings](https://coda.io/account)
   - Generate a new API token

4. **Configure the CLI**
   
   **Option A: Interactive Setup (Recommended)**
   ```bash
   team config setup
   ```
   The setup wizard will:
   - Use existing values from your `.env` file as defaults
   - Allow you to paste in new API keys
   - Validate all API connections
   - Save everything to a `.env` file in your project directory
   
   **Option B: Manual .env File**
   Create a `.env` file in your project directory:
   ```env
   # Team Knowledge CLI Configuration
   LINEAR_API_KEY=lin_api_your_key_here
   OPENAI_API_KEY=sk-your_openai_key_here
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
   CODA_API_KEY=your_coda_api_key_here
   DEFAULT_AI_PROVIDER=openai
   ```

## Usage

### Basic Commands

```bash
# Show help
team --help

# Configure API keys
team config setup

# Check API health status
team config check
team config check --verbose

# View current configuration
team config show
```

### Linear Integration

```bash
# List current cycles
team linear list cycles

# List issues
team linear list issues

# List issues with filters
team linear list issues --team TEAM-123
team linear list issues --cycle CYCLE-456
team linear list issues --project PROJECT-789
team linear list issues --assignee "John Doe"
team linear list issues --status "in progress"

# List projects and teams
team linear list projects
team linear list teams

# Planning analysis
team linear planning
```

### Coda Integration

```bash
# List Coda documents
team coda list-docs
team coda list-docs --limit 10

# Search documents
team coda search-docs "project planning"
team coda search-docs "meeting notes" --limit 5

# Show document details
team coda show-doc DOC-12345

# List pages in default document
team coda list-pages
team coda list-pages --limit 20

# List pages with URLs for easy access
team coda list-pages-urls

# Browse page hierarchy interactively
team coda list-subpages

# Extract single page content
team coda extract-page --url https://coda.io/d/_dDocId/_suPageId

# Extract all pages to markdown files
team coda extract-all
team coda extract-all --force --limit 50
team coda extract-all --exclude-subpages --exclude-hidden

# Extract and index content for AI search
team coda extract

# Ask AI questions about your documentation
team coda ask "What are our working hours?"
team coda ask "How do I set up the development environment?"
team coda ask "What is the incident response process?"
```

### AI Summarization

```bash
# Summarize current cycle
team linear summarize cycle

# Summarize specific cycle
team linear summarize cycle --cycle-id CYCLE-123

# Summarize project
team linear summarize project
team linear summarize project --project-id PROJECT-456

# Summarize team issues
team linear summarize team
team linear summarize team --team-id TEAM-789

# Summarize individual issue
team linear summarize issue LIN-123

# Advanced summarization options
team linear summarize cycle --type detailed --group-by project --ai-provider anthropic
team linear summarize project --type action-items --no-metrics
```

### Configuration Management

```bash
# Show current configuration
team config show

# Set individual config values
team config set --linear-key lin_api_new_key
team config set --openai-key sk-new_openai_key
team config set --coda-key your_new_coda_key
team config set --ai-provider anthropic
team config set --summary-type detailed

# Clear all configuration
team config clear
```

## Command Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `team config` | Manage configuration settings |
| `team linear` | Linear workspace integration |
| `team coda` | Coda document integration |
| `team models` | AI model management |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `team config setup` | Interactive setup wizard for API keys |
| `team config show` | Show current configuration |
| `team config check` | Check API health status |
| `team config set` | Update specific configuration values |
| `team config clear` | Clear all configuration |

### Linear Subcommands

| Command | Description | Options |
|---------|-------------|---------|
| `team linear list cycles` | List current active cycles | `--team <id>` |
| `team linear list issues` | List issues | `--cycle <id>`, `--project <id>`, `--team <id>`, `--limit <n>`, `--assignee <name>`, `--status <status>` |
| `team linear list projects` | List all projects | |
| `team linear list teams` | List all teams | |
| `team linear planning` | Show planning analysis | |

### Linear Summarize Subcommands

| Command | Description | Options |
|---------|-------------|---------|
| `team linear summarize cycle` | Summarize cycle issues | `--cycle-id <id>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team linear summarize project` | Summarize project issues | `--project-id <id>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team linear summarize team` | Summarize team issues | `--team-id <id>`, `--limit <n>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team linear summarize issue` | Summarize individual issue | `<issue-id>`, `--type <type>`, `--ai-provider <provider>` |

### Coda Subcommands

| Command | Description | Options |
|---------|-------------|---------|
| `team coda list-docs` | List Coda documents | `--limit <n>` |
| `team coda search-docs` | Search Coda documents | `<query>`, `--limit <n>` |
| `team coda show-doc` | Show document details | `<doc-id>` |
| `team coda list-pages` | List pages in default document | `--limit <n>`, `--doc-id <id>` |
| `team coda list-pages-urls` | List pages with browser URLs | `--limit <n>`, `--doc-id <id>` |
| `team coda list-subpages` | Interactive subpage browser | `--doc-id <id>` |
| `team coda extract-page` | Extract single page to markdown | `--url <coda-url>`, `--force` |
| `team coda extract-all` | Extract all pages to markdown files | `--force`, `--limit <n>`, `--exclude-subpages`, `--exclude-hidden`, `--min-content-length <n>` |
| `team coda extract` | Extract and index content for AI | `--include-table-data`, `--max-documents <n>`, `--force-refresh` |
| `team coda ask` | Ask AI questions about documents | `<question>`, `--include-table-data`, `--focus-on-default-doc`, `--refresh-cache`, `--use-full-content` |

### Options Reference

| Option | Values | Description |
|--------|--------|-------------|
| `--type` | `brief`, `detailed`, `action-items` | Type of summary to generate |
| `--group-by` | `project`, `assignee`, `priority` | How to group issues in summary |
| `--ai-provider` | `openai`, `anthropic` | Which AI provider to use |
| `--no-metrics` | | Exclude metrics from summary |

## Examples

### Quick Start
```bash
# Setup
team config setup

# Check API health
team config check

# List current work
team linear list cycles
team linear list issues

# Browse documentation
team coda list-docs

# Get AI summary of current cycle
team linear summarize cycle
```

### Advanced Usage
```bash
# Detailed project summary grouped by assignee using Claude
team linear summarize project --type detailed --group-by assignee --ai-provider anthropic

# Action items for team with no metrics
team linear summarize team --type action-items --no-metrics

# Issues for specific team with limit
team linear list issues --team TEAM-123 --limit 10

# Search team documentation
team coda search-docs "sprint planning" --limit 5

# Extract all pages with filters
team coda extract-all --exclude-subpages --exclude-hidden --min-content-length 100

# AI Q&A on your documentation with full content context
team coda ask "What is the onboarding process for new engineers?" --use-full-content

# Ask about specific document only
team coda ask "What are the deployment procedures?" --focus-on-default-doc

# Refresh content cache and ask question
team coda ask "Latest security guidelines" --refresh-cache

# Summarize specific issue
team linear summarize issue LIN-456
```

## Data Storage

### Coda Content Storage

The CLI provides multiple ways to store and access Coda content:

#### Local Markdown Files (`data/coda/`)
- Extracted pages are saved as markdown files in `data/coda/`
- Files include full metadata in frontmatter (title, URLs, timestamps, hierarchy)
- Safe filename generation prevents conflicts and special character issues
- Perfect for version control, offline access, and external tool integration

#### SQLite Database (`coda-cache.db`)
- Local SQLite database stores page content with metadata
- Enables fast searching and caching of extracted content
- Used by the AI Q&A system for semantic search
- Automatically managed by the CLI

#### AI-Powered Search
- RAG (Retrieval-Augmented Generation) service processes content for semantic search
- Vector embeddings enable intelligent content discovery
- Ask natural language questions about your documentation
- Configurable search scope and content inclusion options

```bash
# Extract to both markdown files and database
team coda extract-all

# Extract single page to both formats
team coda extract-page --url https://coda.io/d/_dDocId/_suPageId

# Use AI to search and answer questions
team coda ask "How do I configure the development environment?"
```

## Configuration

The CLI stores configuration in a `.env` file in your project directory. This file takes priority over environment variables and provides a clean, git-ignorable way to manage your API keys:

```env
LINEAR_API_KEY=lin_api_your_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
CODA_API_KEY=your_coda_api_key
DEFAULT_CODA_DOC_ID=your_default_doc_id
DEFAULT_CODA_DOC_NAME=Your Default Document Name
DEFAULT_AI_PROVIDER=openai
```

### Configuration Priority

The CLI reads configuration in this order:
1. `.env` file in your project directory (highest priority)
2. Environment variables
3. Legacy configstore values (for backward compatibility)

### Managing Configuration

```bash
# Interactive setup (creates/updates .env file)
team config setup

# Check API connectivity and health
team config check

# View current configuration and .env file location
team config show

# Manually update specific values (updates .env file)
team config set --linear-key lin_api_new_key
team config set --coda-key your_new_coda_key
```

### API Key Formats

- **Linear Personal API Key**: `lin_api_xxxxxxxxxx`
- **Linear OAuth2 Token**: `lin_oauth_xxxxxxxxxx`
- **OpenAI API Key**: `sk-xxxxxxxxxx`
- **Anthropic API Key**: `sk-ant-xxxxxxxxxx`
- **Coda API Key**: `your_coda_api_key`

## Error Handling

The CLI provides helpful error messages for common issues:

- Invalid or missing API keys (Linear, OpenAI, Anthropic, Coda)
- Network connectivity problems
- Linear API rate limiting
- Coda API rate limiting
- AI provider service issues
- Invalid issue/project/team/document IDs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- Create an issue for bug reports or feature requests
- Check the [Linear API documentation](https://developers.linear.app/) for Linear API questions
- Review [Coda API documentation](https://coda.io/developers) for Coda API questions
- Review [OpenAI](https://platform.openai.com/docs) or [Anthropic](https://docs.anthropic.com/) documentation for AI-related questions
