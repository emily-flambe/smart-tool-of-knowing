import { Request, Response } from 'express';
import { DatabaseService } from '../services/database.service';

export class HealthController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  checkHealth = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });
  };

  checkDetailedHealth = async (_req: Request, res: Response): Promise<void> => {
    const dbHealth = await this.databaseService.checkConnection();
    
    res.json({
      success: true,
      data: {
        status: dbHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
          database: {
            status: dbHealth ? 'connected' : 'disconnected'
          },
          memory: {
            used: process.memoryUsage().heapUsed / 1024 / 1024,
            total: process.memoryUsage().heapTotal / 1024 / 1024
          },
          uptime: process.uptime()
        }
      }
    });
  };
}