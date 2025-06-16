# Linear Planning UI Guide

**Complete interactive cycle planning interface for Linear workspace management**

The Linear Planning UI provides a comprehensive web-based interface for managing cycle planning, ticket assignments, workload visualization, and team coordination through an intuitive drag-and-drop interface.

## 🚀 Quick Start

### Starting the Development Environment

**Option 1: Automatic Startup (Recommended)**
```bash
./start-dev.sh
```
This script automatically:
- Starts the API server on port 3001
- Starts the web interface on port 3000
- Handles port conflicts gracefully
- Provides cleanup on exit (Ctrl+C)

**Option 2: Manual Startup**
```bash
# Terminal 1: Start API server
npm run api-server

# Terminal 2: Start web interface  
npm run web
```

### Access the Interface

Navigate to **http://localhost:3000** in your browser.

**API Server**: http://localhost:3001 (for direct API access)

## ✨ Core Features

### 🎯 Interactive Planning Interface

- **Drag-and-Drop Assignment**: Move tickets between engineers and status columns
- **Cycle Selection**: Choose from current and recent Linear cycles
- **Real-time Updates**: Instant visual feedback for all changes
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📊 Visual Analytics

- **Project Breakdown**: Progress bars showing project distribution and completion
- **Engineer Breakdown**: Workload visualization per team member
- **Summary Table**: Engineers × Projects matrix with story point totals
- **Progress Indicators**: Visual representation of cycle completion

### 🔄 Assignment Management

- **Multi-mode Organization**: Toggle between engineer-first and status-first grouping
- **Intelligent Assignment**: Automatic engineer detection and assignment tracking
- **Unassigned Backlog**: Dedicated area for unplanned tickets
- **Status Transitions**: Move tickets between workflow states

### 🎛️ Advanced Filtering

- **Project Filtering**: Show/hide specific projects
- **Status Filtering**: Filter by workflow states
- **Assignee Filtering**: Focus on specific team members  
- **Priority Filtering**: Filter by ticket priority levels
- **Combined Filtering**: Multiple filter types work together

### 💾 Change Tracking

- **Local Change Management**: Track all modifications before committing
- **Detailed Change History**: View what changed, when, and by whom
- **Commit Modal**: Review and organize changes before applying to Linear
- **Individual Change Deletion**: Remove specific changes from the queue
- **Bulk Operations**: Apply multiple changes simultaneously

## 📋 Detailed Interface Guide

### Main Interface Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Linear Planning UI Header]                                 │
├─────────────────────────────────────────────────────────────┤
│ [Test Connection] [Fetch Data] [Cycle Selector] [Filters]   │
├─────────────────────────────────────────────────────────────┤
│ [Toggle: Engineer vs Status View] [Changes Panel]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ [Main Planning Area - Drag & Drop Columns]                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Unplanned Backlog Panel] (Collapsible)                    │
├─────────────────────────────────────────────────────────────┤
│ [Project Breakdown]    [Engineer Breakdown]                │
├─────────────────────────────────────────────────────────────┤
│ [Engineers × Projects Summary Table]                        │
└─────────────────────────────────────────────────────────────┘
```

### Planning Workflow

#### 1. Initial Setup

1. **Test Connection**: Verify Linear API connectivity
2. **Fetch Data**: Load latest cycle and issue data from Linear
3. **Select Cycle**: Choose the cycle you want to plan

#### 2. Planning Process

1. **Review Current State**: See all tickets in their current assignments
2. **Drag & Drop**: Move tickets between:
   - Engineers (assign/reassign work)
   - Status columns (update workflow states)
   - Unassigned area (remove from cycle)

3. **Edit Estimates**: Click any story point value to edit inline
4. **Apply Filters**: Use sidebar filters to focus on specific work
5. **Monitor Progress**: Watch real-time updates in breakdown panels

#### 3. Change Management

1. **Track Changes**: All modifications appear in the changes panel
2. **Review Changes**: Click "View/Commit Changes" to see detailed list
3. **Organize Changes**: Remove unwanted changes or edit descriptions
4. **Commit to Linear**: Apply changes back to Linear with batch update

### Drag-and-Drop Operations

#### Ticket Assignment
- **Drag ticket to engineer column**: Assigns ticket to that engineer
- **Drag ticket to "Unassigned"**: Removes assignment
- **Drag between engineers**: Reassigns ticket

#### Status Updates
- **Drag ticket to status column**: Updates ticket workflow state
- **Status-first view**: Organize tickets by current state
- **Combined operations**: Change assignment and status simultaneously

#### Advanced Operations
- **Multiple selections**: Hold Ctrl/Cmd for bulk operations (planned feature)
- **Quick actions**: Right-click for context menu (planned feature)

## 🎛️ Interface Components

### Cycle Selector
- **Current Cycles**: Shows active Linear cycles
- **Recent Cycles**: Access recently completed cycles
- **Auto-refresh**: Updates when new cycles are created

### Filters Sidebar
```
Projects Filter:
☑ Project Alpha
☑ Project Beta  
☐ Project Gamma

