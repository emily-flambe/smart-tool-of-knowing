import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RequestWithLogger extends Request {
  logger?: typeof logger;
  requestId?: string;
}

export const requestLogger = (
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] as string || 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  req.logger = logger.child({ requestId });

  req.logger.info({
    type: 'request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger?.info({
      type: 'response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
};