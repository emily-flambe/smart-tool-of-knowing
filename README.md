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
- List and search Coda documents
- View document details and tables
- Access team documentation and knowledge base
- Seamless document discovery

🤖 **AI-Powered Summarization**
- Summarize individual issues, cycles, projects, or teams
- Support for OpenAI (GPT-4) and Anthropic (Claude)
- Multiple summary types: brief, detailed, action-items
- Group summaries by project, assignee, or priority
- Automatic metrics calculation

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
   team setup
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
team setup

# Check API health status
team health
team health --verbose

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

# Search documents
team coda search-docs "project planning"
team coda search-docs "meeting notes" --limit 5

# Show document details
team coda show-doc DOC-12345

# List document tables
team coda show-doc DOC-12345
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
| `team setup` | Interactive setup wizard for API keys |
| `team config` | Manage configuration settings |
| `team health` | Check API health status |
| `team linear` | Linear workspace integration |
| `team coda` | Coda document integration |
| `team models` | AI model management |

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
team setup

# Check API health
team health

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

# Summarize specific issue
team linear summarize issue LIN-456
```

## Configuration

The CLI stores configuration in a `.env` file in your project directory. This file takes priority over environment variables and provides a clean, git-ignorable way to manage your API keys:

```env
LINEAR_API_KEY=lin_api_your_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
CODA_API_KEY=your_coda_api_key
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
team setup

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
