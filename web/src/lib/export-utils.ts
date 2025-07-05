import { format } from 'date-fns';
import { ReportData, ReportConfig } from '../types/report';

export function generateMarkdown(data: ReportData, config: ReportConfig): string {
  const lines: string[] = [];
  
  // Title and date range
  lines.push(`# ${data.title || 'Team Activity Report'}`);
  lines.push('');
  lines.push(`**Report Period:** ${format(config.dateRange.start, 'MMM d, yyyy')} - ${format(config.dateRange.end, 'MMM d, yyyy')}`);
  if (data.generatedAt) {
    lines.push(`**Generated:** ${format(new Date(data.generatedAt), 'MMM d, yyyy h:mm a')}`);
  }
  lines.push('');
  
  // Executive Summary
  if (data.summary) {
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(data.summary);
    lines.push('');
  }
  
  // Metrics
  if (data.metrics) {
    lines.push('## Key Metrics');
    lines.push('');
    lines.push(`- **Issues Completed:** ${data.metrics.issuesCompleted}`);
    lines.push(`- **PRs Merged:** ${data.metrics.prsMerged}`);
    lines.push(`- **Story Points:** ${data.metrics.storyPoints}`);
    lines.push(`- **Contributors:** ${data.metrics.contributors}`);
    lines.push('');
  }
  
  // Highlights
  if (data.highlights && data.highlights.length > 0) {
    lines.push('## Key Highlights');
    lines.push('');
    data.highlights.forEach(highlight => {
      lines.push(`- ${highlight}`);
    });
    lines.push('');
  }
  
  // Project Summaries
  if (data.projectSummaries && data.projectSummaries.length > 0) {
    lines.push('## Project Breakdown');
    lines.push('');
    data.projectSummaries.forEach(project => {
      lines.push(`### ${project.name}`);
      lines.push(`- **Completed Issues:** ${project.completedIssues}`);
      if (project.summary) {
        lines.push(`- **Summary:** ${project.summary}`);
      }
      if (project.contributors && project.contributors.length > 0) {
        lines.push(`- **Contributors:** ${project.contributors.join(', ')}`);
      }
      lines.push('');
    });
  }
  
  // Completed Issues
  if (data.completedIssues && data.completedIssues.length > 0) {
    lines.push('## Completed Issues');
    lines.push('');
    lines.push('| Issue | Assignee | Project | PRs |');
    lines.push('|-------|----------|---------|-----|');
    data.completedIssues.forEach(issue => {
      const issueLink = issue.url ? `[${issue.identifier}](${issue.url})` : issue.identifier;
      const prCount = issue.linkedPRs ? issue.linkedPRs.length : 0;
      lines.push(`| ${issueLink} - ${issue.title} | ${issue.assignee} | ${issue.project} | ${prCount} |`);
    });
    lines.push('');
  }
  
  // Action Items
  if (data.actionItems && data.actionItems.length > 0) {
    lines.push('## Action Items');
    lines.push('');
    data.actionItems.forEach(item => {
      lines.push(`- [ ] ${item}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToMarkdown(data: ReportData, config: ReportConfig) {
  const markdown = generateMarkdown(data, config);
  const filename = `report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.md`;
  downloadFile(markdown, filename, 'text/markdown');
}

export function exportToEmail(data: ReportData, config: ReportConfig) {
  // Generate email-friendly HTML
  const subject = encodeURIComponent(data.title || 'Team Activity Report');
  const body = encodeURIComponent(generateMarkdown(data, config));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export function exportToPDF(data: ReportData, config: ReportConfig) {
  // For now, we'll just trigger the browser's print dialog
  // In a production app, you'd use a library like jsPDF or send to a server
  window.print();
}