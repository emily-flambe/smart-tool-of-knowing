# Linear AI CLI

A powerful command-line interface for Linear that integrates with AI providers (OpenAI and Anthropic) to provide intelligent summarization of tickets, projects, and cycles.

## Features

🚀 **Linear Integration**
- List current cycles and issues
- Filter issues by team, project, cycle, assignee, and status
- View detailed issue information
- Support for both Personal API keys and OAuth2 tokens

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

3. **Configure the CLI**
   ```bash
   team setup
   ```
   
   Or manually create a `.env` file:
   ```env
   LINEAR_API_KEY=lin_api_your_key_here
   OPENAI_API_KEY=sk-your_openai_key_here
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here
   DEFAULT_AI_PROVIDER=openai
   ```

## Usage

### Basic Commands

```bash
# Show help
team --help

# Configure API keys
team setup

# List current cycles
team cycles
team list cycles

# List issues
team issues
team list issues

# List issues with filters
team issues --team TEAM-123
team issues --cycle CYCLE-456
team issues --project PROJECT-789
team issues --assignee "John Doe"
team issues --status "in progress"

# List projects and teams
team list projects
team list teams
```

### AI Summarization

```bash
# Summarize current cycle
team summarize cycle

# Summarize specific cycle
team summarize cycle --cycle-id CYCLE-123

# Summarize project
team summarize project
team summarize project --project-id PROJECT-456

# Summarize team issues
team summarize team
team summarize team --team-id TEAM-789

# Summarize individual issue
team summarize issue LIN-123

# Advanced summarization options
team summarize cycle --type detailed --group-by project --ai-provider anthropic
team summarize project --type action-items --no-metrics
```

### Configuration Management

```bash
# Show current configuration
team config show

# Set individual config values
team config set --linear-key lin_api_new_key
team config set --openai-key sk-new_openai_key
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
| `team list` | List Linear items (cycles, issues, projects, teams) |
| `team summarize` | AI-powered summarization |

### List Subcommands

| Command | Description | Options |
|---------|-------------|---------|
| `team list cycles` | List current active cycles | `--team <id>` |
| `team list issues` | List issues | `--cycle <id>`, `--project <id>`, `--team <id>`, `--limit <n>`, `--assignee <name>`, `--status <status>` |
| `team list projects` | List all projects | |
| `team list teams` | List all teams | |

### Summarize Subcommands

| Command | Description | Options |
|---------|-------------|---------|
| `team summarize cycle` | Summarize cycle issues | `--cycle-id <id>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team summarize project` | Summarize project issues | `--project-id <id>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team summarize team` | Summarize team issues | `--team-id <id>`, `--limit <n>`, `--type <type>`, `--group-by <grouping>`, `--ai-provider <provider>`, `--no-metrics` |
| `team summarize issue` | Summarize individual issue | `<issue-id>`, `--type <type>`, `--ai-provider <provider>` |

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

# List current work
team cycles
team issues

# Get AI summary of current cycle
team summarize cycle
```

### Advanced Usage
```bash
# Detailed project summary grouped by assignee using Claude
team summarize project --type detailed --group-by assignee --ai-provider anthropic

# Action items for team with no metrics
team summarize team --type action-items --no-metrics

# Issues for specific team with limit
team issues --team TEAM-123 --limit 10

# Summarize specific issue
team summarize issue LIN-456
```

## Configuration

The CLI stores configuration in your home directory using `configstore`. You can also use environment variables:

```env
LINEAR_API_KEY=lin_api_your_key
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
DEFAULT_AI_PROVIDER=openai
```

### API Key Formats

- **Linear Personal API Key**: `lin_api_xxxxxxxxxx`
- **Linear OAuth2 Token**: `lin_oauth_xxxxxxxxxx`
- **OpenAI API Key**: `sk-xxxxxxxxxx`
- **Anthropic API Key**: `sk-ant-xxxxxxxxxx`

## Error Handling

The CLI provides helpful error messages for common issues:

- Invalid or missing API keys
- Network connectivity problems
- Linear API rate limiting
- AI provider service issues
- Invalid issue/project/team IDs

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
- Check the [Linear API documentation](https://developers.linear.app/) for API-related questions
- Review [OpenAI](https://platform.openai.com/docs) or [Anthropic](https://docs.anthropic.com/) documentation for AI-related questions
