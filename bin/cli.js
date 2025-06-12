#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { LinearClient } from '../src/linear.js';

dotenv.config();

const program = new Command();

program
  .name('team')
  .description('CLI to track your team\'s Linear workspace activity')
  .version('1.0.0');

async function getLinearClient() {
  const apiKey = process.env.LINEAR_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('❌ LINEAR_API_KEY not found in environment variables'));
    console.log(chalk.yellow('💡 Create a .env file and add your Linear API key:'));
    console.log(chalk.gray('   LINEAR_API_KEY=lin_api_your_personal_key'));
    console.log(chalk.gray('   or'));
    console.log(chalk.gray('   LINEAR_API_KEY=lin_oauth_your_oauth_token'));
    console.log(chalk.gray('   Get your API key from: https://linear.app/settings/api'));
    process.exit(1);
  }

  const client = new LinearClient(apiKey);
  
  try {
    await client.validateApiKey();
    return client;
  } catch (error) {
    console.error(chalk.red('❌ Failed to authenticate with Linear:'), error.message);
    process.exit(1);
  }
}

program
  .command('auth')
  .description('Test Linear API authentication')
  .action(async () => {
    try {
      const client = await getLinearClient();
      const viewer = await client.validateApiKey();
      console.log(chalk.green('✅ Successfully authenticated with Linear'));
      console.log(chalk.blue(`👋 Hello, ${viewer.name} (${viewer.email})`));
    } catch (error) {
      console.error(chalk.red('❌ Authentication failed:'), error.message);
    }
  });

program
  .command('cycles')
  .description('List current active cycles')
  .action(async () => {
    try {
      const client = await getLinearClient();
      const cycles = await client.getCurrentCycle();
      
      if (cycles.length === 0) {
        console.log(chalk.yellow('📅 No active cycles found'));
        return;
      }

      console.log(chalk.blue('📅 Active Cycles:'));
      cycles.forEach(cycle => {
        const startDate = new Date(cycle.startsAt).toLocaleDateString();
        const endDate = new Date(cycle.endsAt).toLocaleDateString();
        console.log(`  ${chalk.green('●')} ${chalk.bold(cycle.name)} (${cycle.team.name})`);
        console.log(`    ${chalk.gray(`${startDate} → ${endDate}`)}`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch cycles:'), error.message);
    }
  });

program
  .command('issues')
  .description('List issues in the current cycle')
  .option('-c, --cycle <id>', 'Specific cycle ID (defaults to first active cycle)')
  .action(async (options) => {
    try {
      const client = await getLinearClient();
      
      let cycleId = options.cycle;
      if (!cycleId) {
        const cycles = await client.getCurrentCycle();
        if (cycles.length === 0) {
          console.log(chalk.yellow('📅 No active cycles found'));
          return;
        }
        cycleId = cycles[0].id;
        console.log(chalk.blue(`📋 Issues in cycle: ${cycles[0].name}\n`));
      }

      const issues = await client.getIssuesInCycle(cycleId);
      
      if (issues.length === 0) {
        console.log(chalk.yellow('📝 No issues found in this cycle'));
        return;
      }

      const statusColors = {
        'backlog': chalk.gray,
        'unstarted': chalk.gray,
        'started': chalk.blue,
        'completed': chalk.green,
        'canceled': chalk.red,
      };

      const priorityIcons = {
        0: '🔵', // No priority
        1: '🟢', // Low
        2: '🟡', // Medium  
        3: '🟠', // High
        4: '🔴', // Urgent
      };

      issues.forEach(issue => {
        const statusColor = statusColors[issue.state.type] || chalk.white;
        const priorityIcon = priorityIcons[issue.priority] || '⚪';
        const assignee = issue.assignee ? `@${issue.assignee.name}` : 'Unassigned';
        const estimate = issue.estimate ? `${issue.estimate}pt` : 'No estimate';
        
        console.log(`${priorityIcon} ${chalk.bold(issue.identifier)}: ${issue.title}`);
        console.log(`   ${statusColor(issue.state.name)} • ${chalk.cyan(assignee)} • ${chalk.magenta(estimate)}`);
        console.log('');
      });

      console.log(chalk.gray(`📊 Total: ${issues.length} issues`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to fetch issues:'), error.message);
    }
  });

program.parse();