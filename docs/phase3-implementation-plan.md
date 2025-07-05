# Phase 3: GitHub Integration Implementation Plan

## Overview
Implementing GitHub integration to correlate Linear issues with GitHub PRs for enhanced cycle reviews.

## Key Components
1. Linear attachments API integration
2. GitHub CLI search fallback
3. Enhanced cycle review API
4. Frontend updates for correlated data display

## Implementation Status
- [x] Linear attachments API integration - Added methods to fetch issue attachments
- [x] GitHub CLI search fallback - Implemented pattern matching with confidence scoring
- [x] GitHub PR matching service - Created GitHubIntegrationService with deduplication
- [x] Enhanced cycle review API - Updated endpoints to include PR statistics
- [x] PR statistics integration - Added additions/deletions/files changed to responses
- [x] Comprehensive test coverage - Created tests for all new functionality

## Features Implemented

### 1. Linear Attachments API
- Added `getIssueAttachments()` method to LinearClient
- Added `getIssuesWithAttachments()` for batch processing
- Extract GitHub PR URLs from Linear attachments

### 2. GitHub CLI Search
- Created GitHubCLI utility class for GitHub CLI operations
- Search patterns: title, body, "Fixes/Closes/Resolves", branch names
- Confidence scoring based on match location and type

### 3. GitHubIntegrationService
- Primary: Use Linear attachments (100% confidence)
- Fallback: Use GitHub CLI search (50-95% confidence)
- Deduplication of PRs across search methods
- PR data enrichment with statistics

### 4. API Enhancements
- `/api/cycle-review/:cycleId` - Now includes PR statistics
- `/api/cycle-review/:cycleId/github-data` - Dedicated GitHub data endpoint
- PR stats in response: additions, deletions, files changed
- Confidence scores for PR-issue matches

### 5. Testing
- Unit tests for GitHubIntegrationService
- Mocked Linear and GitHub CLI dependencies
- Coverage for confidence scoring algorithm
- Integration test structure for API endpoints

## Configuration
Required environment variables:
- `GITHUB_TOKEN` - Personal access token for GitHub CLI
- `GITHUB_REPOS` - Comma-separated list of repos to search (optional)

## Usage
1. Ensure GitHub CLI is installed and `GITHUB_TOKEN` is set
2. Linear will automatically create attachments for PRs that reference issues
3. The API will search for additional PRs using GitHub CLI as fallback
4. Cycle reviews now include comprehensive PR statistics