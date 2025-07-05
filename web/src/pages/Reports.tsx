import React, { useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { startOfWeek, endOfWeek } from 'date-fns';
import ReportConfigurator from '../components/ReportConfigurator';
import ReportPreview from '../components/ReportPreview';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorAlert from '../components/ErrorAlert';
import { generateReport } from '../lib/report-api';
import { exportToMarkdown, exportToEmail, exportToPDF } from '../lib/export-utils';
import { ReportData, ReportConfig } from '../types/report';
import '../styles/print.css';

const Reports: React.FC = () => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    dateRange: {
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date()),
      preset: 'this-week'
    },
    reportType: 'weekly-summary',
    includeSources: {
      linear: true,
      github: true,
      coda: false
    }
  });

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await generateReport(reportConfig);
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      console.error('Report generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (format: 'pdf' | 'markdown' | 'email') => {
    if (!reportData) return;
    
    try {
      switch (format) {
        case 'markdown':
          exportToMarkdown(reportData, reportConfig);
          break;
        case 'email':
          exportToEmail(reportData, reportConfig);
          break;
        case 'pdf':
          exportToPDF(reportData, reportConfig);
          break;
        default:
          console.error(`Unknown export format: ${format}`);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      setError(`Failed to export report as ${format}`);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Report Generator
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Generate comprehensive team activity reports from Linear, GitHub, and Coda data
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 no-print">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Report Configuration
              </h3>
              <ReportConfigurator
                config={reportConfig}
                onChange={setReportConfig}
                onGenerate={handleGenerateReport}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Report Preview
                </h3>
                {reportData && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleGenerateReport}
                      disabled={isLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <div className="border-l border-gray-300 mx-2"></div>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleExport('markdown')}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Markdown
                    </button>
                    <button
                      onClick={() => handleExport('email')}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Email
                    </button>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mb-4">
                  <ErrorAlert 
                    title="Error generating report"
                    message={error}
                    onDismiss={() => setError(null)}
                  />
                </div>
              )}

              {isLoading && (
                <LoadingSpinner message="Generating report..." />
              )}

              {!isLoading && !error && !reportData && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No report generated</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Configure your report settings and click Generate Report to get started.
                  </p>
                </div>
              )}

              {reportData && !isLoading && (
                <ReportPreview data={reportData} config={reportConfig} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;