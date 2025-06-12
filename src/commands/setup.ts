import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '../config.js';
import { LinearClient } from '../linear-client.js';
import { AIService } from '../ai-service.js';

export function createSetupCommand(): Command {
  const command = new Command('setup');
  
  command
    .description('Configure API keys and settings')
    .action(async () => {
      console.log(chalk.blue('🚀 Linear AI CLI Setup'));
      console.log('Configure your API keys to get started.\n');

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'linearApiKey',
          message: 'Enter your Linear API key:',
          validate: (input: string) => {
            if (!input.trim()) return 'Linear API key is required';
            if (!input.startsWith('lin_api_') && !input.startsWith('lin_oauth_')) {
              return 'Invalid Linear API key format. Should start with lin_api_ or lin_oauth_';
            }
            return true;
          },
        },
        {
          type: 'list',
          name: 'aiProvider',
          message: 'Which AI provider would you like to use?',
          choices: [
            { name: 'OpenAI (GPT-4)', value: 'openai' },
            { name: 'Anthropic (Claude)', value: 'anthropic' },
            { name: 'Both (you can switch between them)', value: 'both' },
          ],
        },
      ]);

      // Validate Linear API key
      try {
        console.log(chalk.yellow('Validating Linear API key...'));
        const linearClient = new LinearClient(answers.linearApiKey);
        const viewer = await linearClient.validateApiKey();
        console.log(chalk.green(`✓ Linear API key validated for ${viewer.name} (${viewer.email})`));
        configManager.setLinearApiKey(answers.linearApiKey);
      } catch (error) {
        console.log(chalk.red('✗ Invalid Linear API key'));
        return;
      }

      // Configure AI providers
      if (answers.aiProvider === 'openai' || answers.aiProvider === 'both') {
        const { openaiKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'openaiKey',
            message: 'Enter your OpenAI API key:',
            validate: (input: string) => {
              if (!input.trim()) return 'OpenAI API key is required';
              if (!input.startsWith('sk-')) return 'Invalid OpenAI API key format';
              return true;
            },
          },
        ]);
        
        configManager.setOpenAIApiKey(openaiKey);
        console.log(chalk.green('✓ OpenAI API key saved'));

        // Fetch and let user choose OpenAI model
        const modelSpinner = ora('Fetching available OpenAI models...').start();
        try {
          const availableModels = await AIService.getAvailableModels('openai', openaiKey);
          modelSpinner.stop();
          
          const { openaiModel } = await inquirer.prompt([
            {
              type: 'list',
              name: 'openaiModel',
              message: 'Choose your preferred OpenAI model:',
              choices: availableModels.map(model => ({
                name: `${model} ${model.includes('gpt-4') ? '(Recommended)' : ''}`,
                value: model
              })),
              default: 'gpt-4'
            }
          ]);
          
          configManager.setOpenAIModel(openaiModel);
          console.log(chalk.green(`✓ OpenAI model set to ${openaiModel}`));
        } catch (error) {
          modelSpinner.stop();
          console.log(chalk.yellow('⚠️ Could not fetch models, using default (gpt-4)'));
          configManager.setOpenAIModel('gpt-4');
        }
      }

      if (answers.aiProvider === 'anthropic' || answers.aiProvider === 'both') {
        const { anthropicKey } = await inquirer.prompt([
          {
            type: 'password',
            name: 'anthropicKey',
            message: 'Enter your Anthropic API key:',
            validate: (input: string) => {
              if (!input.trim()) return 'Anthropic API key is required';
              if (!input.startsWith('sk-ant-')) return 'Invalid Anthropic API key format';
              return true;
            },
          },
        ]);
        
        configManager.setAnthropicApiKey(anthropicKey);
        console.log(chalk.green('✓ Anthropic API key saved'));

        // Let user choose Anthropic model
        const availableModels = await AIService.getAvailableModels('anthropic', anthropicKey);
        
        const { anthropicModel } = await inquirer.prompt([
          {
            type: 'list',
            name: 'anthropicModel',
            message: 'Choose your preferred Anthropic model:',
            choices: availableModels.map(model => ({
              name: `${model} ${model.includes('3-5-sonnet') ? '(Recommended)' : ''}`,
              value: model
            })),
            default: 'claude-3-5-sonnet-20241022'
          }
        ]);
        
        // Validate model access
        const validateSpinner = ora('Validating model access...').start();
        try {
          const hasAccess = await AIService.validateModelAccess('anthropic', anthropicKey, anthropicModel);
          validateSpinner.stop();
          
          if (hasAccess) {
            configManager.setAnthropicModel(anthropicModel);
            console.log(chalk.green(`✓ Anthropic model set to ${anthropicModel}`));
          } else {
            console.log(chalk.yellow(`⚠️ No access to ${anthropicModel}, using default`));
            configManager.setAnthropicModel('claude-3-5-sonnet-20241022');
          }
        } catch (error) {
          validateSpinner.stop();
          console.log(chalk.yellow('⚠️ Could not validate model, using default'));
          configManager.setAnthropicModel('claude-3-5-sonnet-20241022');
        }
      }

      // Set default provider
      if (answers.aiProvider !== 'both') {
        configManager.setDefaultAiProvider(answers.aiProvider);
      } else {
        const { defaultProvider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'defaultProvider',
            message: 'Which AI provider should be the default?',
            choices: [
              { name: 'OpenAI (GPT-4)', value: 'openai' },
              { name: 'Anthropic (Claude)', value: 'anthropic' },
            ],
          },
        ]);
        configManager.setDefaultAiProvider(defaultProvider);
      }

      // Set default summary type
      const { summaryType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'summaryType',
          message: 'What type of summaries would you like by default?',
          choices: [
            { name: 'Brief - Quick overview', value: 'brief' },
            { name: 'Detailed - Comprehensive analysis', value: 'detailed' },
            { name: 'Action Items - Focus on next steps', value: 'action-items' },
          ],
        },
      ]);
      configManager.setDefaultSummaryType(summaryType);

      console.log(chalk.green('\n✅ Setup complete!'));
      console.log('You can now use the CLI to list and summarize your Linear issues.');
      console.log('\nTry these commands:');
      console.log(chalk.blue('  team cycles              ') + '- List current cycles');
      console.log(chalk.blue('  team issues              ') + '- List recent issues');
      console.log(chalk.blue('  team summarize cycles    ') + '- Summarize current cycles');
      console.log(chalk.blue('  team summarize project   ') + '- Summarize issues by project');
    });

  return command;
}