Statuses Filter:
☑ Todo
☑ In Progress
☑ In Review
☐ Done

Assignees Filter:
☑ Alice Johnson
☑ Bob Smith
☐ Carol Davis

Priorities Filter:
☑ Urgent (1)
☑ High (2)
☑ Medium (3)
☐ Low (4)
```

### Changes Panel
```
📝 Local Changes (3)
┌─────────────────────────────────┐
│ LIN-123: Assigned to Alice      │
│ LIN-456: Updated estimate to 8  │  
│ LIN-789: Status → In Progress   │
└─────────────────────────────────┘
[View/Commit Changes]
```

### Breakdown Panels

#### Project Breakdown
- **Progress Bars**: Visual representation of project completion
- **Story Points**: Total points per project
- **Issue Count**: Number of tickets per project
- **Percentage**: Relative project size

#### Engineer Breakdown  
- **Workload Distribution**: Story points assigned per engineer
- **Capacity Visualization**: Color-coded workload indicators
- **Issue Count**: Number of tickets per engineer

#### Summary Table
```
                │ Project A │ Project B │ Project C │ Total │
Engineers       │           │           │           │       │
─────────────── │ ───────── │ ───────── │ ───────── │ ───── │
Alice Johnson   │     8     │     5     │     -     │  13   │
Bob Smith       │     3     │     8     │     2     │  13   │
Carol Davis     │     -     │     2     │     5     │   7   │
─────────────── │ ───────── │ ───────── │ ───────── │ ───── │
Total           │    11     │    15     │     7     │  33   │
```

## 🔧 Advanced Features

### Local Change Management

The Planning UI maintains all changes locally until you're ready to commit them to Linear:

#### Change Types Tracked
- **Assignment Changes**: Engineer assignments and unassignments
- **Estimate Updates**: Story point modifications
- **Status Transitions**: Workflow state changes
- **Cycle Movements**: Moving tickets between cycles

#### Change Review Process
1. **Accumulate Changes**: Make multiple modifications during planning
2. **Review Modal**: Detailed list of all pending changes
3. **Edit Descriptions**: Customize commit messages for clarity
4. **Selective Deletion**: Remove unwanted changes
5. **Batch Commit**: Apply all changes to Linear simultaneously

### Filtering System

#### Multi-criteria Filtering
- **Additive Logic**: Selected filters show items matching ANY selected criteria within each category
- **Cross-category Logic**: Items must match ALL active filter categories
- **Real-time Updates**: Filters apply instantly as you make selections

#### Filter Persistence
- **Session Memory**: Filter settings persist during your session
- **URL State**: Shareable filtered views (planned feature)
- **Saved Filters**: Store frequently used filter combinations (planned feature)

### View Modes

#### Engineer-First Grouping
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Alice       │ │ Bob         │ │ Unassigned  │
│ ─────────── │ │ ─────────── │ │ ─────────── │
│ LIN-123 (5) │ │ LIN-456 (3) │ │ LIN-789 (8) │
│ LIN-124 (2) │ │ LIN-457 (5) │ │ LIN-790 (1) │
│ LIN-125 (3) │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

#### Status-First Grouping
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Todo        │ │ In Progress │ │ In Review   │
│ ─────────── │ │ ─────────── │ │ ─────────── │
│ LIN-123 (5) │ │ LIN-456 (3) │ │ LIN-789 (8) │
│ LIN-124 (2) │ │ LIN-457 (5) │ │             │
│ LIN-125 (3) │ │             │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 📊 Analytics and Reporting

### Project Analytics
- **Completion Tracking**: Visual progress bars for each project
- **Resource Allocation**: Story points and engineer time per project
- **Priority Distribution**: High vs. low priority work breakdown

### Team Analytics
- **Workload Balance**: Ensure even distribution of work
- **Capacity Planning**: Identify over/under-allocated engineers
- **Cross-project Collaboration**: See which engineers work on multiple projects

### Cycle Metrics
- **Total Story Points**: Complete cycle estimation
- **Engineer Utilization**: Percentage of available capacity used
- **Project Distribution**: How work is spread across initiatives

## 🛠️ Technical Details

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **State Management**: React Query for server state, React hooks for local state
- **Drag & Drop**: React DnD library
- **Styling**: Tailwind CSS with responsive design
- **Build Tool**: Vite for fast development and optimized builds

### API Integration
- **Real-time Sync**: Automatic data refresh from Linear API
- **Optimistic Updates**: Immediate UI feedback with rollback on failure
- **Error Handling**: Comprehensive error states and user feedback
- **Rate Limiting**: Respectful API usage with automatic retry logic

### Data Flow
```
Linear API ↔ Backend Server ↔ Frontend Planning UI
     ↑              ↑                    ↑
  GraphQL      REST API           React Components
 Mutations     Endpoints          with Local State
