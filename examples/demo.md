# Linear AI CLI Demo

This document shows example usage of the Linear AI CLI.

## Setup

```bash
# Install dependencies
npm install
npm run build

# Setup API keys
team setup
```

## Example Commands

### 1. List Current Cycles
```bash
team cycles
```
Output:
```
📅 Current Cycles (2):

┌──────────────────────────────────────────────┐
│                Current Cycles                │
├──────────┬─────────────┬────────────┬────────────┬─────────────┤
│   Team   │    Cycle    │ Start Date │  End Date  │     ID      │
├──────────┼─────────────┼────────────┼────────────┼─────────────┤
│ Frontend │ Sprint 24.1 │ 12/4/2024  │ 12/18/2024 │ c1a2b3c4... │
├──────────┼─────────────┼────────────┼────────────┼─────────────┤
│ Backend  │ Sprint 24.1 │ 12/4/2024  │ 12/18/2024 │ d5e6f7g8... │
└──────────┴─────────────┴────────────┴────────────┴─────────────┘
```

### 2. List Issues
```bash
team issues --team TEAM-123 --limit 5
```
Output:
```
🎫 Issues (5):

FE-123 Implement dark mode toggle
  In Progress | High | @alice
  📁 Design System
  🔢 3 points

FE-124 Fix mobile navigation bug
  Todo | Medium | @bob
  📁 Mobile App
  🔢 2 points

FE-125 Add user preferences page
  In Review | Low | @charlie
  📁 Settings
  🔢 5 points
```

### 3. AI Cycle Summary
```bash
team summarize cycle --type detailed --group-by project
```
Output:
```
🤖 AI Summary:
============================================================

The current sprint shows strong progress across multiple frontend initiatives. The team is actively working on user experience improvements and addressing technical debt.

**Project: Design System**
- Dark mode implementation is in progress with good momentum
- Color palette standardization being finalized
- Component library updates aligned with new theme system

**Project: Mobile App**
- Critical navigation bug identified and being addressed
- Performance optimizations showing positive results
- User testing feedback being incorporated

**Project: Settings**
- User preferences architecture being refined
- Data persistence layer nearly complete
- UI/UX iteration based on stakeholder feedback

🔑 Key Points:
• Sprint velocity is on track with planned deliverables
• No major blockers identified across teams
• Good balance between feature work and technical debt
• Cross-team collaboration is effective
• Quality metrics are within acceptable ranges

✅ Action Items:
• Complete dark mode toggle by end of week
• Resolve mobile navigation bug before next release
• Schedule user testing session for preferences page
• Update sprint board with latest progress
• Prepare demo for stakeholder review

📊 Metrics:
• Total Issues: 23
• Completed: 8
• In Progress: 12
• Estimated Points: 67
```

### 4. Individual Issue Summary
```bash
team summarize issue FE-123 --type action-items
```
Output:
```
🤖 AI Summary for FE-123:
============================================================

Implement dark mode toggle

This issue focuses on implementing a comprehensive dark mode toggle feature that will allow users to switch between light and dark themes throughout the application. The work involves both frontend components and backend user preference storage.

Key considerations include:
- Consistent color palette across all components
- Persistent user preference storage
- Smooth theme transition animations
- Accessibility compliance for both themes
- Performance impact minimization

Next steps include finalizing the color palette, implementing the toggle component, and ensuring proper state management across the application.
```

### 5. Project Summary with Different AI Provider
```bash
team summarize project --ai-provider anthropic --type brief --group-by assignee
```
Output:
```
🤖 AI Project Summary:
============================================================

**Assignee: Alice**
- Leading dark mode implementation with solid progress
- Managing design system updates and component standardization
- Balancing feature development with technical documentation

**Assignee: Bob**
- Focused on mobile bug fixes and performance optimization
- Handling critical path items for next release
- Coordinating with QA team for thorough testing

**Assignee: Charlie**
- Architecting user preferences system with scalability in mind
- Iterating on UI design based on stakeholder feedback
- Planning integration with existing authentication system

The project shows healthy distribution of work across team members with clear ownership and good progress tracking.

🔑 Key Points:
• Team members have clear responsibilities and ownership
• Good mix of feature development and bug fixes
• Strong focus on user experience improvements
• Technical debt being addressed alongside new features

📊 Metrics:
• Total Issues: 18
• Completed: 6
• In Progress: 9
• Estimated Points: 52
```

## Configuration Examples

### View Current Config
```bash
team config show
```

### Update Default AI Provider
```bash
team config set --ai-provider anthropic --summary-type detailed
```

### Set API Keys via Command Line
```bash
team config set --linear-key lin_api_your_key_here
team config set --openai-key sk-your_openai_key_here
```

## Advanced Filtering

```bash
# Issues assigned to specific person
team issues --assignee "Alice Johnson"

# Issues in specific state
team issues --status "in progress"

# Team summary with more issues
team summarize team --limit 100 --group-by priority
```