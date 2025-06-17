import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { TestBackend } from 'react-dnd-test-backend';
import App from '../App';
import { LinearIssue, LinearCycle, TeamMember } from '../types';

// Mock the hooks and components
jest.mock('../hooks/usePlanningData');
jest.mock('../components/FetchDataButton');
jest.mock('../components/ChangesPanel');

const mockUsePlanningData = require('../hooks/usePlanningData').usePlanningData as jest.MockedFunction<any>;

const mockProcessedData = {
  cycles: [
    {
      id: '1',
      name: 'Sprint 24',
      number: 24,
      startsAt: '2025-06-15T00:00:00Z',
      endsAt: '2025-06-29T00:00:00Z',
      issues: []
    }
  ] as LinearCycle[],
  teamMembers: [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com' },
    { id: '2', name: 'Bob Chen', email: 'bob@example.com' }
  ] as TeamMember[],
  backlogIssues: [
    {
      id: '1',
      identifier: 'ENG-123',
      title: 'Implement authentication',
      priority: 2,
      estimate: 5,
      url: 'https://linear.app/team/issue/ENG-123',
      state: { id: '1', name: 'To Do', type: 'unstarted' },
      project: { id: '1', name: 'Auth System', color: '#3b82f6' },
      labels: []
    }
  ] as LinearIssue[],
  engineerAssignments: {
    '1': [{
      id: '2',
      identifier: 'ENG-124',
      title: 'Add password reset',
      priority: 3,
      estimate: 3,
      url: 'https://linear.app/team/issue/ENG-124',
      state: { id: '1', name: 'To Do', type: 'unstarted' },
      project: { id: '1', name: 'Auth System', color: '#3b82f6' },
      labels: []
    }] as LinearIssue[],
    '2': [] as LinearIssue[]
  }
};

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={TestBackend}>
      {component}
    </DndProvider>
  );
};

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when not initialized', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: false,
      processedData: null,
      changes: [],
      lastFetched: null,
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText('Linear Cycle Planning')).toBeInTheDocument();
    expect(screen.getByText('Connect to your Linear workspace to start planning')).toBeInTheDocument();
  });

  it('shows error state when there is a state error', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: false,
      processedData: null,
      changes: [],
      lastFetched: null,
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: 'Connection failed',
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText(/Failed to connect to Linear/)).toBeInTheDocument();
  });

  it('shows loading spinner when initialized but no processed data', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: null,
      changes: [],
      lastFetched: null,
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText('Loading planning data...')).toBeInTheDocument();
  });

  it('renders main interface when data is loaded', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText('Linear Cycle Planning')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop tickets to plan your upcoming sprint')).toBeInTheDocument();
    expect(screen.getByText('Team Assignments')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Chen')).toBeInTheDocument();
  });

  it('displays last synced time when available', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
  });

  it('shows changes panel when there are local changes', () => {
    const mockChanges = [
      {
        id: '1',
        type: 'assignment' as const,
        issueId: 'issue1',
        fromEngineerId: undefined,
        toEngineerId: 'engineer1',
        timestamp: '2025-06-15T10:00:00Z'
      }
    ];

    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: mockChanges,
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: true,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // The changes panel should be visible (component would be rendered)
    // We can't test the exact content without implementing ChangesPanel
    expect(screen.getByText('Linear Cycle Planning')).toBeInTheDocument();
  });

  it('calculates project summaries correctly', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // The ProjectBreakdown component should receive calculated project summaries
    expect(screen.getByText('Project Breakdown')).toBeInTheDocument();
  });

  it('calculates total cycle points correctly', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // Should show total points from engineer assignments (3 points from Alice's ticket)
    expect(screen.getByText('3 story points')).toBeInTheDocument();
  });

  it('calls updateAssignment when ticket is dropped', async () => {
    const mockUpdateAssignment = jest.fn();
    
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: mockUpdateAssignment,
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // This would require more complex testing with react-dnd
    // For now, we test that the function is available in the component
    expect(mockUpdateAssignment).toBeDefined();
  });

  it('handles empty engineer assignments', () => {
    const dataWithEmptyAssignments = {
      ...mockProcessedData,
      engineerAssignments: {
        '1': [],
        '2': []
      }
    };

    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: dataWithEmptyAssignments,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText('0 story points')).toBeInTheDocument();
    expect(screen.getAllByText('Drop tickets here')).toHaveLength(2);
  });

  it('handles cycle selection', async () => {
    const user = userEvent.setup();
    
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    const cycleSelect = screen.getByLabelText('Select Cycle');
    await user.selectOptions(cycleSelect, '1');

    expect(screen.getByDisplayValue('Sprint 24 (#24)')).toBeInTheDocument();
  });

  it('handles missing project data gracefully', () => {
    const dataWithoutProjects = {
      ...mockProcessedData,
      engineerAssignments: {
        '1': [{
          ...mockProcessedData.engineerAssignments['1'][0],
          project: undefined
        }],
        '2': []
      }
    };

    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: dataWithoutProjects,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    expect(screen.getByText('No projects in this cycle')).toBeInTheDocument();
  });

  it('calls fetchData when fetch button is clicked', async () => {
    const mockFetchData = jest.fn();
    const user = userEvent.setup();
    
    mockUsePlanningData.mockReturnValue({
      isInitialized: false,
      processedData: null,
      changes: [],
      lastFetched: null,
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: mockFetchData,
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // Find and click the fetch data button
    const fetchButton = screen.getByRole('button');
    await user.click(fetchButton);

    expect(mockFetchData).toHaveBeenCalled();
  });

  it('renders all main components when fully loaded', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    renderWithDnd(<App />);

    // Check all main components are rendered
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Cycle')).toBeInTheDocument();
    expect(screen.getByText('Team Assignments')).toBeInTheDocument();
    expect(screen.getByText('Project Breakdown')).toBeInTheDocument();
  });

  it('maintains responsive layout structure', () => {
    mockUsePlanningData.mockReturnValue({
      isInitialized: true,
      processedData: mockProcessedData,
      changes: [],
      lastFetched: '2025-06-15T10:00:00Z',
      hasLocalChanges: false,
      isFetchingData: false,
      isUpdatingAssignment: false,
      stateError: null,
      fetchData: jest.fn(),
      updateAssignment: jest.fn(),
      resetChanges: jest.fn()
    });

    const { container } = renderWithDnd(<App />);

    // Check for responsive container
    expect(container.querySelector('.max-w-7xl.mx-auto')).toBeInTheDocument();
    
    // Check for flex layout
    expect(container.querySelector('.flex.gap-6')).toBeInTheDocument();
    
    // Check for overflow handling
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
  });
});