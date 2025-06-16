# Development Guide

## Quick Start

The easiest way to start both servers:

```bash
npm run dev:full
```

This will start both the API server (port 3001) and web interface (port 3000).

## Manual Setup

If you prefer to start servers manually:

### 1. Start API Server
```bash
npm run api-server
```
Server runs on http://localhost:3001

### 2. Start Web Interface (in another terminal)
```bash
npm run web
```
Interface runs on http://localhost:3000

## Prerequisites

1. **Linear API Configuration**
   ```bash
   team setup
   ```
   Configure your Linear API key when prompted.

2. **Install Dependencies**
   ```bash
   npm install
   cd web && npm install
   ```

## Common Issues

### "ERR_CONNECTION_REFUSED" Error
- **Problem**: API server not running
- **Solution**: Run `npm run api-server` in a separate terminal

### "Invalid Linear API key" Error  
- **Problem**: Linear not configured
- **Solution**: Run `team setup` and enter valid Linear API key

### Port Already in Use
- **Problem**: Ports 3000 or 3001 already occupied
- **Solution**: Kill existing processes or change ports in configs

## Testing the Setup

1. Visit http://localhost:3000
2. You should see "Connect to your Linear workspace to start planning"
3. Click "Fetch from Linear" 
4. If configured correctly, it should load your Linear data

## Development Workflow

1. **Make changes** to frontend (`web/src/`) or backend (`src/`)
2. **Hot reload** will update the web interface automatically
3. **API server** needs manual restart for changes
4. **Test changes** by interacting with the UI

## API Endpoints

The development API server provides:
- `GET /api/cycles` - Current Linear cycles
- `GET /api/backlog` - Backlog issues  
- `GET /api/team-members` - Team members
- `POST /api/fetch-data` - Fetch fresh Linear data
- `POST /api/assignments` - Update assignments
- `GET /api/changes` - Get local changes
- `POST /api/reset` - Reset to Linear state

## Troubleshooting

Check the browser console and terminal output for detailed error messages. The UI now shows informative error messages with suggestions for common issues.