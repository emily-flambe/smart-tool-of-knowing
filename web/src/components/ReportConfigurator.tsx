import React from 'react';
import { Calendar, Check } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ReportConfig } from '../types/report';

interface ReportConfiguratorProps {
  config: ReportConfig;
  onChange: (config: ReportConfig) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

const datePresets = [
  { label: 'This Week', value: 'this-week', getDates: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  { label: 'Last Week', value: 'last-week', getDates: () => ({ start: startOfWeek(subDays(new Date(), 7)), end: endOfWeek(subDays(new Date(), 7)) }) },
  { label: 'This Month', value: 'this-month', getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Last Month', value: 'last-month', getDates: () => ({ start: startOfMonth(subDays(new Date(), 30)), end: endOfMonth(subDays(new Date(), 30)) }) },
  { label: 'Last 7 Days', value: 'last-7-days', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 Days', value: 'last-30-days', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
];

const reportTypes = [
  { label: 'Weekly Summary', value: 'weekly-summary', description: 'Overview of completed work and progress' },
  { label: 'Sprint Report', value: 'sprint-report', description: 'Detailed sprint accomplishments and metrics' },
  { label: 'Monthly Review', value: 'monthly-review', description: 'Comprehensive monthly activity report' },
  { label: 'Individual Summary', value: 'individual-summary', description: 'Per-engineer activity breakdown' },
];

const ReportConfigurator: React.FC<ReportConfiguratorProps> = ({
  config,
  onChange,
  onGenerate,
  isLoading
}) => {
  const handleDatePresetChange = (presetValue: string) => {
    const preset = datePresets.find(p => p.value === presetValue);
    if (preset) {
      const dates = preset.getDates();
      onChange({
        ...config,
        dateRange: {
          ...dates,
          preset: presetValue
        }
      });
    }
  };

  const handleReportTypeChange = (reportType: string) => {
    onChange({
      ...config,
      reportType
    });
  };

  const handleSourceToggle = (source: keyof typeof config.includeSources) => {
    onChange({
      ...config,
      includeSources: {
        ...config.includeSources,
        [source]: !config.includeSources[source]
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="space-y-2">
          {datePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleDatePresetChange(preset.value)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                config.dateRange.preset === preset.value
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              } border border-gray-300`}
            >
              <div className="flex items-center justify-between">
                <span>{preset.label}</span>
                {config.dateRange.preset === preset.value && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            </button>
          ))}
        </div>
        {config.dateRange.start && config.dateRange.end && (
          <p className="mt-2 text-xs text-gray-500">
            {format(config.dateRange.start, 'MMM d, yyyy')} - {format(config.dateRange.end, 'MMM d, yyyy')}
          </p>
        )}
      </div>

      {/* Report Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Report Type
        </label>
        <div className="space-y-2">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => handleReportTypeChange(type.value)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                config.reportType === type.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              } border border-gray-300`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </div>
                {config.reportType === type.value && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data Sources */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data Sources
        </label>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.includeSources.linear}
              onChange={() => handleSourceToggle('linear')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Linear Issues</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.includeSources.github}
              onChange={() => handleSourceToggle('github')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">GitHub Activity</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.includeSources.coda}
              onChange={() => handleSourceToggle('coda')}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Coda Documents</span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={isLoading || (!config.includeSources.linear && !config.includeSources.github && !config.includeSources.coda)}
        className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
          isLoading || (!config.includeSources.linear && !config.includeSources.github && !config.includeSources.coda)
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700'
        }`}
      >
        <Calendar className="h-4 w-4 mr-2" />
        {isLoading ? 'Generating...' : 'Generate Report'}
      </button>
    </div>
  );
};

export default ReportConfigurator;