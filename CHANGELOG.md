# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-11

### 🎉 Initial Release

This is the first release of the Linear AI CLI - a comprehensive command-line interface for Linear with AI-powered summarization capabilities.

### ✨ Added

#### Core Features
- **Linear Integration**: Complete GraphQL API integration with authentication support
- **AI-Powered Summarization**: Support for both OpenAI (GPT-4) and Anthropic (Claude) models
- **Interactive Setup**: Guided configuration wizard for API keys and model selection
- **Dynamic Model Selection**: Fetch and choose from available AI models with validation

#### Commands
- `team setup` - Interactive setup wizard for API keys and preferences
- `team config` - Comprehensive configuration management with show/set/clear subcommands
- `team list` - List Linear items (cycles, issues, projects, teams) with advanced filtering
- `team summarize` - AI-powered summarization with multiple grouping and detail options
- `team models` - List and select AI models interactively
- `team planning` - Workload and project distribution analysis with visual indicators
- `team cycles` - Quick alias for listing current cycles
- `team issues` - Quick alias for listing issues with filters

#### Linear Integration Features
- List current and recent cycles (past 3 months) with status indicators
- Advanced issue filtering by team, project, cycle, assignee, and status
- Support for both Personal API keys and OAuth2 tokens
- Comprehensive project and team management
- Individual issue lookup and details

#### AI Summarization Features
- **Multiple AI Providers**: OpenAI (GPT-4, GPT-4-turbo, GPT-3.5-turbo) and Anthropic (Claude 3.5 Sonnet, Haiku, Opus)
- **Summary Types**: Brief, detailed, and action-items focused summaries
- **Grouping Options**: Group summaries by project, assignee, or priority
- **Context-Aware**: Summarize cycles, projects, teams, or individual issues
- **Metrics Integration**: Automatic calculation and display of progress metrics
- **Action Items Extraction**: AI-powered extraction of next steps and recommendations

#### Planning Features
- **Workload Analysis**: Visual story point distribution by assignee with color-coded load indicators
  - 🔴 Red: >10 points (overloaded)
  - ⚪ White: 6-10 points (balanced)
  - 🔵 Cyan: <6 points (available capacity)
- **Project Distribution**: Percentage-based allocation with visual progress bars
- **Summary Statistics**: Total points, issue counts, estimation coverage
- **Capacity Planning**: Identify over/under-allocated team members

#### User Experience
- **Rich Terminal Output**: Colorized tables, progress bars, and status indicators
- **Interactive Prompts**: Smart selection lists with contextual information
- **Progress Indicators**: Spinners and loading states for long operations
- **Comprehensive Help**: Detailed help text and examples for all commands
- **Error Handling**: Graceful error messages with helpful suggestions

#### Configuration Management
- **Persistent Storage**: Secure local storage of API keys and preferences
- **Environment Variables**: Support for .env files and environment-based configuration
- **Flexible Model Selection**: Choose different models for different providers
- **Validation**: API key and model access validation during setup

#### Technical Features
- **TypeScript**: Full TypeScript implementation with comprehensive type definitions
- **ESM Support**: Modern ES modules with Node.js 16+ compatibility
- **GraphQL Integration**: Direct Linear GraphQL API integration for optimal performance
- **Rate Limiting Awareness**: Proper handling of Linear API rate limits
- **Error Recovery**: Robust error handling with fallback options

### 🔧 Technical Details
- **Node.js**: Requires Node.js 16 or higher
- **Package Type**: ES Modules (ESM)
- **CLI Framework**: Commander.js for robust command structure
- **UI Components**: Inquirer.js for interactive prompts, Ora for spinners, Chalk for colors
- **Tables**: ASCII tables with borders and formatting
- **Configuration**: Configstore for persistent local configuration

### 📚 Documentation
- Comprehensive README with setup instructions and usage examples
- Detailed help text for all commands and options
- Example configurations and common workflows
- API key setup guides for Linear, OpenAI, and Anthropic

### 🎯 Use Cases
- **Sprint Planning**: Analyze workload distribution and identify capacity issues
- **Retrospectives**: AI-powered summaries of completed cycles and projects
- **Progress Tracking**: Quick overview of current work and status
- **Team Management**: Understand team capacity and project allocation
- **Issue Management**: Efficient browsing and analysis of Linear issues
- **Strategic Planning**: High-level summaries of work across projects and time periods

### 🔒 Security
- API keys stored securely in local configuration
- No external data transmission beyond official Linear and AI provider APIs
- Support for environment variables to avoid storing keys in configuration files
- API key validation to prevent unauthorized access

### 🚀 Performance
- Efficient GraphQL queries to minimize API calls
- Concurrent processing where possible
- Smart caching and data reuse
- Optimized for large workspaces with hundreds of issues

---

## Future Releases

See [GitHub Issues](https://github.com/anthropics/linear-ai-cli/issues) for planned features and improvements.