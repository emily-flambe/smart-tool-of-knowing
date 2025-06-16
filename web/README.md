# Linear Cycle Planning Web Interface

Phase 1+ implementation of the drag-and-drop web interface for Linear cycle planning with real Linear API integration.

## Features Implemented

### Core Planning Interface
- ✅ **Drag-and-Drop**: Move tickets between backlog and engineer columns
- ✅ **Cycle Selection**: Dropdown to select active or upcoming cycles from Linear
- ✅ **Engineer Columns**: Visual columns for team members with drag-and-drop capability
- ✅ **Ticket Cards**: Rich ticket representations showing:
  - Issue title and identifier from Linear
  - Project association with color coding
  - Story points with visual indicators
  - Priority level with color coding
  - Status indicators
- ✅ **Story Point Summaries**: Real-time totals under each engineer column with load indicators
- ✅ **Project Breakdown**: Bottom panel showing story points distribution by project

### Linear Integration
- ✅ **Real Linear Data**: Fetches actual cycles, issues, and team members from Linear API
- ✅ **Change Tracking**: GitHub-like diff system for tracking local changes vs Linear state
- ✅ **Fetch Button**: Button to fetch fresh data from Linear with overwrite warning
- ✅ **Local State Management**: Track local assignment changes separate from Linear data
- ✅ **Reset Functionality**: Reset all local changes back to Linear state

### Backlog Panel
- ✅ **Live Linear Backlog**: Shows actual backlog issues from Linear (no cycle assigned)
- ✅ **Basic Filtering**: 
  - Project-based filtering with dropdown
  - Text search across title and identifier
- ✅ **Drag Integration**: Seamless drag-and-drop from backlog to planning area

### Change Management
- ✅ **Change Visualization**: Panel showing all local changes with timestamps
- ✅ **GitHub-style Diff**: Clear visual representation of what's changed locally
- ✅ **Warning System**: Warns before overwriting local changes when fetching fresh data
- ✅ **Batch Reset**: Reset all changes back to Linear state with one click

### Technical Implementation
- ✅ **React 18** with TypeScript
- ✅ **React DnD** for drag-and-drop interactions
- ✅ **TanStack Query** for server state management and caching
- ✅ **Tailwind CSS** for responsive styling
- ✅ **Framer Motion** for smooth animations and transitions
- ✅ **Express.js API** for Linear integration backend

## Getting Started

### Prerequisites
- Node.js 16+
- Linear API key configured in main project (`team setup`)
- Backend API server running

### Development Setup

1. **Install dependencies**:
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd web && npm install
   ```

2. **Start the API server** (from project root):
   ```bash
   npm run api-server
   ```

3. **Start the web interface** (from project root):
   ```bash
   npm run web
   ```

4. **Visit the application**:
   - Web interface: http://localhost:3000
   - API server: http://localhost:3001

### Production Build

```bash
# Build frontend
npm run web:build

# Build backend
npm run build
```

## How It Works

### Data Flow
1. **Initial Load**: Click "Fetch from Linear" to load current cycles, issues, and team members
2. **Local Planning**: Drag and drop issues between engineers - changes are tracked locally
3. **Change Tracking**: All local changes are displayed with GitHub-style diff visualization
4. **Sync Options**: 
   - Fetch fresh data (with warning if local changes exist)
   - Reset all local changes back to Linear state

### Change Tracking
The system maintains a separation between:
- **Original Linear Data**: The last fetched state from Linear
- **Current Local State**: Your local planning changes
- **Change Log**: Every assignment/unassignment with timestamps

This allows you to:
- See exactly what you've changed locally
- Reset back to Linear state at any time
- Get warned before losing local changes
- Work offline and sync later

### Load Indicators
Engineer columns show capacity with color-coded story point totals:
- 🔴 **Red**: >10 points (overloaded)
- ⚫ **Gray**: 6-10 points (balanced)
- 🔵 **Blue**: <6 points (available capacity)

## API Endpoints

The backend provides these endpoints:
- `GET /api/cycles` - Get current Linear cycles
- `GET /api/backlog` - Get backlog issues (no cycle)
- `GET /api/team-members` - Get team members
- `POST /api/fetch-data` - Fetch fresh data from Linear
- `GET /api/planning-state` - Get current planning state
- `POST /api/assignments` - Update local assignments
- `GET /api/changes` - Get change diff
- `POST /api/reset` - Reset to Linear state

## Current Status

This implements **Phase 1+** with full Linear integration:
- ✅ All Phase 1 core features
- ✅ Real Linear API data integration
- ✅ Change tracking and diff visualization
- ✅ Local state management
- ✅ Sync warnings and reset functionality

Ready for Phase 2 enhancements like advanced filtering, responsive design, and enhanced UX features.