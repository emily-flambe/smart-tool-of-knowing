import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectBreakdown } from '../ProjectBreakdown';
import { ProjectSummary } from '../../types';

const mockProjects: ProjectSummary[] = [
  {
    id: '1',
    name: 'Auth System',
    color: '#3b82f6',
    totalPoints: 15,
    issueCount: 3
  },
  {
    id: '2',
    name: 'Performance',
    color: '#10b981',
    totalPoints: 10,
    issueCount: 2
  },
  {
    id: '3',
    name: 'UI/UX',
    color: '#f59e0b',
    totalPoints: 5,
    issueCount: 1
  }
];

describe('ProjectBreakdown', () => {
  it('renders project breakdown header', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    expect(screen.getByText('Project Breakdown')).toBeInTheDocument();
  });

  it('displays all projects with their information', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    expect(screen.getByText('Auth System')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('UI/UX')).toBeInTheDocument();
    
    expect(screen.getByText('15 pts (3 issues)')).toBeInTheDocument();
    expect(screen.getByText('10 pts (2 issues)')).toBeInTheDocument();
    expect(screen.getByText('5 pts (1 issues)')).toBeInTheDocument();
  });

  it('calculates and displays correct percentages', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    expect(screen.getByText('50.0%')).toBeInTheDocument(); // 15/30
    expect(screen.getByText('33.3%')).toBeInTheDocument(); // 10/30
    expect(screen.getByText('16.7%')).toBeInTheDocument(); // 5/30
  });

  it('displays total story points', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('30 story points')).toBeInTheDocument();
  });

  it('handles zero total points correctly', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={0} />);
    
    expect(screen.getAllByText('0.0%')).toHaveLength(3); // One for each project
    expect(screen.getByText('0 story points')).toBeInTheDocument();
  });

  it('shows empty state when no projects', () => {
    render(<ProjectBreakdown projects={[]} totalPoints={0} />);
    
    expect(screen.getByText('No projects in this cycle')).toBeInTheDocument();
    expect(screen.getByText('0 story points')).toBeInTheDocument();
  });

  it('renders project color indicators', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const colorIndicators = container.querySelectorAll('[style*="background-color"]');
    expect(colorIndicators.length).toBeGreaterThan(0);
    
    // Check that elements exist with color styles (colors are converted to RGB)
    expect(container.innerHTML).toContain('rgb(59, 130, 246)');
    expect(container.innerHTML).toContain('rgb(16, 185, 129)');
    expect(container.innerHTML).toContain('rgb(245, 158, 11)');
  });

  it('renders progress bars with correct widths', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const progressBars = container.querySelectorAll('[style*="width"]');
    expect(progressBars.length).toBeGreaterThan(0);
    
    // Check that percentages are calculated and displayed
    expect(container.innerHTML).toContain('50%');
    expect(container.innerHTML).toContain('33.3%');
    expect(container.innerHTML).toContain('16.7%');
  });

  it('applies correct styling classes', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    // Check main container styling
    expect(container.querySelector('.bg-white.rounded-lg.shadow-sm.border-gray-200.p-6')).toBeInTheDocument();
    
    // Check progress bar container
    expect(container.querySelector('.w-full.bg-gray-200.rounded-full.h-2')).toBeInTheDocument();
    
    // Check total section border
    expect(container.querySelector('.border-t.border-gray-100')).toBeInTheDocument();
  });

  it('handles single project correctly', () => {
    const singleProject = [mockProjects[0]];
    render(<ProjectBreakdown projects={singleProject} totalPoints={15} />);
    
    expect(screen.getByText('Auth System')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('15 story points')).toBeInTheDocument();
  });

  it('displays project names with proper typography', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const projectNames = screen.getAllByText(/Auth System|Performance|UI\/UX/);
    projectNames.forEach(name => {
      expect(name).toHaveClass('text-sm', 'font-medium', 'text-gray-900');
    });
  });

  it('formats points and issues with proper styling', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const pointsInfo = screen.getByText('15 pts (3 issues)');
    expect(pointsInfo).toHaveClass('text-sm', 'text-gray-600');
  });

  it('shows percentages with proper alignment', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const percentages = container.querySelectorAll('.text-xs.text-gray-500.text-right');
    expect(percentages).toHaveLength(3);
  });

  it('handles projects with zero points', () => {
    const projectsWithZero = [
      ...mockProjects,
      {
        id: '4',
        name: 'Empty Project',
        color: '#6b7280',
        totalPoints: 0,
        issueCount: 0
      }
    ];
    
    render(<ProjectBreakdown projects={projectsWithZero} totalPoints={30} />);
    
    expect(screen.getByText('Empty Project')).toBeInTheDocument();
    expect(screen.getByText('0 pts (0 issues)')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('maintains proper spacing between project items', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const projectContainer = container.querySelector('.space-y-4');
    expect(projectContainer).toBeInTheDocument();
  });

  it('renders progress bars with smooth transitions', () => {
    const { container } = render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const progressBars = container.querySelectorAll('.transition-all.duration-300');
    expect(progressBars).toHaveLength(3);
  });

  it('handles very small percentages with proper precision', () => {
    const smallProject = [{
      id: '1',
      name: 'Small Project',
      color: '#3b82f6',
      totalPoints: 1,
      issueCount: 1
    }];
    
    render(<ProjectBreakdown projects={smallProject} totalPoints={1000} />);
    
    expect(screen.getByText('0.1%')).toBeInTheDocument();
  });

  it('displays total section with proper styling', () => {
    render(<ProjectBreakdown projects={mockProjects} totalPoints={30} />);
    
    const totalLabel = screen.getByText('Total');
    expect(totalLabel).toHaveClass('text-sm', 'font-medium', 'text-gray-900');
    
    const totalPoints = screen.getByText('30 story points');
    expect(totalPoints).toHaveClass('text-sm', 'text-gray-600');
  });

  it('handles decimal story points correctly', () => {
    const decimalProjects = [{
      id: '1',
      name: 'Decimal Project',
      color: '#3b82f6',
      totalPoints: 7.5,
      issueCount: 2
    }];
    
    render(<ProjectBreakdown projects={decimalProjects} totalPoints={7.5} />);
    
    expect(screen.getByText('7.5 pts (2 issues)')).toBeInTheDocument();
    expect(screen.getByText('7.5 story points')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });
});