```

### Performance Optimization
- **Virtual Scrolling**: Handle large numbers of tickets efficiently
- **Debounced Updates**: Prevent excessive API calls during rapid changes
- **Caching Strategy**: Smart caching with selective invalidation
- **Code Splitting**: Lazy loading for faster initial page loads

## 🔧 Development and Customization

### Local Development Setup

1. **Prerequisites**:
   ```bash
   # Ensure Node.js 18+ is installed
   node --version
   
   # Install dependencies
   npm install
   ```

2. **Environment Configuration**:
   ```bash
   # Configure Linear API access
   team config setup
   ```

3. **Development Commands**:
   ```bash
   # Start full development environment
   ./start-dev.sh
   
   # Or start components individually
   npm run api-server  # Backend API server
   npm run web         # Frontend development server
   ```

### Testing

#### Frontend Tests
```bash
# Run component tests
cd web && npm test

# Run with coverage
cd web && npm test -- --coverage

# Run specific test files
cd web && npm test TicketCard
```

#### Backend Tests
```bash
# Run API integration tests
npm test

# Run specific test suites
npm test -- --testNamePattern="Linear"
```

### Customization Options

#### Theming
- **Tailwind Configuration**: Modify `web/tailwind.config.js`
- **CSS Variables**: Custom color schemes and spacing
- **Component Styling**: Override default component styles

#### Feature Flags
- **Environment Variables**: Enable/disable features via `.env`
- **Configuration File**: Centralized feature toggle management
- **Runtime Settings**: Dynamic feature enablement

#### API Extensions
- **Custom Endpoints**: Add new API endpoints for additional functionality
- **Webhook Integration**: Real-time updates from Linear webhooks
- **External Integrations**: Connect additional tools and services

## 🚨 Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Test Linear API connectivity
curl -H "Authorization: lin_api_your_key" https://api.linear.app/graphql

# Check API server status
curl http://localhost:3001/api/health
```

