# Linear Cycle Planning Web Interface

Phase 1 implementation of the drag-and-drop web interface for Linear cycle planning.

## Features Implemented

### Core Planning Interface
- ✅ **Drag-and-Drop**: Move tickets between backlog and engineer columns
- ✅ **Cycle Selection**: Dropdown to select active or upcoming cycles
- ✅ **Engineer Columns**: Visual columns for team members with drag-and-drop capability
- ✅ **Ticket Cards**: Rich ticket representations showing:
  - Issue title and identifier (e.g., ENG-123)
  - Project association with color coding
  - Story points with visual indicators
  - Priority level with color coding
  - Status indicators
- ✅ **Story Point Summaries**: Real-time totals under each engineer column with load indicators
- ✅ **Project Breakdown**: Bottom panel showing story points distribution by project

### Backlog Panel
- ✅ **Consolidated View**: Side panel showing "To Do" tickets
- ✅ **Basic Filtering**: 
  - Project-based filtering with dropdown
  - Text search across title and identifier
- ✅ **Drag Integration**: Seamless drag-and-drop from backlog to planning area

### Technical Implementation
- ✅ **React 18** with TypeScript
- ✅ **React DnD** for drag-and-drop interactions
- ✅ **TanStack Query** ready for server state management
- ✅ **Tailwind CSS** for responsive styling
- ✅ **Framer Motion** ready for animations

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Current Status

This implements **Phase 1** of the Linear Cycle Planning Web UI as described in `docs/CHANGELOG.md`:

- Basic drag-and-drop between backlog and engineer columns ✅
- Cycle selection and ticket display ✅
- Story point summaries and project breakdown ✅
- Basic filtering and search ✅

The application currently uses mock data for demonstration purposes. Future phases will integrate with the Linear API and add enhanced features like real-time sync, advanced filtering, and capacity planning intelligence.

## Load Indicators

Engineer columns show capacity with color-coded story point totals:
- 🔴 **Red**: >10 points (overloaded)
- ⚫ **Gray**: 6-10 points (balanced)
- 🔵 **Blue**: <6 points (available capacity)