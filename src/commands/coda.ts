import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import inquirer from 'inquirer';
import { configManager } from '../config.js';
import { CodaClient, CodaDoc } from '../coda-client.js';
import { RAGService } from '../rag-service.js';
import { parseCodaUrl, isValidCodaUrl } from '../coda-url-parser.js';
import { CodaDatabase } from '../coda-database.js';

export function createCodaCommand(): Command {
  const command = new Command('coda');
  
  command
    .description('Interact with Coda documents and data')
    .addCommand(createListPagesCommand())
    .addCommand(createListPagesWithUrlsCommand())
    .addCommand(createListSubpagesCommand())
    .addCommand(createListDocsCommand())
    .addCommand(createSearchDocsCommand())
    .addCommand(createShowDocCommand())
    .addCommand(createExtractCommand())
    .addCommand(createExtractPageCommand())
    .addCommand(createExtractAllCommand())
    .addCommand(createAskCommand());

  return command;
}

function createListPagesCommand(): Command {
  return new Command('list-pages')
    .description('List pages in your default Coda document')
    .option('-l, --limit <number>', 'Limit number of pages to show', '25')
    .option('--doc-id <docId>', 'Specify document ID (overrides default)')
    .action(async (options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      // Determine which document to use
      let docId = options.docId;
      let docName = 'Specified Document';
      
      if (!docId) {
        docId = configManager.getDefaultCodaDocId();
        docName = configManager.getDefaultCodaDocName() || 'Default Document';
        
        if (!docId) {
          console.log(chalk.red('✗ No default document configured'));
          console.log('Run `team config setup` to select a default document');
          console.log('Or use --doc-id to specify a document');
          return;
        }
      }

      const spinner = ora(`Fetching pages from ${docName}...`).start();

      try {
        const codaClient = new CodaClient(codaApiKey);
        const pagesResponse = await codaClient.listPages(docId, parseInt(options.limit));
        
        spinner.stop();

        if (pagesResponse.items.length === 0) {
          console.log(chalk.yellow('No pages found in this document'));
          return;
        }

        console.log(chalk.blue(`📄 Pages in ${docName} (${pagesResponse.items.length} found):`));
        console.log();

        const tableData = [
          ['Name', 'Type', 'Created', 'Updated', 'ID']
        ];

        pagesResponse.items.forEach((page) => {
          tableData.push([
            page.name,
            page.contentType || 'page',
            new Date(page.createdAt).toLocaleDateString(),
            new Date(page.updatedAt).toLocaleDateString(),
            page.id
          ]);
        });

        console.log(table(tableData, {
          header: {
            alignment: 'left',
            content: chalk.bold.blue(`Pages in ${docName}`)
          }
        }));

        if (pagesResponse.nextPageToken) {
          console.log(chalk.yellow('💡 More pages available. Use a higher --limit to see more.'));
        }

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error fetching pages: ${error.message}`));
        
        if (error.message.includes('Not Found')) {
          console.log(chalk.yellow('The document may not exist or you may not have access to it.'));
          console.log('Run `team coda list-docs` to see available documents.');
        }
      }
    });
}

function createListPagesWithUrlsCommand(): Command {
  return new Command('list-pages-urls')
    .description('List pages with their browser URLs for easy reference')
    .option('-l, --limit <number>', 'Limit number of pages to show', '10')
    .option('--doc-id <docId>', 'Specify document ID (overrides default)')
    .action(async (options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      // Determine which document to use
      let docId = options.docId;
      let docName = 'Specified Document';
      
      if (!docId) {
        docId = configManager.getDefaultCodaDocId();
        docName = configManager.getDefaultCodaDocName() || 'Default Document';
        
        if (!docId) {
          console.log(chalk.red('✗ No default document configured'));
          console.log('Run `team config setup` to select a default document');
          console.log('Or use --doc-id to specify a document');
          return;
        }
      }

      const spinner = ora(`Fetching pages with URLs from ${docName}...`).start();

      try {
        const codaClient = new CodaClient(codaApiKey);
        const pagesResponse = await codaClient.listPages(docId, parseInt(options.limit));
        
        spinner.stop();

        if (pagesResponse.items.length === 0) {
          console.log(chalk.yellow('No pages found in this document'));
          return;
        }

        console.log(chalk.blue(`🔗 Pages with URLs in ${docName}:`));
        console.log();

        for (const page of pagesResponse.items) {
          try {
            const pageInfo = await codaClient.getPage(docId, page.id);
            const browserLink = (pageInfo as any).browserLink || 'No URL available';
            
            console.log(`${chalk.bold(page.name)}`);
            console.log(`  ID: ${page.id}`);
            console.log(`  URL: ${chalk.blue(browserLink)}`);
            console.log(`  Type: ${page.contentType || 'page'}`);
            console.log(`  Updated: ${new Date(page.updatedAt).toLocaleDateString()}`);
            console.log();
          } catch (error: any) {
            console.log(`${chalk.bold(page.name)} - Error fetching URL: ${error.message}`);
            console.log(`  ID: ${page.id}`);
            console.log();
          }
        }

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error fetching pages: ${error.message}`));
        
        if (error.message.includes('Not Found')) {
          console.log(chalk.yellow('The document may not exist or you may not have access to it.'));
          console.log('Run `team coda list-docs` to see available documents.');
        }
      }
    });
}

