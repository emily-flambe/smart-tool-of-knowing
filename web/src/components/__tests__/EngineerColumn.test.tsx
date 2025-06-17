import React from 'react';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { TestBackend } from 'react-dnd-test-backend';
import { EngineerColumn } from '../EngineerColumn';
import { TeamMember, LinearIssue } from '../../types';

const mockEngineer: TeamMember = {
  id: '1',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  avatarUrl: 'https://example.com/avatar.jpg'
};

const mockIssues: LinearIssue[] = [
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
  },
  {
    id: '2',
    identifier: 'ENG-124',
    title: 'Add password reset',
    priority: 3,
    url: 'https://linear.app/team/issue/ENG-124',
    estimate: 3,
    state: { id: '1', name: 'To Do', type: 'unstarted' },
    project: { id: '1', name: 'Auth System', color: '#3b82f6' },
    labels: []
  }
];

const mockOnDropTicket = jest.fn();

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={TestBackend}>
      {component}
    </DndProvider>
  );
};

describe('EngineerColumn', () => {
  beforeEach(() => {
    mockOnDropTicket.mockClear();
  });

  it('renders engineer information correctly', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // Initial
  });

  it('calculates and displays total story points correctly', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('8 story points')).toBeInTheDocument(); // 5 + 3
  });

  it('displays correct load color based on story points', () => {
    // Test low load (blue)
    const lowLoadIssues = [{ ...mockIssues[0], estimate: 3 }];
    const { rerender } = renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={lowLoadIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    let pointsElement = screen.getByText('3 story points');
    expect(pointsElement).toHaveClass('text-blue-600');

    // Test medium load (gray)
    const mediumLoadIssues = [{ ...mockIssues[0], estimate: 8 }];
    rerender(
      <DndProvider backend={TestBackend}>
        <EngineerColumn
          engineer={mockEngineer}
          issues={mediumLoadIssues}
          onDropTicket={mockOnDropTicket}
        />
      </DndProvider>
    );

    pointsElement = screen.getByText('8 story points');
    expect(pointsElement).toHaveClass('text-gray-800');

    // Test high load (red)
    const highLoadIssues = [{ ...mockIssues[0], estimate: 15 }];
    rerender(
      <DndProvider backend={TestBackend}>
        <EngineerColumn
          engineer={mockEngineer}
          issues={highLoadIssues}
          onDropTicket={mockOnDropTicket}
        />
      </DndProvider>
    );

    pointsElement = screen.getByText('15 story points');
    expect(pointsElement).toHaveClass('text-red-600');
  });

  it('renders all assigned tickets', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('ENG-123')).toBeInTheDocument();
    expect(screen.getByText('ENG-124')).toBeInTheDocument();
    expect(screen.getByText('Implement authentication')).toBeInTheDocument();
    expect(screen.getByText('Add password reset')).toBeInTheDocument();
  });

  it('shows empty state when no tickets are assigned', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={[]}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('Drop tickets here')).toBeInTheDocument();
    expect(screen.getByText('0 story points')).toBeInTheDocument();
  });

  it('handles tickets without estimates correctly', () => {
    const issuesWithoutEstimates = mockIssues.map(issue => ({ ...issue, estimate: undefined }));
    
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={issuesWithoutEstimates}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('0 story points')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    const { container } = renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    // Check for column width constraints
    expect(container.querySelector('.min-w-80.max-w-80')).toBeInTheDocument();
    
    // Check for white background and border
    expect(container.querySelector('.bg-white.rounded-lg.shadow-sm.border-gray-200')).toBeInTheDocument();
    
    // Check for minimum height in drop area
    expect(container.querySelector('.min-h-96')).toBeInTheDocument();
  });

  it('displays engineer avatar with correct initial', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    const avatarElement = screen.getByText('A');
    expect(avatarElement).toHaveClass('w-8', 'h-8', 'bg-gray-300', 'rounded-full');
  });

  it('handles engineer names with multiple words correctly', () => {
    const engineerWithLongName = {
      ...mockEngineer,
      name: 'Mary Jane Watson-Parker'
    };

    renderWithDnd(
      <EngineerColumn
        engineer={engineerWithLongName}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('Mary Jane Watson-Parker')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument(); // First initial
  });

  it('maintains consistent spacing between tickets', () => {
    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    const dropArea = document.querySelector('.space-y-3');
    expect(dropArea).toBeInTheDocument();
  });

  it('has proper drop zone structure for drag and drop', () => {
    const { container } = renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mockIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    // The drop zone should be in the ticket area
    const dropZone = container.querySelector('.min-h-96.p-4');
    expect(dropZone).toBeInTheDocument();
  });

  it('calculates points correctly with mixed estimates', () => {
    const mixedIssues = [
      { ...mockIssues[0], estimate: 5 },
      { ...mockIssues[1], estimate: undefined }, // Should be treated as 0
      { ...mockIssues[0], id: '3', estimate: 2 }
    ];

    renderWithDnd(
      <EngineerColumn
        engineer={mockEngineer}
        issues={mixedIssues}
        onDropTicket={mockOnDropTicket}
      />
    );

    expect(screen.getByText('7 story points')).toBeInTheDocument(); // 5 + 0 + 2
  });
});