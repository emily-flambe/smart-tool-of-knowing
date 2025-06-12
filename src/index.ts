#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createSetupCommand } from './commands/setup.js';
import { createConfigCommand } from './commands/config.js';
import { createListCommand } from './commands/list.js';
import { createSummarizeCommand } from './commands/summarize.js';
import { createModelsCommand } from './commands/models.js';
import { createPlanningCommand } from './commands/planning.js';
import { configManager } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let packageInfo: any;
try {
  const packagePath = join(__dirname, '..', 'package.json');
  packageInfo = JSON.parse(readFileSync(packagePath, 'utf8'));
} catch (error) {
  packageInfo = { name: 'linear-ai-cli', version: '1.0.0' };
}

const program = new Command();

program
  .name('team')
  .description('Linear AI CLI - Manage and summarize your Linear workspace with AI')
  .version(packageInfo.version);

// Add commands
program.addCommand(createSetupCommand());
program.addCommand(createConfigCommand());
program.addCommand(createListCommand());
program.addCommand(createSummarizeCommand());
program.addCommand(createModelsCommand());
program.addCommand(createPlanningCommand());

// Add some aliases for common operations
program
  .command('cycles')
  .description('List current cycles (alias for list cycles)')
  .action(async () => {
    const listCommand = createListCommand();
    const cyclesCommand = listCommand.commands.find(cmd => cmd.name() === 'cycles');
    if (cyclesCommand) {
      await cyclesCommand.parseAsync([], { from: 'user' });
    }
  });

program
  .command('issues')
  .description('List issues (alias for list issues)')
  .option('--cycle <cycleId>', 'Filter by cycle ID')
  .option('--project <projectId>', 'Filter by project ID')
  .option('--team <teamId>', 'Filter by team ID')
  .option('--limit <number>', 'Limit number of results', '20')
  .action(async (options) => {
    const listCommand = createListCommand();
    const issuesCommand = listCommand.commands.find(cmd => cmd.name() === 'issues');
    if (issuesCommand) {
      // Convert options to argv format
      const argv = ['issues'];
      if (options.cycle) argv.push('--cycle', options.cycle);
      if (options.project) argv.push('--project', options.project);
      if (options.team) argv.push('--team', options.team);
      if (options.limit) argv.push('--limit', options.limit);
      
      await issuesCommand.parseAsync(argv, { from: 'user' });
    }
  });

// Check configuration on startup for most commands
program.hook('preAction', (thisCommand) => {
  const commandName = thisCommand.name();
  const parentName = thisCommand.parent?.name();
  const skipConfigCheck = ['setup', 'config', 'help', 'version', 'show', 'set', 'clear', 'team'];
  
  // Check if we're running setup command
  const args = process.argv;
  const isSetupCommand = args.includes('setup');
  const isConfigCommand = args.includes('config');
  
  if (!skipConfigCheck.includes(commandName) && !isSetupCommand && !isConfigCommand && (!parentName || !skipConfigCheck.includes(parentName))) {
    const validation = configManager.validateConfig();
    if (!validation.valid) {
      console.log(chalk.yellow('⚠️  Configuration incomplete.'));
      console.log('Missing:');
      validation.missing.forEach(item => console.log(`  - ${item}`));
      console.log();
      console.log(chalk.blue('Run `team setup` to configure your API keys.'));
      process.exit(1);
    }
  }
});

// Enhanced help
program.on('--help', () => {
  console.log();
  console.log(chalk.blue('Examples:'));
  console.log('  $ team setup                    Configure API keys');
  console.log('  $ team cycles                   List current cycles');
  console.log('  $ team issues --team TEAM-123   List issues for a team');
  console.log('  $ team planning                 Planning overview with workload');
  console.log('  $ team models list              Show available AI models');
  console.log('  $ team models select anthropic  Choose Anthropic model');
  console.log('  $ team summarize cycle          AI summary of cycle issues');
  console.log('  $ team summarize project        AI summary of project issues');
  console.log('  $ team summarize issue LIN-123  AI summary of specific issue');
  console.log();
  console.log(chalk.yellow('Need help?'));
  console.log('  Visit: https://github.com/your-repo/linear-ai-cli');
  console.log();
});

// Show welcome message for first-time users
if (process.argv.length === 2) {
  const config = configManager.getConfig();
  if (!config.linearApiKey) {
    console.log(chalk.blue('👋 Welcome to Linear AI CLI!'));
    console.log();
    console.log('Get started by configuring your API keys:');
    console.log(chalk.green('  team setup'));
    console.log();
    console.log('Or see all available commands:');
    console.log(chalk.green('  team --help'));
    console.log();
    process.exit(0);
  }
}

// Error handling
program.configureOutput({
  outputError: (str, write) => {
    write(chalk.red(str));
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.log(chalk.red('❌ Unhandled Rejection at:'), promise);
  console.log(chalk.red('Reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.log(chalk.red('❌ Uncaught Exception:'), error.message);
  process.exit(1);
});

// Parse arguments
program.parse();