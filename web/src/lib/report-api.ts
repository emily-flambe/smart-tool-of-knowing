import axios from 'axios';
import { ReportConfig, ReportData } from '../types/report';

const API_BASE_URL = 'http://localhost:3001/api';

export async function generateReport(config: ReportConfig): Promise<ReportData> {
  try {
    // For now, we'll use the existing newsletter endpoint
    // In phase 4, we'll extend this to support date ranges and other config options
    const response = await axios.get(`${API_BASE_URL}/newsletter/generate`);
    
    // Transform the newsletter data to match our ReportData structure
    const newsletterData = response.data;
    
    const reportData: ReportData = {
      title: `Team Activity Report - ${newsletterData.cycle?.name || 'Recent Activity'}`,
      summary: newsletterData.cycleSummary || 'No summary available',
      metrics: {
        issuesCompleted: newsletterData.completedIssues?.length || 0,
        prsMerged: newsletterData.githubStats?.totalPRs || 0,
        storyPoints: newsletterData.completedIssues?.reduce((sum: number, issue: any) => 
          sum + (issue.estimate || 0), 0) || 0,
        contributors: new Set(newsletterData.completedIssues?.map((issue: any) => 
          issue.assignee?.name).filter(Boolean)).size || 0
      },
      highlights: extractHighlights(newsletterData),
      projectSummaries: newsletterData.projectSummaries?.map((project: any) => ({
        name: project.projectName,
        completedIssues: project.issueCount,
        summary: project.summary,
        contributors: project.contributors
      })),
      completedIssues: newsletterData.completedIssues?.map((issue: any) => ({
        identifier: issue.identifier,
        title: issue.title,
        assignee: issue.assignee?.name || 'Unassigned',
        project: issue.project?.name || 'No Project',
        url: issue.url,
        linkedPRs: issue.linkedPRs
      })),
      actionItems: extractActionItems(newsletterData),
      generatedAt: new Date().toISOString()
    };
    
    return reportData;
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error('Failed to generate report. Please ensure the API server is running.');
  }
}

function extractHighlights(data: any): string[] {
  const highlights: string[] = [];
  
  // Extract key accomplishments from the cycle summary
  if (data.cycleSummary) {
    const summaryLines = data.cycleSummary.split('\n').filter((line: string) => line.trim());
    highlights.push(...summaryLines.slice(0, 3)); // Take first 3 lines as highlights
  }
  
  // Add notable issues
  if (data.completedIssues && data.completedIssues.length > 0) {
    const highPriorityIssues = data.completedIssues
      .filter((issue: any) => issue.priority === 1 || issue.priority === 2)
      .slice(0, 2);
    
    highPriorityIssues.forEach((issue: any) => {
      highlights.push(`Completed: ${issue.title}`);
    });
  }
  
  return highlights.slice(0, 5); // Limit to 5 highlights
}

function extractActionItems(data: any): string[] {
  const actionItems: string[] = [];
  
  // Extract action items from project summaries
  if (data.projectSummaries) {
    data.projectSummaries.forEach((project: any) => {
      if (project.summary && project.summary.includes('next')) {
        actionItems.push(`${project.projectName}: Continue ongoing work`);
      }
    });
  }
  
  // Add generic action items based on metrics
  if (data.completedIssues && data.completedIssues.length > 0) {
    const inProgressCount = data.totalIssues - data.completedIssues.length;
    if (inProgressCount > 0) {
      actionItems.push(`Complete ${inProgressCount} remaining issues in the current cycle`);
    }
  }
  
  return actionItems;
}

// Export functions for specific report types (to be implemented)
export async function generateWeeklySummary(startDate: Date, endDate: Date): Promise<ReportData> {
  // TODO: Implement weekly summary generation
  return generateReport({
    dateRange: { start: startDate, end: endDate },
    reportType: 'weekly-summary',
    includeSources: { linear: true, github: true, coda: false }
  });
}

export async function generateSprintReport(cycleId: string): Promise<ReportData> {
  // TODO: Implement sprint report generation
  return generateReport({
    dateRange: { start: new Date(), end: new Date() },
    reportType: 'sprint-report',
    includeSources: { linear: true, github: true, coda: false }
  });
}

export async function exportReport(data: ReportData, format: 'pdf' | 'markdown' | 'email'): Promise<Blob> {
  // TODO: Implement export functionality
  throw new Error('Export functionality not yet implemented');
}