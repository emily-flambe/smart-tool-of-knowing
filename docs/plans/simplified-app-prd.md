# Product Requirements Document: Engineering Manager Dashboard

## Executive Summary

This document outlines the requirements for a simplified dashboard specifically designed for Engineering Managers to track what their team is working on across different timescales by integrating Linear (project management) and GitHub (code activity) data.

## Problem Statement

Engineering Managers spend hours each week manually gathering information to answer basic questions:
- "What did my team ship this sprint?"
- "What is each engineer working on right now?"
- "Are we on track for our commitments?"
- "How is our time split between features and bugs?"

This manual process involves:
- Switching between Linear and GitHub repeatedly
- Copy-pasting information into status reports
- Mentally correlating issues with code changes
- Missing important updates due to information scatter

## Product Vision

Create a focused web dashboard that automatically shows Engineering Managers what their team is doing by intelligently combining Linear issues with GitHub activity.

## Target User: Engineering Manager

**Responsibilities**:
- Managing 4-10 engineers
- Running weekly team meetings and standups
- Reporting team status to leadership
- Planning sprints and allocating work
- Identifying and removing blockers

**Key Needs**:
- Quick daily overview of team activity
- Easy weekly status report generation
- Sprint planning insights
- Real-time awareness of blockers or delays

**Pain Points**:
- Spending 2-3 hours/week creating status reports
- Not knowing what engineers worked on until standup
- Difficulty tracking if PRs match planned work
- Manual correlation of issues to code changes

## Core Features

### 1. Team Dashboard
**Description**: A single view showing what everyone on the team is doing right now and recently.

**Key Elements**:
- Each engineer's current Linear issue(s) and related PR status
- Today's GitHub activity (commits, PR updates, reviews)
- Visual indicators for blocked items or items without recent activity
- Quick filters for "Active Today", "Blocked", "In Review"

### 2. Sprint Overview
**Description**: Complete picture of the current sprint's progress.

**Key Elements**:
- Sprint burndown with completed vs remaining issues
- Each engineer's assigned vs completed work
- PRs awaiting review with assignee and age
- Carried over items from previous sprint
- Quick summary stats (completion %, bugs vs features ratio)

### 3. Weekly Report Generator
**Description**: One-click generation of formatted weekly status reports.

**Output Includes**:
- Issues completed this week with links
- PRs merged with brief descriptions
- Work in progress with expected completion
- Blockers and dependencies
- Copy-to-clipboard or email-ready format

### 4. Time-based Views
**Description**: Quickly switch between different time horizons.

**Views Available**:
- **Today**: What's happening right now
- **This Week**: Weekly accomplishments and progress
- **This Sprint**: Current sprint status and velocity
- **This Month**: Longer-term trends and major deliveries

## Key Workflows

### 1. Individual Engineer Review (5-10 minutes per engineer)
**Use Case**: 1:1 meetings, performance check-ins, career development discussions

**Steps**:
1. Select specific engineer from team view
2. Choose timeframe (This Week, Last Month, This Quarter)
3. Review their completed Linear issues and merged PRs
4. See breakdown of work types (features vs bugs vs tech debt)
5. Identify patterns in their contributions
6. Export summary for 1:1 notes or performance review

**Key Information Displayed**:
- Issues completed with complexity/story points
- PRs merged with size and review metrics
- Types of work distribution
- Major features or projects contributed to
- Collaboration patterns (PRs reviewed for others)

### 2. Team Accomplishment Summary (10-15 minutes)
**Use Case**: Monthly all-hands, quarterly reviews, stakeholder updates

**Steps**:
1. Select time period (Last Sprint, Last Month, Last Quarter)
2. System aggregates all team accomplishments
3. Review major features shipped with descriptions
4. See key metrics (velocity, bug fix rate, feature delivery)
5. Edit/customize the generated summary
6. Export as formatted report or presentation slides

**Key Information Included**:
- Major features/projects completed with impact
- Total issues resolved by category
- Key technical improvements or debt reduction
- Team velocity trends
- Notable bug fixes or reliability improvements
- Customer-facing vs internal work breakdown

## Success Metrics

- **Time saved**: 2+ hours per week per manager
- **Report generation**: <10 seconds for weekly reports
- **Daily usage**: Managers check dashboard at least once per day
- **Standup efficiency**: 25% reduction in standup duration

## Requirements

### Must Have
- Manually triggered sync with Linear and GitHub
- Automatic correlation of PRs to Linear issues
- One-click report generation
- Mobile-friendly interface
- OAuth authentication with both services

### Nice to Have
- Slack notifications for blocked items
- Historical trend analysis
- Custom report templates
- Team comparison views

## Out of Scope

- Individual performance evaluation
- Time tracking or estimation
- Code quality analysis
- Integration with other tools (Jira, Asana, Coda)
- Custom workflows or automation

## Success Criteria

The product succeeds when:
1. Engineering Managers can easily write biweekly newsletters and quarterly readouts about the recent work of the team
2. Managers can answer "what has Engineer X been working on?" easily for check-ins and performance reviews

## Appendix: Example Mockups

### Dashboard Home
```
┌─────────────────────────────────────────┐
│  Engineering Activity    [This Week ▼]  │
├─────────────────────────────────────────┤
│                                         │
│  📊 Team Summary                        │
│  ├─ 12 Issues Completed                 │
│  ├─ 24 PRs Merged                      │
│  └─ 3 Projects Active                  │
│                                         │
│  👥 Top Contributors                    │
│  ├─ Alice: 5 issues, 8 PRs            │
│  ├─ Bob: 3 issues, 6 PRs              │
│  └─ Carol: 4 issues, 10 PRs           │
│                                         │
│  [View Timeline] [Generate Report]      │
└─────────────────────────────────────────┘
```

### Engineer View
```
┌─────────────────────────────────────────┐
│  Alice Chen          [This Sprint ▼]   │
├─────────────────────────────────────────┤
│  Current Focus                          │
│  ├─ 🟡 [LIN-123] Implement auth flow   │
│  │   └─ PR #456 (In Review)           │
│  └─ 🟢 [LIN-124] Fix navigation bug   │
│      └─ PR #457 (Ready to merge)      │
│                                         │
│  This Week                              │
│  ├─ Completed: 3 issues, 5 PRs        │
│  ├─ Code Reviews: 8                    │
│  └─ Focus: 60% features, 40% bugs     │
│                                         │
│  [Generate Update] [View History]       │
└─────────────────────────────────────────┘
```