import React from 'react';

export type Timeframe = 'today' | 'week' | 'sprint' | 'month';

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({ selected, onChange }) => {
  const timeframes: { value: Timeframe; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'sprint', label: 'This Sprint' },
    { value: 'month', label: 'This Month' },
  ];

  return (
    <div className="inline-flex rounded-lg shadow-sm" role="group">
      {timeframes.map((timeframe, index) => (
        <button
          key={timeframe.value}
          type="button"
          onClick={() => onChange(timeframe.value)}
          className={`
            px-4 py-2 text-sm font-medium transition-colors
            ${index === 0 ? 'rounded-l-lg' : ''}
            ${index === timeframes.length - 1 ? 'rounded-r-lg' : ''}
            ${selected === timeframe.value
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }
            ${index > 0 && selected !== timeframe.value && selected !== timeframes[index - 1].value ? 'border-l-0' : ''}
          `}
        >
          {timeframe.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;