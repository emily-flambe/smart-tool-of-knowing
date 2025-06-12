import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { configManager } from '../config.js';
import { LinearClient } from '../linear-client.js';
import { AIService } from '../ai-service.js';
import { CodaClient } from '../coda-client.js';
import { EnvManager } from '../env-manager.js';

export function createSetupCommand(): Command {
  const command = new Command('setup');
  
  command
    .description('Configure API keys and settings')
    .action(async () => {
      console.log(chalk.blue('🚀 Team Knowledge CLI Setup'));
      console.log('Configure your API keys to get started.\n');

      const envManager = new EnvManager();
      const existingValues = envManager.readEnvFile();

      // Show current status if .env exists
      if (envManager.envFileExists()) {
        console.log(chalk.yellow('📄 Found existing .env file'));
        console.log('Current values will be used as defaults. Press Enter to keep existing values.\n');
      } else {
        console.log(chalk.green('📄 Creating .env file for your API keys\n'));
      }

      // Linear API Key
      const { linearApiKey } = await inquirer.prompt([
        {
          type: 'input',
          name: 'linearApiKey',
          message: `Linear API key ${existingValues.LINEAR_API_KEY ? `(current: ${envManager.maskValue(existingValues.LINEAR_API_KEY)})` : ''}:`,
          default: existingValues.LINEAR_API_KEY || '',
          validate: (input: string) => {
            if (!input.trim()) return 'Linear API key is required';
            if (!envManager.validateApiKey(input, 'linear')) {
              return 'Invalid Linear API key format. Should start with lin_api_ or lin_oauth_';
            }
            return true;
          },
        },
      ]);

      // Validate Linear API key
      let linearValidated = false;
      try {
        const spinner = ora('Validating Linear API key...').start();
        const linearClient = new LinearClient(linearApiKey);
        const viewer = await linearClient.validateApiKey();
        spinner.stop();
        console.log(chalk.green(`✓ Linear API key validated for ${viewer.name} (${viewer.email})`));
        linearValidated = true;
      } catch (error) {
        console.log(chalk.red('✗ Invalid Linear API key - continuing with setup'));
        console.log(chalk.yellow('You can fix this later by running setup again or using team config set'));
      }

      // AI Provider Selection
      const { aiProvider } = await inquirer.prompt([
        {
          type: 'list',
          name: 'aiProvider',
          message: 'Which AI provider would you like to configure?',
          choices: [
            { name: 'OpenAI (GPT-4)', value: 'openai' },
            { name: 'Anthropic (Claude)', value: 'anthropic' },
            { name: 'Both (you can switch between them)', value: 'both' },
            { name: 'Skip AI setup for now', value: 'skip' },
          ],
          default: existingValues.DEFAULT_AI_PROVIDER || 'openai',
        },
      ]);

      let openaiKey = existingValues.OPENAI_API_KEY;
      let anthropicKey = existingValues.ANTHROPIC_API_KEY;

      // Configure AI providers
      if (aiProvider === 'openai' || aiProvider === 'both') {
        const response = await inquirer.prompt([
          {
            type: 'input',
            name: 'openaiKey',
            message: `OpenAI API key ${openaiKey ? `(current: ${envManager.maskValue(openaiKey)})` : ''}:`,
            default: openaiKey || '',
            validate: (input: string) => {
              if (!input.trim()) return 'OpenAI API key is required';
              if (!envManager.validateApiKey(input, 'openai')) {
                return 'Invalid OpenAI API key format. Should start with sk-';
              }
              return true;
            },
          },
        ]);
        
        openaiKey = response.openaiKey;
        console.log(chalk.green('✓ OpenAI API key configured'));
      }

      if (aiProvider === 'anthropic' || aiProvider === 'both') {
        const response = await inquirer.prompt([
          {
            type: 'input',
            name: 'anthropicKey',
            message: `Anthropic API key ${anthropicKey ? `(current: ${envManager.maskValue(anthropicKey)})` : ''}:`,
            default: anthropicKey || '',
            validate: (input: string) => {
              if (!input.trim()) return 'Anthropic API key is required';
              if (!envManager.validateApiKey(input, 'anthropic')) {
                return 'Invalid Anthropic API key format. Should start with sk-ant-';
              }
              return true;
            },
          },
        ]);
        
        anthropicKey = response.anthropicKey;
        console.log(chalk.green('✓ Anthropic API key configured'));
      }

      // Set default provider if both were configured
      let defaultProvider = existingValues.DEFAULT_AI_PROVIDER;
      if (aiProvider === 'both') {
        const { provider } = await inquirer.prompt([
          {
            type: 'list',
            name: 'provider',
            message: 'Which AI provider should be the default?',
            choices: [
              { name: 'OpenAI (GPT-4)', value: 'openai' },
              { name: 'Anthropic (Claude)', value: 'anthropic' },
            ],
            default: defaultProvider || 'openai',
          },
        ]);
        defaultProvider = provider;
      } else if (aiProvider !== 'skip') {
        defaultProvider = aiProvider;
      }

      // Optional Coda integration
      let codaKey = existingValues.CODA_API_KEY;
      const { setupCoda } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'setupCoda',
          message: `Set up Coda integration? ${codaKey ? `(current: ${envManager.maskValue(codaKey)})` : '(optional)'}`,
          default: !!codaKey,
        },
      ]);

      if (setupCoda) {
        const response = await inquirer.prompt([
          {
            type: 'input',
            name: 'codaKey',
            message: `Coda API key ${codaKey ? `(current: ${envManager.maskValue(codaKey)})` : ''}:`,
            default: codaKey || '',
            validate: (input: string) => {
              if (!input.trim()) return 'Coda API key is required';
              if (!envManager.validateApiKey(input, 'coda')) {
                return 'Invalid Coda API key format';
              }
              return true;
            },
          },
        ]);

        try {
          const spinner = ora('Validating Coda API key...').start();
          const codaClient = new CodaClient(response.codaKey);
          const user = await codaClient.validateApiKey();
          spinner.stop();
          console.log(chalk.green(`✓ Coda API key validated for ${user.name}`));
          codaKey = response.codaKey;
        } catch (error) {
          console.log(chalk.red('✗ Invalid Coda API key - saving anyway for troubleshooting'));
          console.log(chalk.yellow('You can test connectivity with: team health'));
          codaKey = response.codaKey; // Save even if validation fails
        }
      }

      // Write all values to .env file
      try {
        const envValues: any = {
          LINEAR_API_KEY: linearApiKey,
        };

        if (openaiKey) envValues.OPENAI_API_KEY = openaiKey;
        if (anthropicKey) envValues.ANTHROPIC_API_KEY = anthropicKey;
        if (codaKey) envValues.CODA_API_KEY = codaKey;
        if (defaultProvider) envValues.DEFAULT_AI_PROVIDER = defaultProvider;


        envManager.writeEnvFile(envValues);
        console.log(chalk.green(`\n✅ Configuration saved to ${envManager.getEnvPath()}`));
      } catch (error) {
        console.log(chalk.red(`✗ Error saving configuration: ${error}`));
        return;
      }

      console.log(chalk.green('\n🎉 Setup complete!'));
      console.log('You can now use the CLI to access your team knowledge.\n');
      
      console.log('Try these commands:');
      console.log(chalk.blue('  team health                     ') + '- Check API connectivity');
      console.log(chalk.blue('  team linear list cycles         ') + '- List current cycles');
      console.log(chalk.blue('  team linear list issues         ') + '- List recent issues');
      if (codaKey) {
        console.log(chalk.blue('  team coda list-docs             ') + '- Browse Coda documents');
      }
      if (openaiKey || anthropicKey) {
        console.log(chalk.blue('  team linear summarize cycle     ') + '- AI summary of cycle');
      }
    });

  return command;
}