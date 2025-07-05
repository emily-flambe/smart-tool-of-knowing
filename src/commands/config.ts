import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../config.js';
import { createSetupCommand } from './setup.js';
import { createHealthCommand } from './health.js';

export function createConfigCommand(): Command {
  const command = new Command('config');
  
  command
    .description('Manage configuration settings')
    .addCommand(createSetupCommand().name('setup'))
    .addCommand(createHealthCommand().name('check'))
    .addCommand(createShowCommand())
    .addCommand(createSetCommand())
    .addCommand(createClearCommand());

  return command;
}

function createShowCommand(): Command {
  return new Command('show')
    .description('Show current configuration')
    .action(() => {
      const config = configManager.showConfig();
      
      console.log(chalk.blue('📋 Current Configuration:'));
      console.log();
      
      // Show .env file info
      if (configManager.envFileExists()) {
        console.log(chalk.green(`📄 Configuration file: ${configManager.getEnvFilePath()}`));
      } else {
        console.log(chalk.yellow('📄 No .env file found - using environment variables and defaults'));
      }
      console.log();
      
      console.log(`Linear API Key: ${config.linearApiKey || chalk.red('Not set')}`);
      console.log(`OpenAI API Key: ${config.openaiApiKey || chalk.red('Not set')}`);
      console.log(`OpenAI Model: ${config.openaiModel || 'Default (gpt-4)'}`);
      console.log(`Anthropic API Key: ${config.anthropicApiKey || chalk.red('Not set')}`);
      console.log(`Anthropic Model: ${config.anthropicModel || 'Default (claude-3-5-sonnet-20241022)'}`);
      console.log(`Default AI Provider: ${config.defaultAiProvider}`);
      console.log(`Default Summary Type: ${config.defaultSummaryType}`);
      
      const validation = configManager.validateConfig();
      if (!validation.valid) {
        console.log();
        console.log(chalk.yellow('⚠️  Missing configuration:'));
        validation.missing.forEach(item => console.log(`  - ${item}`));
        console.log();
        console.log(chalk.blue('Run `team config setup` to configure missing items.'));
      } else {
        console.log();
        console.log(chalk.green('✅ All required configuration is set!'));
      }
    });
}

function createSetCommand(): Command {
  const command = new Command('set');
  
  command
    .description('Set configuration values')
    .option('--linear-key <key>', 'Set Linear API key')
    .option('--openai-key <key>', 'Set OpenAI API key')
    .option('--openai-model <model>', 'Set OpenAI model')
    .option('--anthropic-key <key>', 'Set Anthropic API key')
    .option('--anthropic-model <model>', 'Set Anthropic model')
    .option('--ai-provider <provider>', 'Set default AI provider (openai|anthropic)')
    .option('--summary-type <type>', 'Set default summary type (brief|detailed|action-items)')
    .action(async (options) => {
      if (options.linearKey) {
        configManager.setLinearApiKey(options.linearKey);
        console.log(chalk.green('✓ Linear API key updated'));
      }
      
      if (options.openaiKey) {
        configManager.setOpenAIApiKey(options.openaiKey);
        console.log(chalk.green('✓ OpenAI API key updated'));
      }

      if (options.openaiModel) {
        configManager.setOpenAIModel(options.openaiModel);
        console.log(chalk.green(`✓ OpenAI model set to ${options.openaiModel}`));
      }
      
      if (options.anthropicKey) {
        configManager.setAnthropicApiKey(options.anthropicKey);
        console.log(chalk.green('✓ Anthropic API key updated'));
      }

      if (options.anthropicModel) {
        configManager.setAnthropicModel(options.anthropicModel);
        console.log(chalk.green(`✓ Anthropic model set to ${options.anthropicModel}`));
      }

      
      if (options.aiProvider) {
        if (!['openai', 'anthropic'].includes(options.aiProvider)) {
          console.log(chalk.red('✗ Invalid AI provider. Use "openai" or "anthropic"'));
          return;
        }
        configManager.setDefaultAiProvider(options.aiProvider);
        console.log(chalk.green(`✓ Default AI provider set to ${options.aiProvider}`));
      }
      
      if (options.summaryType) {
        if (!['brief', 'detailed', 'action-items'].includes(options.summaryType)) {
          console.log(chalk.red('✗ Invalid summary type. Use "brief", "detailed", or "action-items"'));
          return;
        }
        configManager.setDefaultSummaryType(options.summaryType);
        console.log(chalk.green(`✓ Default summary type set to ${options.summaryType}`));
      }
      
      if (!Object.keys(options).length) {
        console.log(chalk.yellow('No options provided. Use --help to see available options.'));
      }
    });

  return command;
}

function createClearCommand(): Command {
  return new Command('clear')
    .description('Clear all configuration')
    .action(async () => {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to clear all configuration?',
          default: false,
        },
      ]);
      
      if (confirm) {
        configManager.clearConfig();
        console.log(chalk.green('✓ Configuration cleared'));
      } else {
        console.log(chalk.yellow('Configuration not cleared'));
      }
    });
}