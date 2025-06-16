import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { TestBackend } from 'react-dnd-test-backend';
import { BacklogPanel } from '../BacklogPanel';
import { LinearIssue } from '../../types';

const mockIssues: LinearIssue[] = [
  {
    id: '1',
    identifier: 'ENG-123',
    title: 'Implement user authentication flow',
    priority: 2,
    estimate: 5,
    state: { id: '1', name: 'To Do', type: 'unstarted' },
    project: { id: '1', name: 'Auth System', color: '#3b82f6' },
    labels: []
  },
  {
    id: '2',
    identifier: 'ENG-124',
    title: 'Add password reset functionality',
    priority: 3,
    estimate: 3,
    state: { id: '1', name: 'To Do', type: 'unstarted' },
    project: { id: '1', name: 'Auth System', color: '#3b82f6' },
    labels: []
  },
  {
    id: '3',
    identifier: 'ENG-125',
    title: 'Optimize database queries',
    priority: 1,
    estimate: 8,
    state: { id: '1', name: 'To Do', type: 'unstarted' },
    project: { id: '2', name: 'Performance', color: '#10b981' },
    labels: []
  },
  {
    id: '4',
    identifier: 'UI-101',
    title: 'Fix responsive design issues',
    priority: 2,
    estimate: 2,
    state: { id: '1', name: 'To Do', type: 'unstarted' },
    project: { id: '3', name: 'UI/UX', color: '#f59e0b' },
    labels: []
  }
];

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={TestBackend}>
      {component}
    </DndProvider>
  );
};

