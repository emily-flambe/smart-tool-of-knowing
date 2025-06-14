# Claude Assistant Context

## Application Architecture Plan

### Core Architecture

**Unified Data Layer**
- Create standardized data extractors for each source (Coda, Linear, GitHub)
- Store extracted data in a common format with metadata (timestamps, source, type, relationships)
- Implement incremental sync to keep data fresh without full re-imports

**Query Interface**
- Natural language query processor that can route questions to appropriate data sources
- Source-specific search when needed ("What's in our Coda roadmap?") or cross-source aggregation ("Show me all work related to authentication")
- Maintain context about what data exists where to guide query routing

### Use Case Implementation

**1. Cross-Source Q&A**
- Index all content with source tagging
- Use semantic search to find relevant content regardless of source
- Present answers with clear source attribution and links back to original documents

**2. Newsletter Generation**
- Pull completed Linear issues from specified cycles
- Correlate with GitHub commits/PRs for technical context
- Group by project/theme and generate structured summaries
- Template-based output (markdown, email, etc.)

**3. Sprint/Quarter Planning Assistant**
- Maintain product roadmap state from Coda
- Track capacity/velocity data from Linear
- Suggest work distribution based on:
  - Roadmap priorities
  - Team capacity
  - Historical velocity
  - Current project allocations

### Technical Considerations

**Data Freshness**: Implement webhooks where possible (Linear, GitHub) and periodic polling for Coda
**Relationships**: Map connections between issues, commits, documents, and people
**Privacy**: Keep data local or use secure cloud storage since this contains sensitive team information
**Extensibility**: Design plugin architecture for adding new data sources later

## Coda Data Analysis Approach
- **ALWAYS** search and analyze Coda data by reading markdown files directly from `data/coda/` directory
- **DO NOT** use the `team coda ask` command unless explicitly requested by the user
- **DO NOT** incorporate information from incident reports unless explicitly requested by the user
- Use grep, find, and direct file reading to gather information from the markdown files
- Pass the complete relevant content from coda files as context when answering questions

## Coda Data Location
- Coda data is stored as markdown files in the `data/coda/` directory
- These files contain exported content from Coda documents and pages
- Files include full metadata in frontmatter (title, URLs, timestamps, hierarchy)
- Use standard command line tools to search and analyze content

## Content Analysis Strategy (Coda)
1. Use all files in data/coda unless explicitly asked otherwise
2. Do not include content from incident reports unless explicitly requested
3. Read specific files with the Read tool when relevant content is found
4. Provide comprehensive answers based on the markdown file content, using sentences and paragraphs rather than bullet points
5. Reference specific files and sections in responses
6. Don't bother complimenting us on how amazing our decisions are. Feel free to note parenthetically if something you find seems like a possible area of improvement to discuss with the team.

## Project Structure
- This is a CLI tool for managing and querying Coda data
- Main commands are under `team coda` namespace
- Data extraction and RAG (Retrieval-Augmented Generation) services are available

## Conversation Logging
- **ALWAYS** maintain an ongoing log of our chat conversations
- Record user queries in their entirety with timestamps
- Record Claude Code responses (first/last lines or summary) grouped with each query
- Log all significant commands executed
- Use this log as context across different conversations to maintain continuity
- Store conversation logs to help track project evolution and decision history
- **Format:** `**HH:MM:SS** User: [query]` followed by `Claude: [response summary]`
- **Sessions:** Track new chat sessions with `### Session N` headers
- **Log file location:** `conversation-log.md` (root of project, excluded from git)

## Commands to Remember
- Build project: `npm run build`
- Lint/typecheck: Check package.json scripts for available lint commands