#### Data Loading Issues
1. **Verify API Key**: Use `team config check` to validate credentials
2. **Check Network**: Ensure firewall allows connections to Linear API
3. **Clear Cache**: Restart both servers to clear any cached state

#### Performance Issues
1. **Large Datasets**: Use filtering to reduce visible tickets
2. **Browser Memory**: Close unnecessary tabs and browser windows
3. **Network Latency**: Check internet connection stability

#### Drag & Drop Problems
1. **Browser Compatibility**: Ensure modern browser (Chrome 90+, Firefox 88+, Safari 14+)
2. **JavaScript Errors**: Check browser console for error messages
3. **State Conflicts**: Refresh page to reset local state

### Error Messages

#### "Linear API Error: Cannot query field"
- **Cause**: API schema mismatch or invalid query
- **Solution**: Update to latest version or check Linear API documentation

#### "Failed to fetch data: 500 Internal Server Error"
- **Cause**: Backend server error or invalid configuration
- **Solution**: Check server logs and verify API key configuration

#### "Planning state not found"
- **Cause**: No data has been fetched yet
- **Solution**: Click "Fetch Data" button to load initial data

### Getting Help

1. **Check Logs**: Review browser console and server terminal output
2. **Verify Configuration**: Use `team config check` for health status
3. **Update Dependencies**: Ensure all packages are up to date
4. **Community Support**: Create issue on GitHub repository

## 🔮 Planned Features

### Short-term (Next Release)
- **Bulk Operations**: Multi-select tickets for batch updates
- **Keyboard Shortcuts**: Power-user keyboard navigation
- **Saved Views**: Store and recall filter combinations
- **Export Functionality**: Download planning data as CSV/PDF

### Medium-term
- **Velocity Tracking**: Historical sprint velocity analysis
- **Capacity Planning**: Engineer availability and capacity management
- **Integration Extensions**: Slack notifications, email summaries
- **Advanced Analytics**: Burndown charts and cycle predictions

### Long-term
- **Multi-team Planning**: Coordinate across multiple Linear teams
- **Resource Management**: Track non-engineering dependencies
- **Automated Planning**: AI-powered assignment suggestions
- **Mobile App**: Native mobile planning interface

## 📄 API Reference

### Planning API Endpoints

#### Core Data
- `GET /api/health` - Server health check
- `GET /api/test-linear` - Linear API connectivity test
- `POST /api/fetch-data` - Load fresh data from Linear
- `GET /api/planning-state` - Current planning state
- `GET /api/changes` - Local changes diff

#### Assignment Management
- `POST /api/assignments` - Update ticket assignment
- `POST /api/update-estimate` - Modify story point estimate
- `POST /api/update-status` - Change ticket status
- `POST /api/update-cycle` - Move ticket between cycles

#### Change Management
- `POST /api/commit-changes` - Apply changes to Linear
- `DELETE /api/changes/:index` - Remove specific change
- `POST /api/reset` - Reset to original state

#### Team Data
- `GET /api/cycles` - List available cycles
- `GET /api/team-members` - Team member information
- `GET /api/active-engineers` - Engineers from recent cycles

## 📚 Additional Resources

### Documentation
- [Linear API Documentation](https://developers.linear.app/)
- [React Query Guide](https://tanstack.com/query/latest)
- [React DnD Documentation](https://react-dnd.github.io/react-dnd/)
- [Tailwind CSS Reference](https://tailwindcss.com/docs)

### Development Tools
- [Linear GraphQL Explorer](https://studio.apollographql.com/public/Linear-API/explorer)
- [React Developer Tools](https://react.dev/learn/react-developer-tools)
- [Vite Documentation](https://vitejs.dev/)

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support and usage questions
- **Contributing**: Guidelines for code contributions

---

*This documentation is maintained alongside the codebase and updated with each release. For the most current information, always refer to the latest version in the repository.*