function createListSubpagesCommand(): Command {
  return new Command('list-subpages')
    .description('Select a page and view its subpages')
    .option('--doc-id <docId>', 'Specify document ID (overrides default)')
    .action(async (options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      // Determine which document to use
      let docId = options.docId;
      let docName = 'Specified Document';
      
      if (!docId) {
        docId = configManager.getDefaultCodaDocId();
        docName = configManager.getDefaultCodaDocName() || 'Default Document';
        
        if (!docId) {
          console.log(chalk.red('✗ No default document configured'));
          console.log('Run `team config setup` to select a default document');
          console.log('Or use --doc-id to specify a document');
          return;
        }
      }

      const codaClient = new CodaClient(codaApiKey);

      try {
        // Step 1: Fetch all pages
        const spinner = ora(`Fetching pages from ${docName}...`).start();
        const pagesResponse = await codaClient.listPages(docId, 50);
        spinner.stop();

        if (pagesResponse.items.length === 0) {
          console.log(chalk.yellow('No pages found in this document'));
          return;
        }

        // Step 2: Let user select a page
        const choices = pagesResponse.items.map(page => ({
          name: `${page.name} (${page.contentType || 'page'}) - Updated: ${new Date(page.updatedAt).toLocaleDateString()}`,
          value: page,
          short: page.name
        }));

        const { selectedPage } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedPage',
            message: 'Select a page to view its subpages:',
            choices,
            pageSize: 12,
          },
        ]);

        // Step 3: Find subpages (pages that have this page as parent)
        const subpages = pagesResponse.items.filter(page => 
          page.parent && page.parent.id === selectedPage.id
        );

        console.log();
        if (subpages.length === 0) {
          console.log(chalk.yellow(`📄 "${selectedPage.name}" has no subpages`));
          return;
        }

        console.log(chalk.blue(`📄 Subpages of "${selectedPage.name}" (${subpages.length} found):`));
        console.log();

        const tableData = [
          ['Name', 'Type', 'Created', 'Updated', 'ID']
        ];

        subpages.forEach((page) => {
          tableData.push([
            page.name,
            page.contentType || 'page',
            new Date(page.createdAt).toLocaleDateString(),
            new Date(page.updatedAt).toLocaleDateString(),
            page.id.slice(0, 12) + '...'
          ]);
        });

        console.log(table(tableData, {
          header: {
            alignment: 'left',
            content: chalk.bold.blue(`Subpages of "${selectedPage.name}"`)
          }
        }));

      } catch (error: any) {
        console.log(chalk.red(`✗ Error fetching pages: ${error.message}`));
        
        if (error.message.includes('Not Found')) {
          console.log(chalk.yellow('The document may not exist or you may not have access to it.'));
          console.log('Run `team coda list-docs` to see available documents.');
        }
      }
    });
}

