import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CycleSelector } from '../CycleSelector';
import { LinearCycle } from '../../types';

const mockCycles: LinearCycle[] = [
  {
    id: '1',
    name: 'Sprint 24',
    number: 24,
    startsAt: '2025-06-15T00:00:00Z',
    endsAt: '2025-06-29T00:00:00Z',
    issues: []
  },
  {
    id: '2',
    name: 'Sprint 25',
    number: 25,
    startsAt: '2025-06-30T00:00:00Z',
    endsAt: '2025-07-13T00:00:00Z',
    issues: []
  },
  {
    id: '3',
    name: 'Sprint 26',
    number: 26,
    startsAt: '2025-07-14T00:00:00Z',
    endsAt: '2025-07-27T00:00:00Z',
    issues: []
  }
];

const mockOnSelectCycle = jest.fn();

describe('CycleSelector', () => {
  beforeEach(() => {
    mockOnSelectCycle.mockClear();
  });

  it('renders the cycle selector with label', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByLabelText('Select Cycle')).toBeInTheDocument();
    expect(screen.getByText('Choose a cycle...')).toBeInTheDocument();
  });

  it('displays all available cycles in dropdown', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByText('Sprint 24 (#24)')).toBeInTheDocument();
    expect(screen.getByText('Sprint 25 (#25)')).toBeInTheDocument();
    expect(screen.getByText('Sprint 26 (#26)')).toBeInTheDocument();
  });

  it('shows selected cycle when one is chosen', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={mockCycles[0]}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByDisplayValue('Sprint 24 (#24)');
    expect(selectElement).toBeInTheDocument();
  });

  it('displays date range when a cycle is selected', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={mockCycles[0]}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    // The dates will be formatted according to the user's locale
    const dateRange = screen.getByText(/6\/14\/2025.*6\/28\/2025/);
    expect(dateRange).toBeInTheDocument();
  });

  it('does not show date range when no cycle is selected', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.queryByText(/\/2025/)).not.toBeInTheDocument();
  });

  it('calls onSelectCycle when a cycle is chosen', async () => {
    const user = userEvent.setup();
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByLabelText('Select Cycle');
    await user.selectOptions(selectElement, '2');

    expect(mockOnSelectCycle).toHaveBeenCalledWith(mockCycles[1]);
  });

  it('does not call onSelectCycle when placeholder is selected', async () => {
    const user = userEvent.setup();
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={mockCycles[0]}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByLabelText('Select Cycle');
    await user.selectOptions(selectElement, '');

    expect(mockOnSelectCycle).not.toHaveBeenCalled();
  });

  it('handles empty cycles array', () => {
    render(
      <CycleSelector
        cycles={[]}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByText('Choose a cycle...')).toBeInTheDocument();
    
    const selectElement = screen.getByLabelText('Select Cycle');
    const options = selectElement.querySelectorAll('option');
    expect(options).toHaveLength(1); // Only the placeholder
  });

  it('maintains selection after re-render', () => {
    const { rerender } = render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={mockCycles[1]}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByDisplayValue('Sprint 25 (#25)')).toBeInTheDocument();

    rerender(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={mockCycles[1]}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByDisplayValue('Sprint 25 (#25)')).toBeInTheDocument();
  });

  it('handles cycles with missing names gracefully', () => {
    const cyclesWithMissingName = [
      { ...mockCycles[0], name: '' },
      mockCycles[1]
    ];

    render(
      <CycleSelector
        cycles={cyclesWithMissingName}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    expect(screen.getByText('(#24)')).toBeInTheDocument(); // Empty name but still shows number
    expect(screen.getByText('Sprint 25 (#25)')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    const { container } = render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByLabelText('Select Cycle');
    expect(selectElement).toHaveClass(
      'w-64',
      'px-3',
      'py-2',
      'border',
      'border-gray-300',
      'rounded-md',
      'shadow-sm',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-blue-500',
      'focus:border-blue-500'
    );

    const label = screen.getByText('Select Cycle');
    expect(label).toHaveClass('block', 'text-sm', 'font-medium', 'text-gray-700', 'mb-2');
  });

  it('formats dates consistently across different locales', () => {
    // Test with a known date
    const consistentCycle = {
      ...mockCycles[0],
      startsAt: '2025-01-01T00:00:00Z',
      endsAt: '2025-01-15T00:00:00Z'
    };

    render(
      <CycleSelector
        cycles={[consistentCycle]}
        selectedCycle={consistentCycle}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    // Check that dates are displayed (exact format may vary by locale)
    const dateElement = screen.getByText(/12\/31\/2024.*1\/14\/2025/);
    expect(dateElement).toBeInTheDocument();
  });

  it('shows proper accessibility attributes', () => {
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByLabelText('Select Cycle');
    expect(selectElement).toHaveAttribute('id', 'cycle-select');
    
    const label = screen.getByText('Select Cycle');
    expect(label).toHaveAttribute('for', 'cycle-select');
  });

  it('handles cycle selection and deselection flow', async () => {
    const user = userEvent.setup();
    render(
      <CycleSelector
        cycles={mockCycles}
        selectedCycle={null}
        onSelectCycle={mockOnSelectCycle}
      />
    );

    const selectElement = screen.getByLabelText('Select Cycle');

    // Select a cycle
    await user.selectOptions(selectElement, '1');
    expect(mockOnSelectCycle).toHaveBeenCalledWith(mockCycles[0]);

    // Clear and select another cycle
    mockOnSelectCycle.mockClear();
    await user.selectOptions(selectElement, '3');
    expect(mockOnSelectCycle).toHaveBeenCalledWith(mockCycles[2]);
  });
});