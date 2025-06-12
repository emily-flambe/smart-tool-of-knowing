import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { LinearClient } from '../linear-client.js';
import { AIService } from '../ai-service.js';
import { configManager } from '../config.js';
import { LinearIssue, SummaryOptions } from '../types.js';

export function createSummarizeCommand(): Command {
  const command = new Command('summarize');
  
  command
    .description('AI-powered summarization of Linear items')
    .addCommand(createCycleSummaryCommand())
    .addCommand(createProjectSummaryCommand())
    .addCommand(createIssueSummaryCommand())
    .addCommand(createTeamSummaryCommand());

  // Alias
  command.alias('sum');

  return command;
}

function createCycleSummaryCommand(): Command {
  return new Command('cycle')
    .description('Summarize issues in a cycle')
    .option('--cycle-id <id>', 'Specific cycle ID to summarize')
    .option('--ai-provider <provider>', 'AI provider to use (openai|anthropic)')
    .option('--type <type>', 'Summary type (brief|detailed|action-items)')
    .option('--group-by <grouping>', 'Group by (project|assignee|priority)')
    .option('--no-metrics', 'Exclude metrics from summary')
    .action(async (options) => {
      const config = configManager.getConfig();
      
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team setup` first.'));
        return;
      }

      if (!config.openaiApiKey && !config.anthropicApiKey) {
        console.log(chalk.red('❌ No AI API keys configured. Run `team setup` first.'));
        return;
      }

      const spinner = ora('Fetching cycle data...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        let cycleId = options.cycleId;

        if (!cycleId) {
          const cycles = await client.getRecentCycles(3);
          if (cycles.length === 0) {
            spinner.stop();
            console.log(chalk.yellow('📭 No cycles found in the past 3 months.'));
            return;
          }

          spinner.stop();
          
          // Format cycle choices with more information
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
              message: 'Select a cycle to summarize (showing last 3 months):',
              choices: cycleChoices,
              pageSize: 15
            }
          ]);
          cycleId = selectedCycle;
          spinner.start('Fetching cycle issues...');
        }

        const issues = await client.getIssuesInCycle(cycleId);
        
        if (issues.length === 0) {
          spinner.stop();
          console.log(chalk.yellow('📭 No issues found in this cycle.'));
          return;
        }

        spinner.text = 'Generating AI summary...';
        
        const aiService = new AIService(
          config.openaiApiKey,
          config.anthropicApiKey,
          config.defaultAiProvider,
          config.openaiModel,
          config.anthropicModel
        );

        const summaryOptions: SummaryOptions = {
          aiProvider: options.aiProvider as 'openai' | 'anthropic',
          summaryType: options.type as 'brief' | 'detailed' | 'action-items' || config.defaultSummaryType,
          groupBy: options.groupBy as 'project' | 'assignee' | 'priority',
          includeMetrics: options.metrics !== false,
        };

        const summary = await aiService.summarizeIssues(issues, summaryOptions);
        
        spinner.stop();
        
        console.log(chalk.blue('🤖 AI Summary:'));
        console.log('='.repeat(60));
        console.log();
        console.log(summary.summary);
        
        if (summary.keyPoints.length > 0) {
          console.log();
          console.log(chalk.yellow('🔑 Key Points:'));
          summary.keyPoints.forEach(point => console.log(`• ${point}`));
        }
        
        if (summary.actionItems && summary.actionItems.length > 0) {
          console.log();
          console.log(chalk.green('✅ Action Items:'));
          summary.actionItems.forEach(item => console.log(`• ${item}`));
        }
        
        if (summary.metrics) {
          console.log();
          console.log(chalk.cyan('📊 Metrics:'));
          console.log(`• Total Issues: ${summary.metrics.totalIssues}`);
          console.log(`• Completed: ${summary.metrics.completedIssues}`);
          console.log(`• In Progress: ${summary.metrics.inProgressIssues}`);
          if (summary.metrics.estimatedHours) {
            console.log(`• Estimated Points: ${summary.metrics.estimatedHours}`);
          }
        }

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error generating summary: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createProjectSummaryCommand(): Command {
  return new Command('project')
    .description('Summarize issues in a project')
    .option('--project-id <id>', 'Specific project ID to summarize')
    .option('--ai-provider <provider>', 'AI provider to use (openai|anthropic)')
    .option('--type <type>', 'Summary type (brief|detailed|action-items)')
    .option('--group-by <grouping>', 'Group by (assignee|priority)')
    .option('--no-metrics', 'Exclude metrics from summary')
    .action(async (options) => {
      const config = configManager.getConfig();
      
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team setup` first.'));
        return;
      }

      if (!config.openaiApiKey && !config.anthropicApiKey) {
        console.log(chalk.red('❌ No AI API keys configured. Run `team setup` first.'));
        return;
      }

      const spinner = ora('Fetching project data...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        let projectId = options.projectId;

        if (!projectId) {
          const projects = await client.getProjects();
          if (projects.length === 0) {
            spinner.stop();
            console.log(chalk.yellow('📭 No projects found.'));
            return;
          }

          spinner.stop();
          const { selectedProject } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedProject',
              message: 'Select a project to summarize:',
              choices: projects.map(project => ({
                name: project.name,
                value: project.id
              }))
            }
          ]);
          projectId = selectedProject;
          spinner.start('Fetching project issues...');
        }

        const issues = await client.getIssuesByProject(projectId);
        
        if (issues.length === 0) {
          spinner.stop();
          console.log(chalk.yellow('📭 No issues found in this project.'));
          return;
        }

        spinner.text = 'Generating AI summary...';
        
        const aiService = new AIService(
          config.openaiApiKey,
          config.anthropicApiKey,
          config.defaultAiProvider,
          config.openaiModel,
          config.anthropicModel
        );

        const summaryOptions: SummaryOptions = {
          aiProvider: options.aiProvider as 'openai' | 'anthropic',
          summaryType: options.type as 'brief' | 'detailed' | 'action-items' || config.defaultSummaryType,
          groupBy: options.groupBy as 'assignee' | 'priority',
          includeMetrics: options.metrics !== false,
        };

        const summary = await aiService.summarizeIssues(issues, summaryOptions);
        
        spinner.stop();
        
        console.log(chalk.blue('🤖 AI Project Summary:'));
        console.log('='.repeat(60));
        console.log();
        console.log(summary.summary);
        
        if (summary.keyPoints.length > 0) {
          console.log();
          console.log(chalk.yellow('🔑 Key Points:'));
          summary.keyPoints.forEach(point => console.log(`• ${point}`));
        }
        
        if (summary.actionItems && summary.actionItems.length > 0) {
          console.log();
          console.log(chalk.green('✅ Action Items:'));
          summary.actionItems.forEach(item => console.log(`• ${item}`));
        }
        
        if (summary.metrics) {
          console.log();
          console.log(chalk.cyan('📊 Metrics:'));
          console.log(`• Total Issues: ${summary.metrics.totalIssues}`);
          console.log(`• Completed: ${summary.metrics.completedIssues}`);
          console.log(`• In Progress: ${summary.metrics.inProgressIssues}`);
          if (summary.metrics.estimatedHours) {
            console.log(`• Estimated Points: ${summary.metrics.estimatedHours}`);
          }
        }

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error generating summary: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createIssueSummaryCommand(): Command {
  return new Command('issue')
    .description('Summarize a specific issue')
    .argument('<issue-id>', 'Issue ID to summarize')
    .option('--ai-provider <provider>', 'AI provider to use (openai|anthropic)')
    .option('--type <type>', 'Summary type (brief|detailed|action-items)')
    .action(async (issueId, options) => {
      const config = configManager.getConfig();
      
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team setup` first.'));
        return;
      }

      if (!config.openaiApiKey && !config.anthropicApiKey) {
        console.log(chalk.red('❌ No AI API keys configured. Run `team setup` first.'));
        return;
      }

      const spinner = ora('Fetching issue data...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        const issue = await client.getIssue(issueId);
        
        if (!issue) {
          spinner.stop();
          console.log(chalk.yellow(`📭 Issue ${issueId} not found.`));
          return;
        }

        spinner.text = 'Generating AI summary...';
        
        const aiService = new AIService(
          config.openaiApiKey,
          config.anthropicApiKey,
          config.defaultAiProvider,
          config.openaiModel,
          config.anthropicModel
        );

        const summaryOptions: SummaryOptions = {
          aiProvider: options.aiProvider as 'openai' | 'anthropic',
          summaryType: options.type as 'brief' | 'detailed' | 'action-items' || config.defaultSummaryType,
        };

        const summary = await aiService.summarizeIndividualIssue(issue, summaryOptions);
        
        spinner.stop();
        
        console.log(chalk.blue(`🤖 AI Summary for ${issue.identifier}:`));
        console.log('='.repeat(60));
        console.log();
        console.log(chalk.bold(issue.title));
        console.log();
        console.log(summary);

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error generating summary: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}

function createTeamSummaryCommand(): Command {
  return new Command('team')
    .description('Summarize issues for a team')
    .option('--team-id <id>', 'Specific team ID to summarize')
    .option('--limit <number>', 'Limit number of issues', '50')
    .option('--ai-provider <provider>', 'AI provider to use (openai|anthropic)')
    .option('--type <type>', 'Summary type (brief|detailed|action-items)')
    .option('--group-by <grouping>', 'Group by (project|assignee|priority)')
    .option('--no-metrics', 'Exclude metrics from summary')
    .action(async (options) => {
      const config = configManager.getConfig();
      
      if (!config.linearApiKey) {
        console.log(chalk.red('❌ Linear API key not configured. Run `team setup` first.'));
        return;
      }

      if (!config.openaiApiKey && !config.anthropicApiKey) {
        console.log(chalk.red('❌ No AI API keys configured. Run `team setup` first.'));
        return;
      }

      const spinner = ora('Fetching team data...').start();
      
      try {
        const client = new LinearClient(config.linearApiKey);
        let teamId = options.teamId;

        if (!teamId) {
          const teams = await client.getTeams();
          if (teams.length === 0) {
            spinner.stop();
            console.log(chalk.yellow('📭 No teams found.'));
            return;
          }

          spinner.stop();
          const { selectedTeam } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedTeam',
              message: 'Select a team to summarize:',
              choices: teams.map(team => ({
                name: `${team.name} (${team.key})`,
                value: team.id
              }))
            }
          ]);
          teamId = selectedTeam;
          spinner.start('Fetching team issues...');
        }

        const issues = await client.getIssuesForTeam(teamId, parseInt(options.limit));
        
        if (issues.length === 0) {
          spinner.stop();
          console.log(chalk.yellow('📭 No issues found for this team.'));
          return;
        }

        spinner.text = 'Generating AI summary...';
        
        const aiService = new AIService(
          config.openaiApiKey,
          config.anthropicApiKey,
          config.defaultAiProvider,
          config.openaiModel,
          config.anthropicModel
        );

        const summaryOptions: SummaryOptions = {
          aiProvider: options.aiProvider as 'openai' | 'anthropic',
          summaryType: options.type as 'brief' | 'detailed' | 'action-items' || config.defaultSummaryType,
          groupBy: options.groupBy as 'project' | 'assignee' | 'priority',
          includeMetrics: options.metrics !== false,
        };

        const summary = await aiService.summarizeIssues(issues, summaryOptions);
        
        spinner.stop();
        
        console.log(chalk.blue('🤖 AI Team Summary:'));
        console.log('='.repeat(60));
        console.log();
        console.log(summary.summary);
        
        if (summary.keyPoints.length > 0) {
          console.log();
          console.log(chalk.yellow('🔑 Key Points:'));
          summary.keyPoints.forEach(point => console.log(`• ${point}`));
        }
        
        if (summary.actionItems && summary.actionItems.length > 0) {
          console.log();
          console.log(chalk.green('✅ Action Items:'));
          summary.actionItems.forEach(item => console.log(`• ${item}`));
        }
        
        if (summary.metrics) {
          console.log();
          console.log(chalk.cyan('📊 Metrics:'));
          console.log(`• Total Issues: ${summary.metrics.totalIssues}`);
          console.log(`• Completed: ${summary.metrics.completedIssues}`);
          console.log(`• In Progress: ${summary.metrics.inProgressIssues}`);
          if (summary.metrics.estimatedHours) {
            console.log(`• Estimated Points: ${summary.metrics.estimatedHours}`);
          }
        }

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error generating summary: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}