function createListDocsCommand(): Command {
  return new Command('list-docs')
    .description('List your Coda documents')
    .option('-l, --limit <number>', 'Limit number of documents to show', '25')
    .action(async (options) => {
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
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
            doc.id
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
        console.log('Run `team config setup` to configure your Coda API key');
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
        console.log('Run `team config setup` to configure your Coda API key');
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

function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract and index content from your default Coda workspace')
    .option('--include-tables', 'Include table data in extraction')
    .option('--max-docs <number>', 'Maximum documents to process', '25')
    .option('--force', 'Force re-extraction even if cache is recent')
    .action(async (options) => {
      // Check for API keys
      const codaApiKey = configManager.getCodaApiKey();
      const anthropicApiKey = configManager.getAnthropicApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      if (!anthropicApiKey) {
        console.log(chalk.red('✗ Anthropic API key not configured'));
        console.log('Run `team config setup` to configure your Anthropic API key');
        return;
      }

      // Check if default document is configured
      const defaultDocId = configManager.getDefaultCodaDocId();
      if (!defaultDocId) {
        console.log(chalk.red('✗ No default document configured'));
        console.log('Run `team config setup` to select a default document');
        return;
      }

      const spinner = ora('Extracting and indexing content from your Coda workspace...').start();

      try {
        const ragService = new RAGService();
        await ragService.initialize();

        const result = await ragService.extractAndCacheContent({
          includeTableData: options.includeTables,
          maxDocuments: parseInt(options.maxDocs),
          forceRefresh: options.force
        });

        spinner.stop();

        console.log(chalk.green('✓ Content extraction completed successfully!'));
        console.log();
        console.log(`${chalk.bold('Documents processed:')} ${result.documentsProcessed}`);
        console.log(`${chalk.bold('Pages extracted:')} ${result.pagesExtracted}`);
        console.log(`${chalk.bold('Table rows extracted:')} ${result.tableRowsExtracted}`);
        console.log(`${chalk.bold('Total chunks created:')} ${result.totalChunks}`);
        console.log(`${chalk.bold('Embeddings generated:')} ${result.embeddingsGenerated}`);
        console.log(`${chalk.bold('Extraction time:')} ${result.extractionTime}ms`);
        console.log();
        console.log(chalk.blue('💡 You can now ask questions using `team coda ask "<your question>"`'));

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error during extraction: ${error.message}`));
        
        if (error.message.includes('API key not configured')) {
          console.log('Run `team config setup` to configure your API keys');
        }
        if (error.message.includes('document may not exist')) {
          console.log('The default document may not exist or you may not have access to it.');
          console.log('Run `team config setup` to select a different default document.');
        }
      }
    });
}

function createExtractPageCommand(): Command {
  return new Command('extract-page')
    .description('Extract and save page content from a Coda URL to local database')
    .option('--url <url>', 'Coda page URL to extract')
    .option('--force', 'Force re-extraction even if page is cached')
    .action(async (options) => {
      if (!options.url) {
        console.log(chalk.red('✗ URL is required. Use --url <coda-page-url>'));
        console.log('Example: team coda extract-page --url https://coda.io/d/_dK1XVcbhGFG/_suVLWNBV');
        return;
      }

      // Validate URL
      if (!isValidCodaUrl(options.url)) {
        console.log(chalk.red('✗ Invalid Coda URL format'));
        console.log('Expected format: https://coda.io/d/_dDocId/_suPageId or https://coda.io/d/DocName_dDocId/PageName_suPageId');
        return;
      }

      // Check API key
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      // Parse URL
      const urlParts = parseCodaUrl(options.url);
      console.log(chalk.blue(`📄 Extracting page: ${urlParts.pageName || urlParts.pageId}`));
      console.log(chalk.gray(`   Document: ${urlParts.docName || urlParts.docId}`));
      console.log();

      const db = new CodaDatabase();
      const codaClient = new CodaClient(codaApiKey);

      try {
        let pageContent = '';
        let pageInfo: any = null;
        let actualPageId = urlParts.pageId; // Default to URL-parsed pageId

        // First resolve the actual page ID by matching browserLink
        const spinner = ora('Resolving page from URL...').start();
        
        const pagesResponse = await codaClient.listPages(urlParts.docId, 100);
        
        const matchingPage = pagesResponse.items.find(page => {
          const browserLink = (page as any).browserLink || '';
          // Match either the exact URL or by pageId suffix
          return browserLink === options.url || 
                 (urlParts.pageId && browserLink.endsWith(urlParts.pageId));
        });
        
        if (matchingPage) {
          actualPageId = matchingPage.id;
          pageInfo = matchingPage;
          spinner.text = `Found page: ${matchingPage.name}`;
        } else {
          spinner.stop();
          console.log(chalk.red(`✗ Could not find page matching URL ${options.url}`));
          console.log('The page may not exist or you may not have access to it.');
          return;
        }

        // Check if we have cached content using the resolved page ID
        const cachedPage = await db.getPage(urlParts.docId, actualPageId);
        
        if (cachedPage && !options.force) {
          spinner.stop();
          console.log(chalk.yellow('📦 Page already cached in database'));
          console.log(chalk.gray(`   Extracted: ${new Date(cachedPage.extractedAt).toLocaleString()}`));
          console.log(chalk.gray(`   Content length: ${cachedPage.contentLength} characters`));
          console.log();
          console.log(chalk.blue('💡 Use --force to re-extract'));
          return;
        }

        // Extract fresh content
        spinner.text = 'Extracting page content...';
        
        try {
          pageContent = await codaClient.getPageContent(urlParts.docId, actualPageId);
          
          spinner.stop();
          
          if (!pageContent || pageContent.trim() === '') {
            console.log(chalk.yellow('⚠️  Page appears to be empty or content could not be extracted'));
            console.log('This might be a parent page with content in child pages.');
            return;
          }

          // Create data directories if they don't exist
          const fs = await import('fs');
          const path = await import('path');
          
          const dataDir = path.resolve('./data');
          const codaDir = path.resolve('./data/coda');
          
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          if (!fs.existsSync(codaDir)) {
            fs.mkdirSync(codaDir, { recursive: true });
          }

          // Create safe filename based on page_id to prevent duplicates
          const pageIdSafe = actualPageId.replace(/[^a-zA-Z0-9]/g, '-');
          const safePageName = pageInfo.name
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Collapse multiple hyphens
            .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
            .toLowerCase();
          
          const fileName = `${safePageName}-${pageIdSafe}.md`;
          const filePath = path.join(codaDir, fileName);

          // Create markdown content with metadata
          const markdownContent = `---
title: ${pageInfo.name}
page_id: ${actualPageId}
doc_id: ${urlParts.docId}
doc_name: ${urlParts.docName || pageInfo.name || 'Unknown Document'}
url: ${options.url}
content_type: ${pageInfo.contentType || 'canvas'}
parent_page_id: ${pageInfo.parent?.id || null}
parent_page_name: ${pageInfo.parent?.name || null}
is_subpage: ${!!pageInfo.parent}
created_at: ${pageInfo.createdAt}
updated_at: ${pageInfo.updatedAt}
extracted_at: ${new Date().toISOString()}
---

# ${pageInfo.name}${pageInfo.parent ? ` (subpage of ${pageInfo.parent.name})` : ''}

${pageContent}
`;

          // Write to markdown file
          fs.writeFileSync(filePath, markdownContent, 'utf8');

          // Save to database
          await db.storePage({
            docId: urlParts.docId,
            pageId: actualPageId,
            docName: urlParts.docName || pageInfo.name || 'Unknown Document',
            pageName: pageInfo.name,
            url: options.url,
            content: pageContent,
            contentType: pageInfo.contentType || 'canvas',
            createdAt: pageInfo.createdAt,
            updatedAt: pageInfo.updatedAt
          });

          console.log(chalk.green('✓ Page content extracted and saved successfully!'));
          console.log(`${chalk.bold('Markdown file:')} ${filePath}`);
          console.log();
          console.log(`${chalk.bold('Page:')} ${pageInfo.name}`);
          console.log(`${chalk.bold('Content length:')} ${pageContent.length} characters`);
          console.log(`${chalk.bold('Content type:')} ${pageInfo.contentType || 'canvas'}`);
          console.log(`${chalk.bold('Last updated:')} ${new Date(pageInfo.updatedAt).toLocaleDateString()}`);
          console.log(`${chalk.bold('Database ID:')} ${actualPageId}`);

        } catch (error: any) {
          spinner.stop();
          console.log(chalk.red(`✗ Failed to extract content: ${error.message}`));
          
          if (error.message.includes('Export timed out')) {
            console.log(chalk.yellow('💡 The page may be large or complex. Try again later.'));
          }
        }

      } catch (error: any) {
        console.log(chalk.red(`✗ Error: ${error.message}`));
      } finally {
        db.close();
      }
    });
}

function createExtractAllCommand(): Command {
  return new Command('extract-all')
    .description('Extract all pages from the default document to markdown files')
    .option('--force', 'Force re-extraction even if files exist')
    .option('--limit <number>', 'Limit number of pages to extract', '100')
    .option('--exclude-subpages', 'Only extract top-level pages, skip all subpages')
    .option('--include-hidden', 'Include pages that appear to be hidden or private (default: exclude)')
    .option('--min-content-length <number>', 'Skip pages with less than this many characters of content', '10')
    .action(async (options) => {
      // Check API key
      const codaApiKey = configManager.getCodaApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      // Check if default document is configured
      const defaultDocId = configManager.getDefaultCodaDocId();
      const defaultDocName = configManager.getDefaultCodaDocName();
      
      if (!defaultDocId) {
        console.log(chalk.red('✗ No default document configured'));
        console.log('Run `team config setup` to select a default document');
        return;
      }

      console.log(chalk.blue(`📄 Extracting all pages from: ${defaultDocName || defaultDocId}`));
      console.log();

      const codaClient = new CodaClient(codaApiKey);
      const db = new CodaDatabase();

      try {
        // Create data directories
        const fs = await import('fs');
        const path = await import('path');
        
        const dataDir = path.resolve('./data');
        const codaDir = path.resolve('./data/coda');
        
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        if (!fs.existsSync(codaDir)) {
          fs.mkdirSync(codaDir, { recursive: true });
        }

        // Get all pages (including subpages with pagination)
        const spinner = ora('Fetching all pages and subpages...').start();
        let allPages: any[];
        
        if (options.limit && parseInt(options.limit) < 100) {
          // If user specified a small limit, use the regular method
          const pagesResponse = await codaClient.listPages(defaultDocId, parseInt(options.limit));
          allPages = pagesResponse.items;
        } else {
          // Get all pages with pagination
          allPages = await codaClient.getAllPages(defaultDocId);
          
          // If user specified a limit, apply it
          if (options.limit) {
            allPages = allPages.slice(0, parseInt(options.limit));
          }
        }
        
        spinner.stop();

        if (allPages.length === 0) {
          console.log(chalk.yellow('No pages found in this document'));
          return;
        }

        // Apply filters before processing
        let filteredPages = allPages;
        let filterReasons: string[] = [];
        
        // Filter out subpages if requested
        if (options.excludeSubpages) {
          const beforeCount = filteredPages.length;
          filteredPages = filteredPages.filter(page => !page.parent);
          const filtered = beforeCount - filteredPages.length;
          if (filtered > 0) {
            filterReasons.push(`${filtered} subpages excluded`);
          }
        }
        
        // Filter out hidden pages by default (unless --include-hidden is specified)
        if (!options.includeHidden) {
          const beforeCount = filteredPages.length;
          filteredPages = filteredPages.filter(page => {
            const name = page.name.toLowerCase();
            // Skip pages that might be hidden/private based on naming patterns
            return !name.includes('hidden') && 
                   !name.includes('private') && 
                   !name.includes('draft') &&
                   !name.includes('temp') &&
                   !name.includes('test') &&
                   !name.startsWith('_') &&
                   !name.startsWith('.');
          });
          const filtered = beforeCount - filteredPages.length;
          if (filtered > 0) {
            filterReasons.push(`${filtered} potentially hidden pages excluded (use --include-hidden to include)`);
          }
        }

        // Organize pages by hierarchy for better display
        const topLevelPages = filteredPages.filter(page => !page.parent);
        const subPages = filteredPages.filter(page => page.parent);
        
        console.log(chalk.blue(`Found ${allPages.length} total pages, ${filteredPages.length} after filters:`));
        console.log(`  ${chalk.bold(topLevelPages.length)} top-level pages`);
        console.log(`  ${chalk.bold(subPages.length)} subpages`);
        if (filterReasons.length > 0) {
          console.log(chalk.gray(`  Filters applied: ${filterReasons.join(', ')}`));
        }
        console.log();

        // Update allPages to use filtered list
        allPages = filteredPages;

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;
        let updatedCount = 0;

        // Process each page
        for (let i = 0; i < allPages.length; i++) {
          const page = allPages[i];
          const progress = `[${i + 1}/${allPages.length}]`;
          
          // Show hierarchy in progress display
          const hierarchy = page.parent ? `  └─ ${page.name} (subpage of ${page.parent.name})` : `${page.name}`;
          const displayProgress = `${progress} ${hierarchy}`;
          
          console.log(`[EXTRACT] Processing page ${i + 1}/${allPages.length}: ${page.name} (ID: ${page.id})`);
          
          // Check database for existing page with same page_id
          const existingPage = await db.getPage(defaultDocId, page.id);
          
          // Create safe filename based on page_id to prevent duplicates
          const pageIdSafe = page.id.replace(/[^a-zA-Z0-9]/g, '-');
          const safePageName = page.name
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .toLowerCase()
            .substring(0, 60); // Limit length to leave room for parent and ID
          
          // Include parent name for subpages to show hierarchy
          let fileName: string;
          if (page.parent) {
            const safeParentName = page.parent.name
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .toLowerCase()
              .substring(0, 30);
            fileName = `${safeParentName}_${safePageName}-${pageIdSafe}.md`;
          } else {
            fileName = `${safePageName}-${pageIdSafe}.md`;
          }
          
          const filePath = path.join(codaDir, fileName);

          // Check if we should skip this page
          let shouldSkip = false;
          let skipReason = '';
          
          if (existingPage && !options.force) {
            // Check if page has been updated since last extraction
            const pageLastUpdated = new Date(page.updatedAt).getTime();
            const lastExtracted = existingPage.extractedAt;
            
            if (pageLastUpdated <= lastExtracted) {
              shouldSkip = true;
              skipReason = 'up to date';
            }
          }

          // Also check for old files that might match the page_id in frontmatter
          if (!shouldSkip && !options.force) {
            // Look for any existing files that contain this page_id in frontmatter
            try {
              const existingFiles = fs.readdirSync(codaDir).filter(f => f.endsWith('.md'));
              for (const fileName of existingFiles) {
                const existingFile = path.join(codaDir, fileName);
                if (existingFile !== filePath && fs.existsSync(existingFile)) {
                  try {
                    const content = fs.readFileSync(existingFile, 'utf8');
                    if (content.includes(`page_id: ${page.id}`)) {
                      // Found an old file with same page_id but different name
                      console.log(`${chalk.gray(progress)} ${chalk.blue('🔄 Renaming')} ${hierarchy} (page name changed)`);
                      // Remove the old file
                      fs.unlinkSync(existingFile);
                      break;
                    }
                  } catch (error) {
                    // Ignore file read errors
                  }
                }
              }
            } catch (error) {
              // Ignore directory read errors
            }
          }

          if (shouldSkip) {
            console.log(`${chalk.gray(progress)} ${chalk.yellow('⏭️  Skipping')} ${hierarchy} (${skipReason})`);
            skipCount++;
            continue;
          }

          const pageSpinner = ora(`${progress} Extracting ${hierarchy}...`).start();

          try {
            // Get page metadata
            const pageInfo = await codaClient.getPage(defaultDocId, page.id);
            
            // Extract content with retry logic
            let pageContent = '';
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
              try {
                pageContent = await codaClient.getPageContent(defaultDocId, page.id);
                break;
              } catch (error: any) {
                attempts++;
                if (attempts < maxAttempts) {
                  pageSpinner.text = `${progress} Extracting ${hierarchy}... (retry ${attempts})`;
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                } else {
                  throw error;
                }
              }
            }

            if (!pageContent || pageContent.trim() === '') {
              pageSpinner.stop();
              console.log(`${chalk.gray(progress)} ${chalk.yellow('⚠️  Empty')} ${hierarchy} (no content)`);
              skipCount++;
              continue;
            }

            // Check minimum content length filter
            const minContentLength = options.minContentLength ? parseInt(options.minContentLength) : 10;
            if (pageContent.trim().length < minContentLength) {
              pageSpinner.stop();
              console.log(`${chalk.gray(progress)} ${chalk.yellow('⏭️  Skipping')} ${hierarchy} (content too short: ${pageContent.trim().length} chars < ${minContentLength})`);
              skipCount++;
              continue;
            }

            // Create markdown content with metadata
            const browserLink = (pageInfo as any).browserLink || 'Unknown';
            const markdownContent = `---
title: ${page.name}
page_id: ${page.id}
doc_id: ${defaultDocId}
doc_name: ${defaultDocName || 'Unknown Document'}
url: ${browserLink}
content_type: ${page.contentType || 'canvas'}
parent_page_id: ${page.parent?.id || null}
parent_page_name: ${page.parent?.name || null}
is_subpage: ${!!page.parent}
created_at: ${page.createdAt}
updated_at: ${page.updatedAt}
extracted_at: ${new Date().toISOString()}
---

# ${page.name}${page.parent ? ` (subpage of ${page.parent.name})` : ''}

${pageContent}
`;

            // Write to file
            fs.writeFileSync(filePath, markdownContent, 'utf8');
            
            // Store in database for tracking
            await db.storePage({
              docId: defaultDocId,
              pageId: page.id,
              docName: defaultDocName || 'Unknown Document',
              pageName: page.name,
              url: browserLink,
              content: pageContent,
              contentType: page.contentType || 'canvas',
              createdAt: page.createdAt,
              updatedAt: page.updatedAt
            });
            
            pageSpinner.stop();
            const isUpdate = existingPage !== null;
            const statusIcon = isUpdate ? '🔄' : '✓';
            const statusText = isUpdate ? 'Updated' : 'Extracted';
            console.log(`${chalk.gray(progress)} ${chalk.green(statusIcon)} ${statusText} ${hierarchy} (${pageContent.length} chars)`);
            
            if (isUpdate) {
              updatedCount++;
            } else {
              successCount++;
            }

            // Add delay between requests to avoid rate limiting
            if (i < allPages.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

          } catch (error: any) {
            pageSpinner.stop();
            console.log(`${chalk.gray(progress)} ${chalk.red('✗')} ${hierarchy} - ${error.message}`);
            errorCount++;
          }
        }

        // Summary
        console.log();
        console.log(chalk.green(`✓ Extraction completed!`));
        console.log(`${chalk.bold('Successfully extracted:')} ${successCount} pages`);
        console.log(`${chalk.bold('Updated:')} ${updatedCount} pages`);
        console.log(`${chalk.bold('Skipped:')} ${skipCount} pages`);
        console.log(`${chalk.bold('Errors:')} ${errorCount} pages`);
        console.log(`${chalk.bold('Output directory:')} ${codaDir}`);

        if (successCount > 0 || updatedCount > 0) {
          console.log();
          console.log(chalk.blue('📁 Files saved to:'));
          console.log(`   ${codaDir}/`);
          console.log();
          console.log(chalk.blue('💡 You can now:'));
          console.log('   - View files in your editor');
          console.log('   - Search through content with grep');
          console.log('   - Version control the markdown files');
          console.log('   - Use database to track duplicates and updates');
        }

      } catch (error: any) {
        console.log(chalk.red(`✗ Error: ${error.message}`));
      } finally {
        db.close();
      }
    });
}

// function createSummarizeCommand(): Command {
//   return new Command('summarize')
//     .description('Extract and summarize a specific Coda page from its URL')
//     .option('--url <url>', 'Coda page URL to summarize')
//     .option('--type <type>', 'Summary type: brief, detailed, or technical', 'brief')
//     .option('--force', 'Force re-extraction even if page is cached')
//     .option('--save', 'Save the extracted content to local database')
//     .action(async (options) => {
//       if (!options.url) {
//         console.log(chalk.red('✗ URL is required. Use --url <coda-page-url>'));
//         console.log('Example: team coda summarize --url https://coda.io/d/_dK1XVcbhGFG/_suVLWNBV');
//         return;
//       }
// 
//       // Validate URL
//       if (!isValidCodaUrl(options.url)) {
//         console.log(chalk.red('✗ Invalid Coda URL format'));
//         console.log('Expected format: https://coda.io/d/_dDocId/_suPageId');
//         return;
//       }
// 
//       // Check API keys
//       const codaApiKey = configManager.getCodaApiKey();
//       const anthropicApiKey = configManager.getAnthropicApiKey();
//       
//       if (!codaApiKey) {
//         console.log(chalk.red('✗ Coda API key not configured'));
//         console.log('Run `team config setup` to configure your Coda API key');
//         return;
//       }
// 
//       if (!anthropicApiKey) {
//         console.log(chalk.red('✗ Anthropic API key not configured'));
//         console.log('Run `team config setup` to configure your Anthropic API key');
//         return;
//       }
// 
//       // Parse URL
//       const urlParts = parseCodaUrl(options.url);
//       console.log(chalk.blue(`📄 Extracting page: ${urlParts.pageName || urlParts.pageId}`));
//       console.log(chalk.gray(`   Document: ${urlParts.docName || urlParts.docId}`));
//       console.log();
// 
//       const db = new CodaDatabase();
//       const codaClient = new CodaClient(codaApiKey);
//       const anthropic = new Anthropic({ apiKey: anthropicApiKey });
// 
//       try {
//         let pageContent = '';
//         let pageInfo: any = null;
//         let actualPageId = urlParts.pageId; // Default to URL-parsed pageId
// 
//         // First resolve the actual page ID, then check cache
//         // Look up the page by matching the browserLink URL
//         const pagesResponse = await codaClient.listPages(urlParts.docId, 100);
//         
//         const matchingPage = pagesResponse.items.find(page => {
//           const browserLink = (page as any).browserLink || '';
//           return browserLink === options.url;
//         });
//         
//         if (matchingPage) {
//           actualPageId = matchingPage.id;
//           pageInfo = matchingPage;
//         } else {
//           throw new Error(`Could not find page matching URL ${options.url}. The page may not exist or you may not have access to it.`);
//         }
// 
//         // Check if we have cached content using the resolved page ID
//         const cachedPage = await db.getPage(urlParts.docId, actualPageId);
//         
//         if (cachedPage && !options.force) {
//           console.log(chalk.yellow('📦 Using cached content'));
//           pageContent = cachedPage.content;
//           pageInfo = {
//             name: cachedPage.pageName,
//             updatedAt: cachedPage.updatedAt,
//             contentType: cachedPage.contentType
//           };
//         } else {
//           // Extract fresh content
//           const spinner = ora('Extracting page content...').start();
//           
//           try {
//             // Extract content using the resolved page ID
//             pageContent = await codaClient.getPageContent(urlParts.docId, actualPageId);
//             
//             spinner.stop();
//             
//             if (!pageContent || pageContent.trim() === '') {
//               console.log(chalk.yellow('⚠️  Page appears to be empty or content could not be extracted'));
//               console.log('This might be a parent page with content in child pages.');
//               return;
//             }
// 
//             // Save to database if requested
//             if (options.save || cachedPage) {
//               await db.storePage({
//                 docId: urlParts.docId,
//                 pageId: urlParts.pageId,
//                 docName: urlParts.docName || pageInfo.name || 'Unknown Document',
//                 pageName: pageInfo.name,
//                 url: options.url,
//                 content: pageContent,
//                 contentType: pageInfo.contentType || 'canvas',
//                 createdAt: pageInfo.createdAt,
//                 updatedAt: pageInfo.updatedAt
//               });
//               console.log(chalk.green('💾 Content saved to local database'));
//             }
// 
//           } catch (error: any) {
//             spinner.stop();
//             console.log(chalk.red(`✗ Failed to extract content: ${error.message}`));
//             return;
//           }
//         }
// 
//         // Check if we have a cached summary (use actualPageId if it was resolved)
//         const pageIdForSummary = actualPageId || urlParts.pageId;
//         const cachedSummary = await db.getSummary(pageIdForSummary, options.type);
//         
//         if (cachedSummary && !options.force) {
//           console.log(chalk.blue('🤖 Summary (cached):'));
//           console.log();
//           console.log(chalk.white(cachedSummary.summary));
//           console.log();
//           console.log(chalk.gray(`Generated: ${new Date(cachedSummary.createdAt).toLocaleDateString()}`));
//           if (cachedSummary.tokenCount) {
//             console.log(chalk.gray(`Tokens: ${cachedSummary.tokenCount}`));
//           }
//           return;
//         }
// 
//         // Generate summary
//         console.log(chalk.blue('🤖 Generating summary...'));
//         const spinner = ora('Creating AI summary...').start();
// 
//         try {
//           const summaryPrompt = createSummaryPrompt(pageContent, pageInfo.name, options.type);
//           
//           const response = await anthropic.messages.create({
//             model: configManager.getAnthropicModel(),
//             max_tokens: getSummaryTokenLimit(options.type),
//             messages: [{ role: 'user', content: summaryPrompt }]
//           });
// 
//           spinner.stop();
// 
//           const summaryContent = response.content[0];
//           if (summaryContent.type !== 'text') {
//             throw new Error('Unexpected response format from AI');
//           }
// 
//           const summary = summaryContent.text;
// 
//           // Save summary to database (first ensure page is saved for foreign key constraint)
//           // Always save/update the page since we just extracted fresh content
//           await db.storePage({
//             docId: urlParts.docId,
//             pageId: actualPageId,
//             docName: urlParts.docName || pageInfo.name || 'Unknown Document',
//             pageName: pageInfo.name,
//             url: options.url,
//             content: pageContent,
//             contentType: pageInfo.contentType || 'canvas',
//             createdAt: pageInfo.createdAt,
//             updatedAt: pageInfo.updatedAt
//           });
//           
//           await db.storeSummary({
//             pageId: pageIdForSummary,
//             summary,
//             summaryType: options.type as any,
//             tokenCount: response.usage?.input_tokens
//           });
// 
//           // Display summary
//           console.log();
//           console.log(chalk.blue('🤖 Summary:'));
//           console.log();
//           console.log(chalk.white(summary));
//           console.log();
//           
//           // Show content stats
//           console.log(chalk.gray('📊 Content Stats:'));
//           console.log(chalk.gray(`   Original length: ${pageContent.length} characters`));
//           console.log(chalk.gray(`   Summary length: ${summary.length} characters`));
//           console.log(chalk.gray(`   Compression: ${Math.round((1 - summary.length / pageContent.length) * 100)}%`));
//           if (response.usage) {
//             console.log(chalk.gray(`   Input tokens: ${response.usage.input_tokens}`));
//             console.log(chalk.gray(`   Output tokens: ${response.usage.output_tokens}`));
//           }
// 
//         } catch (error: any) {
//           spinner.stop();
//           console.log(chalk.red(`✗ Failed to generate summary: ${error.message}`));
//         }
// 
//       } catch (error: any) {
//         console.log(chalk.red(`✗ Error: ${error.message}`));
//       } finally {
//         db.close();
//       }
//     });
// }
// 
// function createSummaryPrompt(content: string, pageName: string, summaryType: string): string {
//   const prompts = {
//     brief: `Please provide a brief, concise summary of this Coda page titled "${pageName}". Focus on the key points and main purpose. Keep it to 2-3 sentences.`,
//     detailed: `Please provide a detailed summary of this Coda page titled "${pageName}". Include the main sections, key information, important details, and actionable items. Organize it with bullet points or sections as appropriate.`,
//     technical: `Please provide a technical summary of this Coda page titled "${pageName}". Focus on technical specifications, implementation details, configuration steps, and technical requirements. Include any code snippets, URLs, or technical parameters mentioned.`
//   };
// 
//   const basePrompt = prompts[summaryType as keyof typeof prompts] || prompts.brief;
//   
//   return `${basePrompt}
// 
// Content to summarize:
// ${content}
// 
// Please provide a clear, well-structured summary that captures the essential information from this page.`;
// }
// 
// function getSummaryTokenLimit(summaryType: string): number {
//   switch (summaryType) {
//     case 'brief': return 150;
//     case 'detailed': return 500;
//     case 'technical': return 800;
//     default: return 200;
//   }
// }
// 
function createAskCommand(): Command {
  return new Command('ask')
    .description('Ask questions about your Coda documents using AI')
    .argument('<question>', 'Question to ask about your documents')
    .option('--include-tables', 'Include table data in search')
    .option('--max-docs <number>', 'Maximum documents to search', '25')
    .option('--refresh-cache', 'Refresh document cache')
    .option('--focus-default', 'Focus search on configured default document only')
    .option('--full-content', 'Use full page content instead of vector chunks (for detailed context)')
    .action(async (question, options) => {
      // Check for API keys
      const codaApiKey = configManager.getCodaApiKey();
      const anthropicApiKey = configManager.getAnthropicApiKey();
      
      if (!codaApiKey) {
        console.log(chalk.red('✗ Coda API key not configured'));
        console.log('Run `team config setup` to configure your Coda API key');
        return;
      }

      if (!anthropicApiKey) {
        console.log(chalk.red('✗ Anthropic API key not configured'));
        console.log('Run `team config setup` to configure your Anthropic API key');
        return;
      }

      // Check cache status first
      const ragService = new RAGService();
      await ragService.initialize();
      
      const cacheStatus = await ragService.getCacheStatus();
      if (!cacheStatus.exists) {
        console.log(chalk.yellow('⚠️  No content cache found. Please run extraction first:'));
        console.log(chalk.blue('   team coda extract'));
        return;
      }
      
      if (cacheStatus.isStale) {
        console.log(chalk.yellow('⚠️  Content cache is more than a week old. Consider refreshing:'));
        console.log(chalk.blue('   team coda extract --force'));
        console.log();
      }

      const spinner = ora('Searching your Coda documents and generating answer...').start();

      try {
        const response = await ragService.askQuestion(question, {
          includeTableData: options.includeTables,
          maxDocuments: parseInt(options.maxDocs),
          refreshCache: options.refreshCache,
          focusOnDefaultDoc: options.focusDefault,
          useFullContent: options.fullContent
        });

        spinner.stop();

        // Display the answer
        console.log(chalk.blue('🤖 AI Answer:'));
        console.log();
        console.log(chalk.white(response.answer));
        console.log();

        // Display confidence and context
        const confidenceColor = response.confidence === 'high' ? 'green' : 
                               response.confidence === 'medium' ? 'yellow' : 'red';
        console.log(`${chalk.bold('Confidence:')} ${chalk[confidenceColor](response.confidence.toUpperCase())}`);
        console.log(`${chalk.bold('Search Duration:')} ${response.context.searchDuration}ms`);
        console.log(`${chalk.bold('Documents Searched:')} ${response.context.totalDocuments}`);
        console.log(`${chalk.bold('Relevant Chunks Found:')} ${response.context.relevantChunks.length}`);
        
        // Display sources if available
        if (response.sources.length > 0) {
          console.log();
          console.log(chalk.blue('📚 Sources:'));
          
          response.sources.forEach((source, index) => {
            console.log(`${chalk.blue(`${index + 1}.`)} ${chalk.bold(source.docName)}`);
            console.log(`   Similarity: ${(source.similarity * 100).toFixed(1)}%`);
            console.log(`   Preview: ${chalk.gray(source.chunkContent)}`);
            console.log();
          });
        }

      } catch (error: any) {
        spinner.stop();
        console.log(chalk.red(`✗ Error processing question: ${error.message}`));
        
        if (error.message.includes('API key not configured')) {
          console.log('Run `team config setup` to configure your API keys');
        }
      }
    });
}