# Claude Assistant Context

## Coda Data Location
- Coda data is stored as markdown files in the `data/coda/` directory
- These files contain exported content from Coda documents and pages
- To analyze Coda data, read the markdown files directly from this location, and pass the entire content from coda as context unless otherwise specified

## Project Structure
- This is a CLI tool for managing and querying Coda data
- Main commands are under `team coda` namespace
- Data extraction and RAG (Retrieval-Augmented Generation) services are available

## Commands to Remember
- Build project: `npm run build`
- Lint/typecheck: Check package.json scripts for available lint commands