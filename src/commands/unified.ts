import { Command } from 'commander';
import { UnifiedDataService } from '../unified-data-service.js';
import { LinearExtractor } from '../extractors/linear-extractor.js';
import { GitHubExtractor } from '../extractors/github-extractor.js';
import { CodaExtractor } from '../extractors/coda-extractor.js';
import { DataQuery, NewsletterOptions } from '../unified-types.js';
import { loadConfig } from '../config.js';
import chalk from 'chalk';
import ora from 'ora';

export function createUnifiedCommand(): Command {
  const unifiedCmd = new Command('unified')
    .description('Unified data operations across all sources');

  // Sync command
  unifiedCmd
    .command('sync')
    .description('Sync data from all configured sources')
    .option('--source <source>', 'Sync specific source only (coda, linear, github)')
    .option('--incremental', 'Perform incremental sync if supported')
    .action(async (options) => {
      const spinner = ora('Initializing unified data service...').start();
      
      try {
        const config = loadConfig();
        const dataService = new UnifiedDataService();
        
        // Register extractors based on configuration
        if (config.coda?.dataDirectory) {
          const codaExtractor = new CodaExtractor(config.coda.dataDirectory);
          dataService.registerExtractor(codaExtractor);
          spinner.text = 'Registered Coda extractor';
        }
        
        if (config.linear?.apiToken) {
          const linearExtractor = new LinearExtractor(config.linear.apiToken);
          dataService.registerExtractor(linearExtractor);
          spinner.text = 'Registered Linear extractor';
        }
        
        if (config.github?.token) {
          const githubExtractor = new GitHubExtractor(
            config.github.token, 
            config.github.repositories || []
          );
          dataService.registerExtractor(githubExtractor);
          spinner.text = 'Registered GitHub extractor';
        }

        spinner.text = 'Starting data synchronization...';

        let results;
        if (options.source) {
          results = [await dataService.syncSource(options.source as any)];
        } else {
          results = await dataService.syncAllSources();
        }

        spinner.stop();

        // Display results
        console.log(chalk.bold('\n📊 Sync Results\n'));
        
        for (const result of results) {
          const icon = result.success ? '✅' : '❌';
          const color = result.success ? chalk.green : chalk.red;
          
          console.log(`${icon} ${color(result.source.toUpperCase())}`);
          console.log(`   Items processed: ${result.itemsProcessed}`);
          console.log(`   Items added: ${result.itemsAdded}`);
          console.log(`   Items updated: ${result.itemsUpdated}`);
          
          if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.join(', ')}`);
          }
          
          console.log(`   Sync time: ${result.syncTime}\n`);
        }

        dataService.close();
        
      } catch (error) {
        spinner.fail('Sync failed');
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // Query command
  unifiedCmd
    .command('query')
    .description('Query unified data across all sources')
    .option('-q, --search <text>', 'Full-text search query')
    .option('-s, --sources <sources>', 'Comma-separated list of sources (coda,linear,github)')
    .option('-t, --types <types>', 'Comma-separated list of content types')
    .option('--since <date>', 'Items created/updated since date (YYYY-MM-DD)')
    .option('--until <date>', 'Items created/updated until date (YYYY-MM-DD)')
    .option('--limit <number>', 'Limit number of results', '50')
    .option('--format <format>', 'Output format (table, json, markdown)', 'table')
    .action(async (options) => {
      const spinner = ora('Querying unified data...').start();
      
      try {
        const dataService = new UnifiedDataService();
        
        const query: DataQuery = {
          limit: parseInt(options.limit)
        };
        
        if (options.search) {
          query.textSearch = options.search;
        }
        
        if (options.sources) {
          query.sources = options.sources.split(',').map((s: string) => s.trim());
        }
        
        if (options.types) {
          query.contentTypes = options.types.split(',').map((t: string) => t.trim());
        }
        
        if (options.since || options.until) {
          query.timeRange = {
            start: options.since || '1970-01-01',
            end: options.until || new Date().toISOString().split('T')[0]
          };
        }
        
        const result = await dataService.query(query);
        spinner.stop();
        
        console.log(chalk.bold(`\n🔍 Query Results (${result.totalCount} total, showing ${result.items.length})\n`));
        
        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else if (options.format === 'markdown') {
          for (const item of result.items) {
            console.log(`## ${item.metadata.title}`);
            console.log(`**Source:** ${item.metadata.source} | **Type:** ${item.metadata.contentType}`);
            console.log(`**URL:** ${item.metadata.url || 'N/A'}`);
            console.log(`**Updated:** ${item.metadata.updatedAt}\n`);
            console.log(item.content.substring(0, 200) + (item.content.length > 200 ? '...' : ''));
            console.log('\n---\n');
          }
        } else {
          // Table format
          const { table } = await import('table');
          
          const tableData = [
            ['Title', 'Source', 'Type', 'Updated', 'URL']
          ];
          
          for (const item of result.items) {
            tableData.push([
              item.metadata.title.substring(0, 50) + (item.metadata.title.length > 50 ? '...' : ''),
              item.metadata.source,
              item.metadata.contentType,
              new Date(item.metadata.updatedAt).toLocaleDateString(),
              item.metadata.url?.substring(0, 30) + (item.metadata.url && item.metadata.url.length > 30 ? '...' : '') || 'N/A'
            ]);
          }
          
          console.log(table(tableData));
        }
        
        if (result.hasMore) {
          console.log(chalk.yellow(`\n📄 Use --limit and pagination to see more results`));
        }
        
        dataService.close();
        
      } catch (error) {
        spinner.fail('Query failed');
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // Newsletter command
  unifiedCmd
    .command('newsletter')
    .description('Generate a newsletter-style summary of recent activity')
    .option('--start <date>', 'Start date (YYYY-MM-DD)', () => {
      const date = new Date();
      date.setDate(date.getDate() - 7); // Default to last week
      return date.toISOString().split('T')[0];
    })
    .option('--end <date>', 'End date (YYYY-MM-DD)', () => {
      return new Date().toISOString().split('T')[0];
    })
    .option('--sources <sources>', 'Comma-separated list of sources to include')
    .option('--group-by <groupBy>', 'Group by: source, contentType, assignee, project, cycle', 'source')
    .option('--format <format>', 'Output format (markdown, html, text)', 'markdown')
    .option('--output <file>', 'Save to file instead of printing to console')
    .action(async (options) => {
      const spinner = ora('Generating newsletter...').start();
      
      try {
        const dataService = new UnifiedDataService();
        
        const newsletterOptions: NewsletterOptions = {
          timeRange: {
            start: options.start + 'T00:00:00.000Z',
            end: options.end + 'T23:59:59.999Z'
          },
          groupBy: options.groupBy,
          format: options.format
        };
        
        if (options.sources) {
          newsletterOptions.sources = options.sources.split(',').map((s: string) => s.trim());
        }
        
        const newsletter = await dataService.generateNewsletter(newsletterOptions);
        spinner.stop();
        
        let output = '';
        
        if (options.format === 'markdown') {
          output += `# ${newsletter.title}\n\n`;
          output += `**Period:** ${options.start} to ${options.end}\n`;
          output += `**Generated:** ${new Date(newsletter.generatedAt).toLocaleString()}\n\n`;
          
          output += `## 📊 Overview\n\n`;
          output += `- **Total Items:** ${newsletter.overallMetrics.totalItems}\n`;
          
          for (const [source, count] of Object.entries(newsletter.overallMetrics.bySource)) {
            output += `- **${source.charAt(0).toUpperCase() + source.slice(1)}:** ${count}\n`;
          }
          
          output += '\n';
          
          for (const section of newsletter.sections) {
            output += `## ${section.title}\n\n`;
            
            if (section.metrics) {
              output += `**Metrics:** ${section.metrics.totalItems} total`;
              if (section.metrics.completedItems) {
                output += `, ${section.metrics.completedItems} completed`;
              }
              if (section.metrics.inProgressItems) {
                output += `, ${section.metrics.inProgressItems} in progress`;
              }
              output += '\n\n';
            }
            
            for (const item of section.items.slice(0, 10)) { // Limit to 10 items per section
              output += `### ${item.metadata.title}\n`;
              output += `- **Source:** ${item.metadata.source}\n`;
              output += `- **Updated:** ${new Date(item.metadata.updatedAt).toLocaleDateString()}\n`;
              if (item.metadata.url) {
                output += `- **Link:** [View](${item.metadata.url})\n`;
              }
              output += '\n';
            }
            
            if (section.items.length > 10) {
              output += `*... and ${section.items.length - 10} more items*\n\n`;
            }
          }
        } else {
          // Plain text format
          output = `${newsletter.title}\n${'='.repeat(newsletter.title.length)}\n\n`;
          output += `Period: ${options.start} to ${options.end}\n`;
          output += `Generated: ${new Date(newsletter.generatedAt).toLocaleString()}\n\n`;
          
          for (const section of newsletter.sections) {
            output += `${section.title}\n${'-'.repeat(section.title.length)}\n`;
            
            for (const item of section.items.slice(0, 5)) {
              output += `- ${item.metadata.title} (${item.metadata.source})\n`;
            }
            output += '\n';
          }
        }
        
        if (options.output) {
          const { writeFileSync } = await import('fs');
          writeFileSync(options.output, output);
          console.log(chalk.green(`Newsletter saved to ${options.output}`));
        } else {
          console.log(output);
        }
        
        dataService.close();
        
      } catch (error) {
        spinner.fail('Newsletter generation failed');
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // Status command
  unifiedCmd
    .command('status')
    .description('Show unified data service status')
    .action(async () => {
      try {
        const config = loadConfig();
        const dataService = new UnifiedDataService();
        
        console.log(chalk.bold('🔄 Unified Data Service Status\n'));
        
        // Check configured sources
        const sources = [];
        
        if (config.coda?.dataDirectory) {
          const codaExtractor = new CodaExtractor(config.coda.dataDirectory);
          const isValid = await codaExtractor.validateConnection();
          sources.push({
            name: 'Coda',
            status: isValid ? 'Connected' : 'Error',
            config: `Data directory: ${config.coda.dataDirectory}`
          });
        }
        
        if (config.linear?.apiToken) {
          const linearExtractor = new LinearExtractor(config.linear.apiToken);
          const isValid = await linearExtractor.validateConnection();
          sources.push({
            name: 'Linear',
            status: isValid ? 'Connected' : 'Error',
            config: 'API token configured'
          });
        }
        
        if (config.github?.token) {
          const githubExtractor = new GitHubExtractor(config.github.token, config.github.repositories || []);
          const isValid = await githubExtractor.validateConnection();
          sources.push({
            name: 'GitHub',
            status: isValid ? 'Connected' : 'Error',
            config: `${config.github.repositories?.length || 0} repositories configured`
          });
        }
        
        // Display source status
        for (const source of sources) {
          const icon = source.status === 'Connected' ? '✅' : '❌';
          const color = source.status === 'Connected' ? chalk.green : chalk.red;
          console.log(`${icon} ${color(source.name)}: ${source.status}`);
          console.log(`   ${source.config}\n`);
        }
        
        if (sources.length === 0) {
          console.log(chalk.yellow('⚠️  No sources configured. Run `team config` to set up data sources.'));
        }
        
        // Get data statistics
        const allDataQuery = await dataService.query({ limit: 1000000 });
        const bySource: Record<string, number> = {};
        
        for (const item of allDataQuery.items) {
          bySource[item.metadata.source] = (bySource[item.metadata.source] || 0) + 1;
        }
        
        console.log(chalk.bold('📊 Data Statistics\n'));
        console.log(`Total items: ${allDataQuery.totalCount}`);
        
        for (const [source, count] of Object.entries(bySource)) {
          console.log(`${source}: ${count} items`);
        }
        
        dataService.close();
        
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  return unifiedCmd;
}