describe('BacklogPanel', () => {
  it('renders all issues initially', () => {
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    expect(screen.getByText('ENG-123')).toBeInTheDocument();
    expect(screen.getByText('ENG-124')).toBeInTheDocument();
    expect(screen.getByText('ENG-125')).toBeInTheDocument();
    expect(screen.getByText('UI-101')).toBeInTheDocument();
    expect(screen.getByText('4 tickets')).toBeInTheDocument();
  });

  it('displays backlog header and controls', () => {
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tickets...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Projects')).toBeInTheDocument();
  });

  it('filters issues by search term in title', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'authentication');

    expect(screen.getByText('ENG-123')).toBeInTheDocument();
    expect(screen.queryByText('ENG-124')).not.toBeInTheDocument();
    expect(screen.queryByText('ENG-125')).not.toBeInTheDocument();
    expect(screen.getByText('1 tickets')).toBeInTheDocument();
  });

  it('filters issues by search term in identifier', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'UI-101');

    expect(screen.getByText('UI-101')).toBeInTheDocument();
    expect(screen.queryByText('ENG-123')).not.toBeInTheDocument();
    expect(screen.getByText('1 tickets')).toBeInTheDocument();
  });

  it('search is case insensitive', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'DATABASE');

    expect(screen.getByText('ENG-125')).toBeInTheDocument();
    expect(screen.getByText('1 tickets')).toBeInTheDocument();
  });

  it('filters issues by project selection', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const projectSelect = screen.getByDisplayValue('All Projects');
    await user.selectOptions(projectSelect, 'Auth System');

    expect(screen.getByText('ENG-123')).toBeInTheDocument();
    expect(screen.getByText('ENG-124')).toBeInTheDocument();
    expect(screen.queryByText('ENG-125')).not.toBeInTheDocument();
    expect(screen.queryByText('UI-101')).not.toBeInTheDocument();
    expect(screen.getByText('2 tickets')).toBeInTheDocument();
  });

  it('combines search and project filters', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    const projectSelect = screen.getByDisplayValue('All Projects');

    await user.type(searchInput, 'password');
    await user.selectOptions(projectSelect, 'Auth System');

    expect(screen.getByText('ENG-124')).toBeInTheDocument();
    expect(screen.queryByText('ENG-123')).not.toBeInTheDocument();
    expect(screen.getByText('1 tickets')).toBeInTheDocument();
  });

  it('shows "No tickets found" when filters return no results', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('No tickets found')).toBeInTheDocument();
    expect(screen.getByText('0 tickets')).toBeInTheDocument();
  });

  it('populates project dropdown with unique projects', () => {
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const projectSelect = screen.getByDisplayValue('All Projects');
    
    // Check that all unique projects are in the dropdown
    expect(screen.getByText('Auth System')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('UI/UX')).toBeInTheDocument();
  });

  it('clears search when input is emptied', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    
    // Type search term
    await user.type(searchInput, 'authentication');
    expect(screen.getByText('1 tickets')).toBeInTheDocument();
    
    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText('4 tickets')).toBeInTheDocument();
  });

  it('resets to all projects when "All Projects" is selected', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const projectSelect = screen.getByDisplayValue('All Projects');
    
    // Select specific project
    await user.selectOptions(projectSelect, 'Auth System');
    expect(screen.getByText('2 tickets')).toBeInTheDocument();
    
    // Reset to all projects
    await user.selectOptions(projectSelect, '');
    expect(screen.getByText('4 tickets')).toBeInTheDocument();
  });

  it('handles empty issues array', () => {
    renderWithDnd(<BacklogPanel issues={[]} />);

    expect(screen.getByText('No tickets found')).toBeInTheDocument();
    expect(screen.getByText('0 tickets')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Projects')).toBeInTheDocument();
  });

  it('handles issues without projects', () => {
    const issuesWithoutProjects = mockIssues.map(issue => ({ ...issue, project: undefined }));
    renderWithDnd(<BacklogPanel issues={issuesWithoutProjects} />);

    expect(screen.getByText('4 tickets')).toBeInTheDocument();
    
    // Project dropdown should only have "All Projects" option
    const projectSelect = screen.getByDisplayValue('All Projects');
    const options = projectSelect.querySelectorAll('option');
    expect(options).toHaveLength(1); // Only "All Projects"
  });

  it('has proper scrollable container for many tickets', () => {
    const { container } = renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const scrollableArea = container.querySelector('.max-h-96.overflow-y-auto');
    expect(scrollableArea).toBeInTheDocument();
  });

  it('maintains proper spacing between tickets', () => {
    const { container } = renderWithDnd(<BacklogPanel issues={mockIssues} />);

    const ticketContainer = container.querySelector('.space-y-3');
    expect(ticketContainer).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = renderWithDnd(<BacklogPanel issues={mockIssues} />);

    // Check for panel width and styling
    expect(container.querySelector('.w-80.bg-white.rounded-lg.shadow-sm.border-gray-200')).toBeInTheDocument();
    
    // Check for header border
    expect(container.querySelector('.border-b.border-gray-100')).toBeInTheDocument();
  });

  it('shows correct ticket count after filtering', async () => {
    const user = userEvent.setup();
    renderWithDnd(<BacklogPanel issues={mockIssues} />);

    // Initial count
    expect(screen.getByText('4 tickets')).toBeInTheDocument();

    // Filter and check count updates
    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'ENG');

    expect(screen.getByText('3 tickets')).toBeInTheDocument(); // ENG-123, ENG-124, ENG-125
  });

  it('sorts projects alphabetically in dropdown', () => {
    const unsortedIssues = [
      { ...mockIssues[0], project: { id: '1', name: 'Zebra Project', color: '#000000' } },
      { ...mockIssues[1], project: { id: '2', name: 'Alpha Project', color: '#111111' } },
      { ...mockIssues[2], project: { id: '3', name: 'Beta Project', color: '#222222' } }
    ];

    renderWithDnd(<BacklogPanel issues={unsortedIssues} />);

    const projectSelect = screen.getByDisplayValue('All Projects');
    const options = Array.from(projectSelect.querySelectorAll('option')).slice(1); // Skip "All Projects"
    const projectNames = options.map(option => option.textContent);

    expect(projectNames).toEqual(['Alpha Project', 'Beta Project', 'Zebra Project']);
  });
});