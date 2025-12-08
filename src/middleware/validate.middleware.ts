import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod/v4';
import { sendError, ErrorCodes } from '../utils/response.util.js';

/**
 * Validation middleware factory
 * Validates request body, query, and params against Zod schemas
 */
export const validate = (schema: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.query) {
                const parsed = schema.query.parse(req.query);
                req.query = parsed as typeof req.query;
            }
            if (schema.params) {
                const parsed = schema.params.parse(req.params);
                req.params = parsed as typeof req.params;
            }
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const formattedErrors = error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                }));

                sendError(
                    res,
                    ErrorCodes.VALIDATION_ERROR,
                    'Validation failed',
                    400,
                    { errors: formattedErrors }
                );
                return;
            }
            next(error);
        }
    };
};

/**
 * Validate only the request body
 */
export const validateBody = (schema: ZodSchema) => validate({ body: schema });

/**
 * Validate only the request query
 */
export const validateQuery = (schema: ZodSchema) => validate({ query: schema });

/**
 * Validate only the request params
 */
export const validateParams = (schema: ZodSchema) => validate({ params: schema });
