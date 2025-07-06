import React, { useState, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData';
import apiClient from '../services/api';

interface Cycle {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
}

const ReportGenerator: React.FC = () => {
  const [selectedCycle, setSelectedCycle] = useState<string>('');
  const [reportContent, setReportContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const { data: cycles, loading: cyclesLoading, error: cyclesError, refetch: refetchCycles } = useApiData(
    () => apiClient.getLinearCycles()
  );

  useEffect(() => {
    refetchCycles();
  }, []);

  useEffect(() => {
    if (cycles && cycles.length > 0 && !selectedCycle) {
      const currentCycle = cycles.find((cycle: Cycle) => {
        const now = new Date();
        const start = new Date(cycle.startsAt);
        const end = new Date(cycle.endsAt);
        return now >= start && now <= end;
      });
      
      if (currentCycle) {
        setSelectedCycle(currentCycle.id);
      } else {
        setSelectedCycle(cycles[0].id);
      }
    }
  }, [cycles, selectedCycle]);

  const generateReport = async () => {
    if (!selectedCycle) return;

    setIsGenerating(true);
    try {
      const response = await apiClient.generateNewsletter({
        cycleId: selectedCycle,
        format: 'markdown'
      });
      setReportContent(response.content);
    } catch (error) {
      console.error('Error generating report:', error);
      setReportContent('Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading cycles...</div>
      </div>
    );
  }

  if (cyclesError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg">
        Error loading cycles: {cyclesError.message}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Generate Weekly Status Report</h2>
        
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label htmlFor="cycle" className="block text-sm font-medium text-gray-700 mb-2">
              Select Sprint/Cycle
            </label>
            <select
              id="cycle"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cycles?.map((cycle: Cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({new Date(cycle.startsAt).toLocaleDateString()} - {new Date(cycle.endsAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={generateReport}
            disabled={!selectedCycle || isGenerating}
            className={`px-6 py-2 rounded-md transition-colors ${
              isGenerating
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {reportContent && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Generated Report</h3>
            <div className="flex space-x-2">
              <button
                onClick={copyToClipboard}
                className="px-4 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={downloadReport}
                className="px-4 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{reportContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;