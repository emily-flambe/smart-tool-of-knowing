import { loadConfiguration } from './config/index';
import { startServer } from './server';
import { DatabaseService } from './services/database.service';
import { logger } from './utils/logger';

const main = async (): Promise<void> => {
  try {
    // Load configuration
    loadConfiguration();

    // Initialize database
    const databaseService = new DatabaseService();
    await databaseService.initialize();

    // Start server
    const port = parseInt(process.env.PORT || '3001');
    await startServer(port);

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
};

main();