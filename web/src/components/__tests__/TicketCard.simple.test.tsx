import React from 'react';
import { render, screen } from '@testing-library/react';
import { TicketCard } from '../TicketCard';
import { LinearIssue, PRIORITY_LABELS } from '../../types';

// Mock react-dnd hooks
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()]
}));

const mockIssue: LinearIssue = {
  id: '1',
  identifier: 'ENG-123',
  title: 'Implement user authentication flow',
  priority: 2,
  estimate: 5,
  state: { id: '1', name: 'To Do', type: 'unstarted' },
  project: { id: '1', name: 'Auth System', color: '#3b82f6' },
  assignee: { id: '1', name: 'John Doe', email: 'john@example.com' },
  labels: [
    { id: '1', name: 'backend', color: '#10b981' },
    { id: '2', name: 'urgent', color: '#ef4444' }
  ]
};

describe('TicketCard (Simple)', () => {
  it('renders ticket information correctly', () => {
    render(<TicketCard issue={mockIssue} />);
    
    expect(screen.getByText('ENG-123')).toBeInTheDocument();
    expect(screen.getByText('Implement user authentication flow')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // estimate
    expect(screen.getByText('Auth System')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('displays priority indicator with correct color', () => {
    render(<TicketCard issue={mockIssue} />);
    
    const priorityInfo = PRIORITY_LABELS[mockIssue.priority as keyof typeof PRIORITY_LABELS];
    const priorityIndicator = document.querySelector(`.${priorityInfo.color.replace(' ', '.')}`);
    expect(priorityIndicator).toBeInTheDocument();
  });

  it('renders project color indicator', () => {
    const { container } = render(<TicketCard issue={mockIssue} />);
    
    // Colors are converted to RGB format in the DOM
    const projectIndicators = container.querySelectorAll('[style*="rgb(59, 130, 246)"]');
    expect(projectIndicators.length).toBeGreaterThan(0);
  });

  it('handles ticket without estimate', () => {
    const issueWithoutEstimate = { ...mockIssue, estimate: undefined };
    render(<TicketCard issue={issueWithoutEstimate} />);
    
    expect(screen.queryByText('5')).not.toBeInTheDocument();
    expect(screen.getByText('ENG-123')).toBeInTheDocument();
  });

  it('handles ticket without project', () => {
    const issueWithoutProject = { ...mockIssue, project: undefined };
    render(<TicketCard issue={issueWithoutProject} />);
    
    expect(screen.queryByText('Auth System')).not.toBeInTheDocument();
    expect(screen.getByText('ENG-123')).toBeInTheDocument();
  });

  it('displays different priority levels correctly', () => {
    const priorities = [1, 2, 3, 4] as const;
    
    priorities.forEach(priority => {
      const issueWithPriority = { ...mockIssue, priority };
      const { unmount } = render(<TicketCard issue={issueWithPriority} />);
      
      const priorityInfo = PRIORITY_LABELS[priority];
      const priorityIndicator = document.querySelector(`.${priorityInfo.color.replace(' ', '.')}`);
      expect(priorityIndicator).toBeInTheDocument();
      
      unmount();
    });
  });

  it('handles long titles gracefully', () => {
    const longTitleIssue = {
      ...mockIssue,
      title: 'This is a very long title that should be truncated properly when displayed in the ticket card component'
    };
    
    render(<TicketCard issue={longTitleIssue} />);
    
    const titleElement = screen.getByText(longTitleIssue.title);
    expect(titleElement).toHaveClass('line-clamp-2');
  });

  it('renders all required structural elements', () => {
    const { container } = render(<TicketCard issue={mockIssue} />);
    
    // Check for main card structure
    expect(container.querySelector('.bg-white.rounded-lg')).toBeInTheDocument();
    
    // Check for identifier and estimate section
    expect(screen.getByText('ENG-123')).toHaveClass('font-mono');
    
    // Check for title section
    expect(screen.getByText('Implement user authentication flow')).toHaveClass('font-medium');
    
    // Check for bottom section with project and state
    expect(screen.getByText('Auth System')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('displays state with proper capitalization', () => {
    const issueWithLowerState = {
      ...mockIssue,
      state: { id: '1', name: 'in progress', type: 'started' }
    };
    
    render(<TicketCard issue={issueWithLowerState} />);
    
    const stateElement = screen.getByText('in progress');
    expect(stateElement).toHaveClass('capitalize');
  });
});