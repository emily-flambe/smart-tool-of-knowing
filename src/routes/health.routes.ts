import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { HealthController } from '../controllers/health.controller';

export const healthRouter = Router();
const healthController = new HealthController();

healthRouter.get('/', asyncHandler(healthController.checkHealth));
healthRouter.get('/detailed', asyncHandler(healthController.checkDetailedHealth));