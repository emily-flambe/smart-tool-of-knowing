import dotenv from 'dotenv';
import { logger } from '../utils/logger';

export const loadConfiguration = (): void => {
  const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
  const result = dotenv.config({ path: envFile });

  if (result.error) {
    logger.warn(`Could not load ${envFile} file`);
  }

  // Validate required environment variables
  const requiredVars = [
    'DB_HOST',
    'DB_USERNAME',
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  logger.info('Configuration loaded successfully');
};

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    env: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  }
};