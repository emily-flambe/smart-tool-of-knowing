import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { configManager } from '../config.js';
import { CodaClient, CodaDoc } from '../coda-client.js';

export function createCodaCommand(): Command {
  const command = new Command('coda');
  
  command
    .description('Interact with Coda documents and data')
    .addCommand(createListDocsCommand())
    .addCommand(createSearchDocsCommand())
    .addCommand(createShowDocCommand());

  return command;
}

function createListDocsCommand(): Command {
  return new Command('list-docs')
    .description('List your Coda documents')
    .option('-l, --limit <number>', 'Limit number of documents to show', '25')
    .action(async (options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team setup` to configure your Coda API key');
        return;
      }

      const spinner = ora('Fetching Coda documents...').start();

      try {
        const codaClient = new CodaClient(codaApiKey);
        const response = await codaClient.listDocs(parseInt(options.limit));
        
        spinner.stop();

        if (response.items.length === 0) {
          console.log(chalk.yellow('No documents found'));
          return;
        }

        console.log(chalk.blue(`📚 Your Coda Documents (${response.items.length} found):`));
        console.log();

        const tableData = [
          ['Name', 'Workspace', 'Created', 'Updated', 'ID']
        ];

        response.items.forEach((doc: CodaDoc) => {
          tableData.push([
            doc.name,
            doc.workspace.name,
            new Date(doc.createdAt).toLocaleDateString(),
            new Date(doc.updatedAt).toLocaleDateString(),
            doc.id.slice(0, 12) + '...'
          ]);
        });

        console.log(table(tableData, {
          header: {
            alignment: 'left',
            content: chalk.bold.blue('Your Coda Documents')
          }
        }));

        if (response.nextPageToken) {
          console.log(chalk.yellow('💡 More documents available. Use a higher --limit to see more.'));
        }

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error fetching documents: ${error.message}`));
      }
    });
}

function createSearchDocsCommand(): Command {
  return new Command('search-docs')
    .description('Search your Coda documents')
    .argument('<query>', 'Search query')
    .option('-l, --limit <number>', 'Limit number of results', '10')
    .action(async (query, options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team setup` to configure your Coda API key');
        return;
      }

      const spinner = ora(`Searching for "${query}"...`).start();

      try {
        const codaClient = new CodaClient(codaApiKey);
        const response = await codaClient.searchDocs(query, parseInt(options.limit));
        
        spinner.stop();

        if (response.items.length === 0) {
          console.log(chalk.yellow(`No documents found matching "${query}"`));
          return;
        }

        console.log(chalk.blue(`🔍 Search Results for "${query}" (${response.items.length} found):`));
        console.log();

        response.items.forEach((doc: CodaDoc, index: number) => {
          console.log(`${chalk.blue(`${index + 1}.`)} ${chalk.bold(doc.name)}`);
          console.log(`   Workspace: ${doc.workspace.name}`);
          console.log(`   Updated: ${new Date(doc.updatedAt).toLocaleDateString()}`);
          console.log(`   Link: ${doc.browserLink}`);
          console.log();
        });

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error searching documents: ${error.message}`));
      }
    });
}

function createShowDocCommand(): Command {
  return new Command('show-doc')
    .description('Show details about a specific Coda document')
    .argument('<doc-id>', 'Document ID')
    .action(async (docId) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team setup` to configure your Coda API key');
        return;
      }

      const spinner = ora('Fetching document details...').start();

      try {
        const codaClient = new CodaClient(codaApiKey);
        const doc = await codaClient.getDoc(docId);
        const tables = await codaClient.listTables(docId, 10);
        
        spinner.stop();

        console.log(chalk.blue('📄 Document Details:'));
        console.log();
        console.log(`${chalk.bold('Name:')} ${doc.name}`);
        console.log(`${chalk.bold('Workspace:')} ${doc.workspace.name}`);
        console.log(`${chalk.bold('Owner:')} ${doc.owner.name} (${doc.owner.email})`);
        console.log(`${chalk.bold('Created:')} ${new Date(doc.createdAt).toLocaleDateString()}`);
        console.log(`${chalk.bold('Updated:')} ${new Date(doc.updatedAt).toLocaleDateString()}`);
        console.log(`${chalk.bold('Link:')} ${doc.browserLink}`);
        
        if (doc.folder) {
          console.log(`${chalk.bold('Folder:')} ${doc.folder.name}`);
        }

        if (tables.items.length > 0) {
          console.log();
          console.log(chalk.blue('📊 Tables in this document:'));
          
          const tableData = [
            ['Name', 'Rows', 'Columns', 'Display Column']
          ];

          tables.items.forEach(table => {
            tableData.push([
              table.name,
              table.rowCount.toString(),
              table.columns.length.toString(),
              table.displayColumn.name
            ]);
          });

          console.log(table(tableData, {
            header: {
              alignment: 'left',
              content: chalk.bold.blue('Tables')
            }
          }));
        } else {
          console.log();
          console.log(chalk.yellow('No tables found in this document'));
        }

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error fetching document: ${error.message}`));
      }
    });
}