import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { sendError, ErrorCodes } from '../utils/response.util.js';
import { Prisma } from '@prisma/client';

// Custom error class for application errors
export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 400,
        public details?: unknown
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Log the error
    logger.error('Error occurred', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
    });

    // Handle AppError
    if (error instanceof AppError) {
        sendError(res, error.code, error.message, error.statusCode, error.details);
        return;
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        handlePrismaError(error, res);
        return;
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'Database validation error', 400);
        return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid token', 401);
        return;
    }

    if (error.name === 'TokenExpiredError') {
        sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Token has expired', 401);
        return;
    }

    // Handle syntax errors (malformed JSON)
    if (error instanceof SyntaxError && 'body' in error) {
        sendError(res, ErrorCodes.INVALID_INPUT, 'Invalid JSON in request body', 400);
        return;
    }

    // Default to internal server error
    sendError(
        res,
        ErrorCodes.INTERNAL_ERROR,
        process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
        500
    );
};

/**
 * Handle Prisma-specific errors
 */
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError, res: Response): void => {
    switch (error.code) {
        case 'P2002': {
            // Unique constraint violation
            const target = (error.meta?.target as string[])?.join(', ') || 'field';
            if (target.includes('email')) {
                sendError(res, ErrorCodes.EMAIL_ALREADY_EXISTS, 'Email is already registered', 409);
            } else if (target.includes('username')) {
                sendError(res, ErrorCodes.USERNAME_TAKEN, 'Username is already taken', 409);
            } else {
                sendError(res, ErrorCodes.VALIDATION_ERROR, `Duplicate value for: ${target}`, 409);
            }
            break;
        }
        case 'P2025':
            // Record not found
            sendError(res, ErrorCodes.NOT_FOUND, 'Record not found', 404);
            break;
        case 'P2003':
            // Foreign key constraint failed
            sendError(res, ErrorCodes.VALIDATION_ERROR, 'Related record not found', 400);
            break;
        case 'P2014':
            // Required relation violation
            sendError(res, ErrorCodes.VALIDATION_ERROR, 'Required relation missing', 400);
            break;
        default:
            sendError(res, ErrorCodes.INTERNAL_ERROR, 'Database error occurred', 500);
    }
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    sendError(res, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
