import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import inquirer from 'inquirer';
import { LinearClient } from '../linear-client.js';
import { configManager } from '../config.js';
import { LinearIssue } from '../types.js';

export function createPlanningCommand(): Command {
  const command = new Command('planning');
  
  command
    .description('Planning overview with workload and project distribution')
    .option('--cycle-id <id>', 'Specific cycle ID to analyze')
    .option('--team-id <id>', 'Specific team ID to analyze')
    .option('--show-unestimated', 'Include issues without story point estimates')
    .action(async (options) => {
      const config = configManager.getConfig();
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team config setup` first.'));
        return;
      }

      const spinner = ora('Fetching planning data...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        let issues: LinearIssue[] = [];
        let contextTitle = '';

        if (options.cycleId) {
          issues = await client.getIssuesInCycle(options.cycleId);
          contextTitle = 'Cycle';
        } else if (options.teamId) {
          issues = await client.getIssuesForTeam(options.teamId, 100);
          contextTitle = 'Team';
        } else {
          // Let user choose from recent cycles
          const cycles = await client.getRecentCycles(3);
          if (cycles.length === 0) {
            spinner.stop();
            console.log(chalk.yellow('📭 No cycles found in the past 3 months.'));
            return;
          }

          spinner.stop();
          
          const cycleChoices = cycles.map(cycle => {
            const startDate = new Date(cycle.startsAt).toLocaleDateString();
            const endDate = new Date(cycle.endsAt).toLocaleDateString();
            
            let statusDisplay;
            switch (cycle.status) {
              case 'active':
                statusDisplay = chalk.green('[Active]');
                break;
              case 'future':
                statusDisplay = chalk.blue('[Future]');
                break;
              case 'completed':
              default:
                statusDisplay = chalk.gray('[Completed]');
                break;
            }
            
            const name = `${cycle.team.name} - ${cycle.name} ${statusDisplay} (${startDate} - ${endDate})`;
            return {
              name,
              value: cycle.id
            };
          });

          const { selectedCycle } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedCycle',
              message: 'Select a cycle for planning analysis:',
              choices: cycleChoices,
              pageSize: 15
            }
          ]);

          spinner.start('Fetching cycle issues...');
          issues = await client.getIssuesInCycle(selectedCycle);
          contextTitle = 'Cycle';
        }

        spinner.stop();

        if (issues.length === 0) {
          console.log(chalk.yellow('📭 No issues found.'));
          return;
        }

        // Filter out issues without estimates unless explicitly requested
        const estimatedIssues = options.showUnestimated 
          ? issues 
          : issues.filter(issue => issue.estimate && issue.estimate > 0);

        if (estimatedIssues.length === 0) {
          console.log(chalk.yellow('📭 No issues with story point estimates found.'));
          console.log(chalk.blue('💡 Use --show-unestimated to include all issues.'));
          return;
        }

        console.log(chalk.blue(`📊 Planning Overview - ${contextTitle}`));
        console.log('='.repeat(80));
        console.log();

        // Calculate workload by assignee
        const workloadByAssignee = calculateWorkloadByAssignee(estimatedIssues);
        displayWorkloadTable(workloadByAssignee);

        console.log();

        // Calculate workload by project
        const workloadByProject = calculateWorkloadByProject(estimatedIssues);
        displayProjectTable(workloadByProject);

        console.log();

        // Summary statistics
        displaySummaryStats(estimatedIssues, issues.length);

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error generating planning overview: ${error instanceof Error ? error.message : String(error)}`));
      }
    });

  return command;
}

interface AssigneeWorkload {
  name: string;
  totalPoints: number;
  issueCount: number;
  issues: LinearIssue[];
}

interface ProjectWorkload {
  name: string;
  totalPoints: number;
  issueCount: number;
  percentage: number;
}

