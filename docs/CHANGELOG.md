# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 📋 Planned Features
- Enhanced planning and capacity analysis features
- AI-powered sprint planning recommendations
- Full-text search optimization with FTS5
- Webhook integrations for real-time data updates

## [1.1.0] - 2025-06-14

### 🚀 Major Features

#### Unified Data Layer Architecture
- **Cross-Source Data Integration**: Unified schema for Coda, Linear, and GitHub data sources
- **Universal Query Interface**: Search and analyze data across all connected sources
- **Intelligent Data Extraction**: Modular extractors with incremental sync capabilities
- **SQLite Storage Engine**: High-performance local storage with full indexing

### ✨ Added

#### New Unified Commands
- `team unified sync` - Synchronize data from all configured sources (Coda, Linear, GitHub)
- `team unified query` - Universal search across all data sources with advanced filtering
- `team unified newsletter` - Generate activity reports and summaries across timeframes
- `team unified status` - Monitor data source connections and storage statistics

#### Multi-Source Data Extraction
- **Coda Integration**: Enhanced extractor using existing markdown files with unified schema
- **Linear Integration**: Complete extraction of teams, projects, cycles, and issues
- **GitHub Integration**: Repository, commit, pull request, and issue extraction
- **Incremental Sync**: Smart updates to avoid re-processing unchanged content

#### Advanced Query Capabilities
- **Text Search**: Full-text search across titles, content, and metadata
- **Source Filtering**: Query specific data sources or combine multiple sources
- **Content Type Filtering**: Filter by specific content types (issues, documents, commits, etc.)
- **Time Range Filtering**: Query data within specific date ranges
- **Pagination Support**: Efficient handling of large result sets

#### Newsletter Generation
- **Flexible Time Ranges**: Generate reports for any date range with smart defaults
- **Multiple Grouping Options**: Group by source, content type, assignee, project, or cycle
- **Rich Formatting**: Markdown and plain text output with metrics and summaries
- **Activity Metrics**: Comprehensive statistics on completed work and progress

#### Enhanced Configuration
- **GitHub Integration Config**: Support for GitHub tokens and repository configuration
- **Coda Data Directory**: Configurable location for Coda markdown files
- **Multi-Source Setup**: Unified configuration for all data sources

### 🔧 Technical Improvements

#### Robust Data Architecture
- **Unified Type System**: Common interfaces for all data sources with source-specific extensions
- **Relationship Mapping**: Track connections between issues, documents, and projects
- **Metadata Preservation**: Complete retention of source-specific metadata and relationships
- **Search Optimization**: Indexed storage for fast cross-source queries

#### Performance & Reliability
- **Transaction Support**: Atomic operations for data consistency
- **Connection Validation**: Health checks for all configured data sources
- **Error Recovery**: Robust error handling with detailed feedback
- **Memory Efficiency**: Optimized processing for large datasets

#### Developer Experience
- **Modular Architecture**: Pluggable extractor system for easy extension
- **Comprehensive Logging**: Detailed operation tracking and debugging support
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Clean CLI Interface**: Intuitive command structure with helpful feedback

### 📊 New Use Cases Enabled

#### Cross-Source Analysis
- **Unified Knowledge Search**: Find information across all your team's data sources
- **Activity Correlation**: Connect Linear issues with GitHub commits and Coda documentation
- **Comprehensive Reporting**: Generate reports that span multiple platforms

#### Team Intelligence
- **Newsletter Automation**: Regular team updates combining work from all sources
- **Progress Tracking**: Monitor activity across Linear, GitHub, and documentation
- **Knowledge Discovery**: Find related information regardless of where it's stored

#### Foundation for Advanced Features
- **Planning Support**: Data foundation ready for AI-powered capacity planning
- **Roadmap Alignment**: Track work against documentation and strategic goals
- **Historical Analysis**: Analyze patterns and velocity across all team activities

### 📚 Documentation Updates
- **Architecture Guide**: Comprehensive documentation of the unified data layer
- **Integration Examples**: Step-by-step setup for each data source
- **Query Examples**: Advanced query patterns and use cases
- **Newsletter Templates**: Sample newsletter configurations and formats

#### Comprehensive Coda Integration
- **Complete Coda API Integration**: Full integration with Coda's REST API for document and page management
- **AI-Powered Document Q&A**: RAG (Retrieval-Augmented Generation) service for natural language queries against your documentation
- **Local Content Storage**: Dual storage system with SQLite database and markdown files for offline access

### ✨ Added

#### New Coda Commands
- `team coda list-pages` - List pages in your default Coda document with pagination support
- `team coda list-pages-urls` - List pages with their browser URLs for easy reference and sharing
- `team coda list-subpages` - Interactive hierarchical browser for exploring page relationships
- `team coda extract-page --url <url>` - Extract single page content to both markdown file and database
- `team coda extract-all` - Bulk extract all pages to markdown files with advanced filtering options
- `team coda extract` - Extract and index content for AI-powered search
- `team coda ask <question>` - Ask natural language questions about your documentation

