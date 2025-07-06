import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import ora from 'ora';
import inquirer from 'inquirer';
import { LinearClient } from '../linear-client.js';
import { configManager } from '../config.js';
import { LinearIssue } from '../types.js';

export function createListCommand(): Command {
  const command = new Command('list');
  
  command
    .description('List Linear items')
    .addCommand(createCyclesCommand())
    .addCommand(createIssuesCommand())
    .addCommand(createProjectsCommand())
    .addCommand(createTeamsCommand());

  // Alias for backwards compatibility
  command.alias('ls');

  return command;
}

function createCyclesCommand(): Command {
  return new Command('cycles')
    .description('List current cycles')
    .option('--team <teamId>', 'Filter by team ID')
    .action(async (_options) => {
      const config = configManager.getConfig();
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team config setup` first.'));
        return;
      }

      const spinner = ora('Fetching current cycles...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        const cycles = await client.getCurrentCycles();
        
        spinner.stop();
        
        if (cycles.length === 0) {
          console.log(chalk.yellow('📭 No active cycles found.'));
          return;
        }

        console.log(chalk.blue(`📅 Current Cycles (${cycles.length}):`));
        console.log();

        const tableData = [
          ['Team', 'Cycle', 'Start Date', 'End Date', 'ID']
        ];

        cycles.forEach(cycle => {
          tableData.push([
            cycle.team.name,
            cycle.name,
            new Date(cycle.startsAt).toLocaleDateString(),
            new Date(cycle.endsAt).toLocaleDateString(),
            cycle.id.slice(0, 8) + '...'
          ]);
        });

        console.log(table(tableData, {
          header: {
            alignment: 'center',
            content: chalk.blue('Current Cycles')
          }
        }));

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error fetching cycles: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createIssuesCommand(): Command {
  return new Command('issues')
    .description('List issues')
    .option('--cycle <cycleId>', 'Filter by cycle ID')
    .option('--project <projectId>', 'Filter by project ID')
    .option('--team <teamId>', 'Filter by team ID')
    .option('--limit <number>', 'Limit number of results', '20')
    .option('--assignee <assignee>', 'Filter by assignee')
    .option('--status <status>', 'Filter by status')
    .action(async (options) => {
      const config = configManager.getConfig();
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team config setup` first.'));
        return;
      }

      const spinner = ora('Fetching issues...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        let issues: LinearIssue[] = [];

        if (options.cycle) {
          issues = await client.getIssuesInCycle(options.cycle);
        } else if (options.project) {
          issues = await client.getIssuesByProject(options.project);
        } else if (options.team) {
          issues = await client.getIssuesForTeam(options.team, parseInt(options.limit));
        } else {
          // If no specific filter, let user choose from recent cycles
          const cycles = await client.getRecentCycles(3);
          if (cycles.length === 0) {
            spinner.stop();
            console.log(chalk.yellow('📭 No cycles found in the past 3 months. Use --team option to list issues for a specific team.'));
            return;
          }

          spinner.stop();
          
          // Format cycle choices with status and dates
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
              message: 'Select a cycle to view issues (showing last 3 months):',
              choices: cycleChoices,
              pageSize: 15
            }
          ]);

          spinner.start('Fetching issues...');
          issues = await client.getIssuesInCycle(selectedCycle);
        }

        // Apply filters
        if (options.assignee) {
          issues = issues.filter(issue => 
            issue.assignee?.name.toLowerCase().includes(options.assignee.toLowerCase())
          );
        }

        if (options.status) {
          issues = issues.filter(issue => 
            issue.state.name.toLowerCase().includes(options.status.toLowerCase())
          );
        }

        spinner.stop();

        if (issues.length === 0) {
          console.log(chalk.yellow('📭 No issues found matching your criteria.'));
          return;
        }

        console.log(chalk.blue(`🎫 Issues (${issues.length}):`));
        console.log();

        issues.forEach(issue => {
          const priorityColor = getPriorityColor(issue.priority);
          const stateColor = getStateColor(issue.state.name);
          
          console.log(`${chalk.bold(issue.identifier)} ${issue.title}`);
          console.log(`  ${stateColor(issue.state.name)} | ${priorityColor(getPriorityName(issue.priority))} | ${issue.assignee?.name || 'Unassigned'}`);
          if (issue.project) {
            console.log(`  📁 ${issue.project.name}`);
          }
          if (issue.estimate) {
            console.log(`  🔢 ${issue.estimate} points`);
          }
          console.log();
        });

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error fetching issues: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createProjectsCommand(): Command {
  return new Command('projects')
    .description('List projects')
    .action(async () => {
      const config = configManager.getConfig();
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team config setup` first.'));
        return;
      }

      const spinner = ora('Fetching projects...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        const projects = await client.getProjects();
        
        spinner.stop();
        
        if (projects.length === 0) {
          console.log(chalk.yellow('📭 No projects found.'));
          return;
        }

        console.log(chalk.blue(`📁 Projects (${projects.length}):`));
        console.log();

        const tableData = [
          ['Name', 'State', 'Start Date', 'Target Date', 'ID']
        ];

        projects.forEach(project => {
          tableData.push([
            project.name,
            project.state,
            project.startDate ? new Date(project.startDate).toLocaleDateString() : '-',
            project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '-',
            project.id.slice(0, 8) + '...'
          ]);
        });

        console.log(table(tableData));

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error fetching projects: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createTeamsCommand(): Command {
  return new Command('teams')
    .description('List teams')
    .action(async () => {
      const config = configManager.getConfig();
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team config setup` first.'));
        return;
      }

      const spinner = ora('Fetching teams...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        const teams = await client.getTeams();
        
        spinner.stop();
        
        if (teams.length === 0) {
          console.log(chalk.yellow('📭 No teams found.'));
          return;
        }

        console.log(chalk.blue(`👥 Teams (${teams.length}):`));
        console.log();

        teams.forEach(team => {
          console.log(`${chalk.bold(team.key)} - ${team.name}`);
          console.log(`  ID: ${team.id}`);
          console.log();
        });

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error fetching teams: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

// Helper functions
function getPriorityColor(priority: number): (text: string) => string {
  switch (priority) {
    case 1: return chalk.red; // Urgent
    case 2: return chalk.yellow; // High
    case 3: return chalk.blue; // Medium
    case 4: return chalk.gray; // Low
    default: return chalk.gray; // No priority
  }
}

function getStateColor(state: string): (text: string) => string {
  const lowerState = state.toLowerCase();
  if (lowerState.includes('done') || lowerState.includes('completed')) {
    return chalk.green;
  } else if (lowerState.includes('progress') || lowerState.includes('review')) {
    return chalk.yellow;
  } else {
    return chalk.gray;
  }
}

function getPriorityName(priority: number): string {
  const priorities = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'];
  return priorities[priority] || 'Unknown';
}