function calculateWorkloadByAssignee(issues: LinearIssue[]): AssigneeWorkload[] {
  const workloadMap = new Map<string, AssigneeWorkload>();

  issues.forEach(issue => {
    const assigneeName = issue.assignee?.name || 'Unassigned';
    const points = issue.estimate || 0;

    if (!workloadMap.has(assigneeName)) {
      workloadMap.set(assigneeName, {
        name: assigneeName,
        totalPoints: 0,
        issueCount: 0,
        issues: []
      });
    }

    const workload = workloadMap.get(assigneeName)!;
    workload.totalPoints += points;
    workload.issueCount += 1;
    workload.issues.push(issue);
  });

  return Array.from(workloadMap.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}

function calculateWorkloadByProject(issues: LinearIssue[]): ProjectWorkload[] {
  const projectMap = new Map<string, { totalPoints: number; issueCount: number }>();
  
  issues.forEach(issue => {
    const projectName = issue.project?.name || 'No Project';
    const points = issue.estimate || 0;

    if (!projectMap.has(projectName)) {
      projectMap.set(projectName, { totalPoints: 0, issueCount: 0 });
    }

    const project = projectMap.get(projectName)!;
    project.totalPoints += points;
    project.issueCount += 1;
  });

  const totalPoints = Array.from(projectMap.values()).reduce((sum, project) => sum + project.totalPoints, 0);

  return Array.from(projectMap.entries())
    .map(([name, data]) => ({
      name,
      totalPoints: data.totalPoints,
      issueCount: data.issueCount,
      percentage: totalPoints > 0 ? (data.totalPoints / totalPoints) * 100 : 0
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

function getWorkloadColor(points: number): (text: string) => string {
  if (points > 10) {
    return chalk.red; // Overloaded
  } else if (points < 6) {
    return chalk.cyan; // Under-utilized
  } else {
    return chalk.white; // Good balance (6-10 points)
  }
}

function displayWorkloadTable(workloads: AssigneeWorkload[]): void {
  console.log(chalk.yellow('👥 Workload by Assignee:'));
  console.log();

  const tableData = [
    ['Assignee', 'Story Points', 'Issues', 'Status']
  ];

  workloads.forEach(workload => {
    const colorFn = getWorkloadColor(workload.totalPoints);
    const pointsText = colorFn(workload.totalPoints.toString());
    
    let statusText;
    if (workload.totalPoints > 10) {
      statusText = chalk.red('⚠️ Overloaded');
    } else if (workload.totalPoints < 6) {
      statusText = chalk.cyan('📈 Available');
    } else {
      statusText = chalk.green('✅ Balanced');
    }

    tableData.push([
      workload.name,
      pointsText,
      workload.issueCount.toString(),
      statusText
    ]);
  });

  console.log(table(tableData, {
    header: {
      alignment: 'center',
      content: chalk.yellow('Workload Distribution')
    }
  }));

  // Legend
  console.log(chalk.gray('Legend:'));
  console.log(`  ${chalk.cyan('📈 Available')} - Less than 6 points (may have capacity)`);
  console.log(`  ${chalk.green('✅ Balanced')} - 6-10 points (good workload)`);
  console.log(`  ${chalk.red('⚠️ Overloaded')} - More than 10 points (may be overcommitted)`);
}

function displayProjectTable(projects: ProjectWorkload[]): void {
  console.log(chalk.blue('📁 Distribution by Project:'));
  console.log();

  const tableData = [
    ['Project', 'Story Points', 'Issues', 'Percentage']
  ];

  projects.forEach(project => {
    const percentageBar = createPercentageBar(project.percentage);
    const percentageText = `${project.percentage.toFixed(1)}%`;
    
    tableData.push([
      project.name,
      project.totalPoints.toString(),
      project.issueCount.toString(),
      `${percentageText} ${percentageBar}`
    ]);
  });

  console.log(table(tableData, {
    header: {
      alignment: 'center',
      content: chalk.blue('Project Allocation')
    }
  }));
}

function createPercentageBar(percentage: number): string {
  const barLength = 20;
  const filledLength = Math.round((percentage / 100) * barLength);
  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(barLength - filledLength);
  
  let color;
  if (percentage > 40) {
    color = chalk.green;
  } else if (percentage > 20) {
    color = chalk.yellow;
  } else {
    color = chalk.gray;
  }
  
  return color(`[${filled}${empty}]`);
}

function displaySummaryStats(estimatedIssues: LinearIssue[], totalIssues: number): void {
  const totalPoints = estimatedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
  const averagePoints = totalPoints / estimatedIssues.length;
  const unestimatedCount = totalIssues - estimatedIssues.length;
  
  console.log(chalk.magenta('📈 Summary Statistics:'));
  console.log();
  console.log(`Total Planned Points: ${chalk.bold(totalPoints.toString())}`);
  console.log(`Issues with Estimates: ${chalk.bold(estimatedIssues.length.toString())}`);
  console.log(`Issues without Estimates: ${chalk.bold(unestimatedCount.toString())}`);
  console.log(`Average Points per Issue: ${chalk.bold(averagePoints.toFixed(1))}`);
  
  if (unestimatedCount > 0) {
    console.log();
    console.log(chalk.yellow(`💡 ${unestimatedCount} issues are missing story point estimates.`));
    console.log(chalk.blue('   Consider estimating these for better planning accuracy.'));
  }
}