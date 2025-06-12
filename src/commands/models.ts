import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '../config.js';
import { AIService } from '../ai-service.js';

export function createModelsCommand(): Command {
  const command = new Command('models');
  
  command
    .description('List available AI models and manage model selection')
    .addCommand(createListModelsCommand())
    .addCommand(createSelectModelCommand());

  return command;
}

function createListModelsCommand(): Command {
  return new Command('list')
    .description('List available models for configured AI providers')
    .option('--provider <provider>', 'List models for specific provider (openai|anthropic)')
    .action(async (options) => {
      const config = configManager.getConfig();
      
      console.log(chalk.blue('🤖 Available AI Models:'));
      console.log();

      // List OpenAI models if key is configured
      if (config.openaiApiKey && (!options.provider || options.provider === 'openai')) {
        console.log(chalk.green('📚 OpenAI Models:'));
        const spinner = ora('Fetching OpenAI models...').start();
        
        try {
          const models = await AIService.getAvailableModels('openai', config.openaiApiKey);
          spinner.stop();
          
          models.forEach(model => {
            const isCurrent = model === config.openaiModel;
            const marker = isCurrent ? chalk.green('✓ ') : '  ';
            const label = isCurrent ? chalk.green(model + ' (current)') : model;
            console.log(`${marker}${label}`);
          });
        } catch (error) {
          spinner.stop();
          console.log(chalk.red('  ❌ Could not fetch OpenAI models'));
        }
        console.log();
      }

      // List Anthropic models if key is configured
      if (config.anthropicApiKey && (!options.provider || options.provider === 'anthropic')) {
        console.log(chalk.cyan('🧠 Anthropic Models:'));
        const models = await AIService.getAvailableModels('anthropic', config.anthropicApiKey);
        
        models.forEach(model => {
          const isCurrent = model === config.anthropicModel;
          const marker = isCurrent ? chalk.green('✓ ') : '  ';
          const label = isCurrent ? chalk.green(model + ' (current)') : model;
          
          // Add descriptions for Anthropic models
          let description = '';
          if (model.includes('opus')) description = chalk.gray(' - Most capable, slower');
          else if (model.includes('sonnet')) description = chalk.gray(' - Balanced capability and speed');
          else if (model.includes('haiku')) description = chalk.gray(' - Fastest, most cost-effective');
          
          console.log(`${marker}${label}${description}`);
        });
        console.log();
      }

      if (!config.openaiApiKey && !config.anthropicApiKey) {
        console.log(chalk.yellow('⚠️ No AI API keys configured. Run `team setup` first.'));
      }
    });
}

function createSelectModelCommand(): Command {
  return new Command('select')
    .description('Interactively select a model for an AI provider')
    .argument('<provider>', 'AI provider (openai|anthropic)')
    .action(async (provider) => {
      if (!['openai', 'anthropic'].includes(provider)) {
        console.log(chalk.red('❌ Invalid provider. Use "openai" or "anthropic"'));
        return;
      }

      const config = configManager.getConfig();
      const apiKey = provider === 'openai' ? config.openaiApiKey : config.anthropicApiKey;
      
      if (!apiKey) {
        console.log(chalk.red(`❌ ${provider} API key not configured. Run \`team setup\` first.`));
        return;
      }

      console.log(chalk.blue(`🤖 Select ${provider.toUpperCase()} Model:`));
      console.log();

      const spinner = ora(`Fetching ${provider} models...`).start();
      
      try {
        const models = await AIService.getAvailableModels(provider as 'openai' | 'anthropic', apiKey);
        spinner.stop();

        const inquirer = (await import('inquirer')).default;
        const { selectedModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedModel',
            message: `Choose your preferred ${provider} model:`,
            choices: models.map(model => {
              let name = model;
              if (provider === 'anthropic') {
                if (model.includes('opus')) name += ' (Most capable, slower)';
                else if (model.includes('sonnet')) name += ' (Balanced - Recommended)';
                else if (model.includes('haiku')) name += ' (Fastest, cost-effective)';
              } else {
                if (model.includes('gpt-4')) name += ' (Recommended)';
              }
              return { name, value: model };
            })
          }
        ]);

        // Validate model access
        const validateSpinner = ora('Validating model access...').start();
        try {
          const hasAccess = await AIService.validateModelAccess(provider as 'openai' | 'anthropic', apiKey, selectedModel);
          validateSpinner.stop();
          
          if (hasAccess) {
            if (provider === 'openai') {
              configManager.setOpenAIModel(selectedModel);
            } else {
              configManager.setAnthropicModel(selectedModel);
            }
            console.log(chalk.green(`✓ ${provider} model set to ${selectedModel}`));
          } else {
            console.log(chalk.yellow(`⚠️ No access to ${selectedModel}. Please check your API key permissions.`));
          }
        } catch (error) {
          validateSpinner.stop();
          console.log(chalk.yellow('⚠️ Could not validate model access, but setting anyway.'));
          if (provider === 'openai') {
            configManager.setOpenAIModel(selectedModel);
          } else {
            configManager.setAnthropicModel(selectedModel);
          }
          console.log(chalk.green(`✓ ${provider} model set to ${selectedModel}`));
        }

      } catch (error) {
        spinner.stop();
        console.log(chalk.red(`❌ Error fetching ${provider} models: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
}