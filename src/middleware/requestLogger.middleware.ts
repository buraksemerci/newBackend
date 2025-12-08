import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logRequest, logResponse } from '../config/logger.js';
import { AuthenticatedRequest } from './auth.middleware.js';

// Extend Request to include requestId
declare module 'express' {
    interface Request {
        requestId?: string;
    }
}

/**
 * Request logging middleware
 * Adds requestId and logs request/response
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    // Generate unique request ID
    req.requestId = uuidv4();

    // Record start time
    const startTime = Date.now();

    // Log request
    const userId = (req as AuthenticatedRequest).userId;
    logRequest(req.requestId, req.method, req.path, userId);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logResponse(req.requestId!, req.method, req.path, res.statusCode, duration, userId);
    });

    next();
};
