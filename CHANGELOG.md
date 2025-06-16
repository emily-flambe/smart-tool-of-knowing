# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-06-16

### Added
- **Phase 1 Linear Cycle Planning Web UI** - Complete drag-and-drop planning interface
  - Interactive cycle selector with current/recent cycles
  - Drag-and-drop ticket assignment between engineers and statuses
  - Real-time estimate editing with inline input fields
  - Engineer-first and status-first grouping modes
  - Comprehensive filtering by projects, statuses, assignees, and priorities
  - Unplanned backlog panel for future cycle tickets
  - Local changes tracking with detailed commit modal
  - Project and engineer breakdown visualizations with progress bars
  - Engineers × Projects summary table with story point distribution
  - Responsive design with collapsible sections
  - Dark blue color scheme for better visual hierarchy

- **Enhanced Backend API Server** - Full-featured planning state management
  - Planning state persistence with assignment tracking
  - Local changes management with detailed change history
  - Real-time Linear API integration for data fetching
  - Support for assignment, estimate, status, and cycle updates
  - Comprehensive error handling and validation
  - Team member and active engineer management
  - Incremental change tracking and commit functionality

- **Comprehensive Test Suite** - Full coverage for reliability
  - Frontend component tests for all React components
  - Backend API integration tests
  - Linear client functionality tests
  - Core infrastructure and functionality tests

- **Development Tools and Scripts**
  - Automated development startup script (`start-dev.sh`)
  - Makefile for common development tasks
  - Enhanced project documentation

### Changed
- Bumped to major version 1.0.0 to reflect complete UI implementation
- Improved project color handling with dark blue fallback for better visibility
- Enhanced error handling throughout the application
- Updated project structure for better maintainability

### Technical Details
- Built with React, TypeScript, and Tailwind CSS
- Uses React Query for state management and caching
- Implements React DnD for drag-and-drop functionality
- Real-time API integration with Linear GraphQL API
- Responsive design with mobile-friendly components
- Comprehensive type safety throughout the application

## [Unreleased]

### Planned Features
- Bulk operations for multiple ticket updates
- Advanced filtering and search capabilities
- Sprint velocity tracking and capacity planning
- Integration with additional project management tools
- Enhanced reporting and analytics features