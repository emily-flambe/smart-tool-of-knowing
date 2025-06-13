# Claude Assistant Context

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

## Content Analysis Strategy
1. Use `grep -r -i "keyword"` to search across all Coda files
2. Use `find` to locate files by name patterns
3. Read specific files with the Read tool when relevant content is found
4. Provide comprehensive answers based on the markdown file content
5. Reference specific files and sections in responses

## Project Structure
- This is a CLI tool for managing and querying Coda data
- Main commands are under `team coda` namespace
- Data extraction and RAG (Retrieval-Augmented Generation) services are available

## Commands to Remember
- Build project: `npm run build`
- Lint/typecheck: Check package.json scripts for available lint commands