#### Enhanced Content Extraction
- **Async Export Support**: Robust handling of Coda's async export API with proper polling and retry logic
- **Markdown File Generation**: Pages saved as properly formatted markdown with comprehensive metadata frontmatter
- **Safe Filename Generation**: Handles special characters and prevents filename conflicts
- **Hierarchical Organization**: Preserves parent-child relationships in filenames and metadata
- **Content Filtering**: Skip empty pages, hidden content, and apply minimum content length filters

#### Advanced Filtering Options for `extract-all`
- `--exclude-subpages` - Extract only top-level pages
- `--include-hidden` - Include pages that appear to be hidden or private (default: exclude)
- `--min-content-length <n>` - Skip pages with less than specified character count
- `--force` - Force re-extraction of existing content
- `--limit <n>` - Limit number of pages to process

#### RAG (Retrieval-Augmented Generation) Service
- **Semantic Search**: Vector embeddings for intelligent content discovery
- **Configurable Context**: Control search scope and content inclusion
- **Multiple Search Modes**: Focus on default document or search across all indexed content
- **Cache Management**: Intelligent caching with refresh options
- **Full Content Mode**: Include complete page content in AI context when needed

#### AI Q&A Options for `team coda ask`
- `--include-table-data` - Include table content in search context
- `--focus-on-default-doc` - Limit search to the default document only
- `--refresh-cache` - Force refresh of cached content before querying
- `--use-full-content` - Use complete page content instead of summaries

#### Enhanced Configuration Management
- **Default Document Configuration**: Set and manage default Coda document for operations
- **Environment Variable Support**: `DEFAULT_CODA_DOC_ID` and `DEFAULT_CODA_DOC_NAME` configuration
- **Interactive Setup Integration**: Coda API validation and default document selection in setup wizard

#### Data Storage Systems
- **SQLite Database (`coda-cache.db`)**: Local database for fast content search and caching
- **Markdown Files (`data/coda/`)**: Structured markdown files with frontmatter metadata
- **Vector Embeddings**: AI-powered semantic search capabilities
- **Metadata Preservation**: Complete preservation of page hierarchy, timestamps, and URLs

### 🔧 Technical Improvements

#### Robust API Integration
- **Exponential Backoff**: Intelligent retry logic for API failures
- **Rate Limiting**: Proper handling of Coda API rate limits with delays
- **Error Recovery**: Comprehensive error handling with user-friendly messages
- **URL Parsing**: Smart parsing of various Coda URL formats
- **Progress Indicators**: Real-time progress tracking for long operations

#### Performance Optimizations
- **Concurrent Operations**: Parallel processing where possible while respecting rate limits
- **Smart Caching**: Avoid re-processing unchanged content
- **Incremental Updates**: Update only modified pages during bulk extractions
- **Memory Efficiency**: Streaming content processing for large documents

#### Developer Experience
- **Comprehensive Logging**: Detailed operation logs for debugging
- **Status Indicators**: Clear visual feedback for all operations
- **Error Messages**: Helpful error messages with suggested solutions
- **Documentation**: Updated README with complete Coda integration examples
- **Usage Guidance**: Comprehensive "Content Analysis Guide" with decision matrix for RAG vs manual approaches

### 📊 Enhanced User Experience
- **Progress Tracking**: Real-time progress bars for bulk operations
- **Hierarchical Display**: Visual representation of page relationships
- **Content Statistics**: Display content length, extraction timestamps, and update status
- **Interactive Browsing**: Easy navigation through document structures
- **Rich Metadata**: Complete page information including creation dates, update times, and URLs

### 📚 Documentation & Guidance
- **Content Analysis Guide**: Comprehensive guide on when to use RAG vs manual file analysis
- **Decision Matrix**: Clear mapping of question types to recommended approaches
- **Workflow Examples**: Step-by-step processes for different analysis scenarios
- **Best Practices**: Pro tips for new users, complex topics, and verification workflows
- **Hybrid Approaches**: Guidance on combining AI synthesis with manual verification

### 🎯 New Use Cases
- **Knowledge Base Q&A**: Ask questions about your team documentation in natural language
- **Onboarding Documentation**: Extract and organize onboarding materials for new team members
- **Content Archival**: Create local backups of important documentation
- **Offline Documentation Access**: Work with documentation without internet connectivity
- **Documentation Search**: Semantic search across all your Coda content
- **Content Analysis**: Analyze documentation patterns and identify gaps
- **Guided Analysis Workflows**: Step-by-step guidance for choosing between RAG and manual approaches
- **Hybrid Information Discovery**: Combine AI synthesis with manual verification for comprehensive analysis

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