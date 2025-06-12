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
import { createCodaCommand } from './commands/coda.js';
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
  .description('Team Knowledge CLI - Integrate Linear, Coda, and AI for comprehensive team insights')
  .version(packageInfo.version);

// Add commands
program.addCommand(createSetupCommand());
program.addCommand(createConfigCommand());

// Linear system commands
const linearCommand = new Command('linear');
linearCommand.description('Linear workspace integration');
linearCommand.addCommand(createListCommand().name('list'));
linearCommand.addCommand(createSummarizeCommand().name('summarize'));
linearCommand.addCommand(createPlanningCommand().name('planning'));
program.addCommand(linearCommand);

// Coda system commands
program.addCommand(createCodaCommand());

// Models command (global)
program.addCommand(createModelsCommand());

// Add some aliases for backward compatibility
program
  .command('cycles')
  .description('List current cycles (alias for team linear list cycles)')
  .action(async () => {
    console.log(chalk.yellow('This command has moved. Use: team linear list cycles'));
    console.log('Or use the new structure:');
    console.log(chalk.blue('  team linear list cycles'));
  });

program
  .command('issues')
  .description('List issues (alias for team linear list issues)')
  .action(async () => {
    console.log(chalk.yellow('This command has moved. Use: team linear list issues'));
    console.log('Or use the new structure:');
    console.log(chalk.blue('  team linear list issues'));
  });

program
  .command('summarize')
  .description('AI summarization (alias for team linear summarize)')
  .action(async () => {
    console.log(chalk.yellow('This command has moved. Use: team linear summarize'));
    console.log('Or use the new structure:');
    console.log(chalk.blue('  team linear summarize cycle'));
    console.log(chalk.blue('  team linear summarize project'));
    console.log(chalk.blue('  team linear summarize team'));
  });

program
  .command('planning')
  .description('Planning analysis (alias for team linear planning)')
  .action(async () => {
    console.log(chalk.yellow('This command has moved. Use: team linear planning'));
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
  console.log('  $ team setup                            Configure API keys');
  console.log();
  console.log(chalk.yellow('Linear Integration:'));
  console.log('  $ team linear list cycles               List current cycles');
  console.log('  $ team linear list issues --team TEAM   List issues for team');
  console.log('  $ team linear planning                  Planning analysis');
  console.log('  $ team linear summarize cycle           AI cycle summary');
  console.log('  $ team linear summarize project         AI project summary');
  console.log();
  console.log(chalk.yellow('Coda Integration:'));
  console.log('  $ team coda list-docs                   List Coda documents');
  console.log('  $ team coda search-docs "project"       Search documents');
  console.log('  $ team coda show-doc DOC-ID             Show document details');
  console.log();
  console.log(chalk.yellow('AI Models:'));
  console.log('  $ team models list                      Available AI models');
  console.log('  $ team models select anthropic          Choose model');
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
    console.log('Then try these commands:');
    console.log(chalk.green('  team linear list cycles     ') + '- List Linear cycles');
    console.log(chalk.green('  team coda list-docs         ') + '- List Coda documents');
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