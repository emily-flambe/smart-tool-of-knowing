import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { configManager } from '../config.js';
import { LinearClient } from '../linear-client.js';
import { CodaClient } from '../coda-client.js';
import { AIService } from '../ai-service.js';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'not_configured';
  message: string;
  responseTime?: number;
  details?: string;
}

export function createHealthCommand(): Command {
  const command = new Command('health');
  
  command
    .description('Check the health status of all configured APIs')
    .option('-v, --verbose', 'Show detailed information')
    .action(async (options) => {
      console.log(chalk.blue('🏥 API Health Check'));
      console.log();

      const results: HealthCheckResult[] = [];

      // Check Linear API
      await checkLinearHealth(results);

      // Check Coda API
      await checkCodaHealth(results);

      // Check AI providers
      await checkAIProvidersHealth(results);

      // Display results
      displayHealthResults(results, options.verbose);
    });

  return command;
}

async function checkLinearHealth(results: HealthCheckResult[]): Promise<void> {
  const spinner = ora('Checking Linear API...').start();
  const startTime = Date.now();

  try {
    const linearApiKey = configManager.getLinearApiKey();
    
    if (!linearApiKey) {
      spinner.stop();
      results.push({
        service: 'Linear API',
        status: 'not_configured',
        message: 'API key not configured'
      });
      return;
    }

    const linearClient = new LinearClient(linearApiKey);
    const viewer = await linearClient.validateApiKey();
    const responseTime = Date.now() - startTime;
    
    spinner.stop();
    results.push({
      service: 'Linear API',
      status: 'healthy',
      message: `Connected as ${viewer.name}`,
      responseTime,
      details: `Email: ${viewer.email}, ID: ${viewer.id}`
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    spinner.stop();
    results.push({
      service: 'Linear API',
      status: 'unhealthy',
      message: error.message || 'Connection failed',
      responseTime,
      details: error.response?.status ? `HTTP ${error.response.status}` : undefined
    });
  }
}

async function checkCodaHealth(results: HealthCheckResult[]): Promise<void> {
  const spinner = ora('Checking Coda API...').start();
  const startTime = Date.now();

  try {
    const codaApiKey = configManager.getCodaApiKey();
    
    if (!codaApiKey) {
      spinner.stop();
      results.push({
        service: 'Coda API',
        status: 'not_configured',
        message: 'API key not configured'
      });
      return;
    }

    const codaClient = new CodaClient(codaApiKey);
    const response = await codaClient.validateApiKey();
    const responseTime = Date.now() - startTime;
    
    spinner.stop();
    results.push({
      service: 'Coda API',
      status: 'healthy',
      message: `Connected as ${response.name}`,
      responseTime,
      details: `Email: ${response.loginId}, Type: ${response.type}`
    });

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    spinner.stop();
    results.push({
      service: 'Coda API',
      status: 'unhealthy',
      message: error.message || 'Connection failed',
      responseTime,
      details: error.response?.status ? `HTTP ${error.response.status}` : undefined
    });
  }
}

async function checkAIProvidersHealth(results: HealthCheckResult[]): Promise<void> {
  // Check OpenAI
  const openaiSpinner = ora('Checking OpenAI API...').start();
  const openaiStartTime = Date.now();

  try {
    const openaiKey = configManager.getOpenAIApiKey();
    
    if (!openaiKey) {
      openaiSpinner.stop();
      results.push({
        service: 'OpenAI API',
        status: 'not_configured',
        message: 'API key not configured'
      });
    } else {
      // Test with a simple model list request
      const models = await AIService.getAvailableModels('openai', openaiKey);
      const responseTime = Date.now() - openaiStartTime;
      
      openaiSpinner.stop();
      results.push({
        service: 'OpenAI API',
        status: 'healthy',
        message: `${models.length} models available`,
        responseTime,
        details: `Default model: ${configManager.getOpenAIModel()}`
      });
    }
  } catch (error: any) {
    const responseTime = Date.now() - openaiStartTime;
    openaiSpinner.stop();
    results.push({
      service: 'OpenAI API',
      status: 'unhealthy',
      message: error.message || 'Connection failed',
      responseTime,
      details: error.response?.status ? `HTTP ${error.response.status}` : undefined
    });
  }

  // Check Anthropic
  const anthropicSpinner = ora('Checking Anthropic API...').start();
  const anthropicStartTime = Date.now();

  try {
    const anthropicKey = configManager.getAnthropicApiKey();
    
    if (!anthropicKey) {
      anthropicSpinner.stop();
      results.push({
        service: 'Anthropic API',
        status: 'not_configured',
        message: 'API key not configured'
      });
    } else {
      // Test with a simple model list request
      const models = await AIService.getAvailableModels('anthropic', anthropicKey);
      const responseTime = Date.now() - anthropicStartTime;
      
      anthropicSpinner.stop();
      results.push({
        service: 'Anthropic API',
        status: 'healthy',
        message: `${models.length} models available`,
        responseTime,
        details: `Default model: ${configManager.getAnthropicModel()}`
      });
    }
  } catch (error: any) {
    const responseTime = Date.now() - anthropicStartTime;
    anthropicSpinner.stop();
    results.push({
      service: 'Anthropic API',
      status: 'unhealthy',
      message: error.message || 'Connection failed',
      responseTime,
      details: error.response?.status ? `HTTP ${error.response.status}` : undefined
    });
  }
}

function displayHealthResults(results: HealthCheckResult[], verbose: boolean): void {
  const tableData = [
    ['Service', 'Status', 'Message', 'Response Time']
  ];

  let allHealthy = true;
  let anyConfigured = false;

  results.forEach(result => {
    const statusIcon = result.status === 'healthy' ? '✅' : 
                     result.status === 'unhealthy' ? '❌' : '⚪';
    
    const statusColor = result.status === 'healthy' ? chalk.green : 
                       result.status === 'unhealthy' ? chalk.red : chalk.gray;
    
    const responseTimeText = result.responseTime ? `${result.responseTime}ms` : '-';
    
    tableData.push([
      result.service,
      statusColor(`${statusIcon} ${result.status}`),
      result.message,
      responseTimeText
    ]);

    if (result.status !== 'healthy') {
      allHealthy = false;
    }
    if (result.status !== 'not_configured') {
      anyConfigured = true;
    }
  });

  console.log(table(tableData, {
    header: {
      alignment: 'left',
      content: chalk.bold.blue('API Health Status')
    }
  }));

  // Show detailed information if verbose
  if (verbose) {
    console.log(chalk.blue('📋 Detailed Information:'));
    console.log();
    
    results.forEach(result => {
      if (result.details) {
        console.log(`${chalk.bold(result.service)}: ${result.details}`);
      }
    });
    console.log();
  }

  // Overall status summary
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const totalConfigured = results.filter(r => r.status !== 'not_configured').length;
  
  if (!anyConfigured) {
    console.log(chalk.yellow('⚠️  No APIs configured. Run `team setup` to get started.'));
  } else if (allHealthy && totalConfigured === results.length) {
    console.log(chalk.green('🎉 All APIs are healthy and ready to use!'));
  } else if (healthyCount > 0) {
    console.log(chalk.yellow(`⚠️  ${healthyCount}/${totalConfigured} configured APIs are healthy.`));
    
    const unhealthyServices = results
      .filter(r => r.status === 'unhealthy')
      .map(r => r.service);
    
    if (unhealthyServices.length > 0) {
      console.log(chalk.red(`❌ Issues with: ${unhealthyServices.join(', ')}`));
      console.log();
      console.log('Troubleshooting tips:');
      console.log('• Check your API keys with `team config show`');
      console.log('• Verify network connectivity');
      console.log('• Check service status pages for outages');
    }
  } else {
    console.log(chalk.red('❌ All configured APIs are unhealthy. Check your API keys and network connection.'));
  }

  // Configuration suggestions
  const notConfigured = results.filter(r => r.status === 'not_configured');
  if (notConfigured.length > 0) {
    console.log();
    console.log(chalk.blue('💡 Optional integrations available:'));
    notConfigured.forEach(service => {
      const command = service.service === 'Coda API' ? 'team setup' : 'team setup';
      console.log(`   ${service.service}: Run \`${command}\` to configure`);
    });
  }
}