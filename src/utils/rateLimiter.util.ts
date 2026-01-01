import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// In-memory store for rate limiting (can be replaced with Redis in production)
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

// Cleanup expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Every minute

export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyGenerator?: (req: Request) => string; // Custom key generator
    skipFailedRequests?: boolean;
    message?: string;
}

// Default rate limit configurations
export const RateLimitConfigs = {
    login: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        keyGenerator: (req: Request) => `login:${getClientIp(req)}:${req.body?.deviceId || 'unknown'}`,
    },
    register: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        keyGenerator: (req: Request) => `register:${getClientIp(req)}`,
    },
    forgotPassword: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        keyGenerator: (req: Request) => `forgot:${req.body?.email || getClientIp(req)}`,
    },
    verifyCode: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        keyGenerator: (req: Request) => `verify:${(req as AuthenticatedRequest).userId || getClientIp(req)}`,
    },
    checkUsername: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
        keyGenerator: (req: Request) => `username:${getClientIp(req)}`,
    },
    resendVerification: {
        windowMs: 60 * 1000, // 1 minute (base cooldown)
        maxRequests: 1,
        keyGenerator: (req: Request) => `resend:${(req as AuthenticatedRequest).userId || getClientIp(req)}`,
    },
    general: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        keyGenerator: (req: Request) => `general:${getClientIp(req)}`,
    },
} as const;

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
    userId?: string;
    deviceId?: string;
}

/**
 * Get client IP address (handles proxies)
 */
export const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
        return ips[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (config: RateLimitConfig) => {
    const {
        windowMs,
        maxRequests,
        keyGenerator = (req) => `default:${getClientIp(req)}`,
        message = 'Too many requests, please try again later.',
    } = config;

    return (req: Request, res: Response, next: NextFunction): void => {
        // Skip rate limiting in test and development environments
        if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
            next();
            return;
        }
        const key = keyGenerator(req);
        const now = Date.now();

        let entry = rateLimitStore.get(key);

        if (!entry || entry.resetAt < now) {
            // Create new entry or reset expired one
            entry = {
                count: 1,
                resetAt: now + windowMs,
            };
            rateLimitStore.set(key, entry);
            next();
            return;
        }

        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

            logger.warn('Rate limit exceeded', {
                key,
                ip: getClientIp(req),
                path: req.path,
                action: 'RATE_LIMIT',
            });

            res.status(429).json({
                success: false,
                error: {
                    code: 'RATE_LIMIT_EXCEEDED',
                    message,
                    retryAfter,
                },
            });
            return;
        }

        entry.count++;
        next();
    };
};

/**
 * Check rate limit without blocking (returns remaining attempts)
 */
export const checkRateLimit = (key: string, windowMs: number, maxRequests: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
} => {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        return {
            allowed: true,
            remaining: maxRequests,
            resetAt: now + windowMs,
        };
    }

    return {
        allowed: entry.count < maxRequests,
        remaining: Math.max(0, maxRequests - entry.count),
        resetAt: entry.resetAt,
    };
};

/**
 * Increment rate limit counter manually
 */
export const incrementRateLimit = (key: string, windowMs: number): void => {
    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
        entry = {
            count: 1,
            resetAt: now + windowMs,
        };
    } else {
        entry.count++;
    }

    rateLimitStore.set(key, entry);
};

/**
 * Reset rate limit for a key
 */
export const resetRateLimit = (key: string): void => {
    rateLimitStore.delete(key);
};
