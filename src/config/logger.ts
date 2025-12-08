import winston from 'winston';
import { env } from './env.js';
import path from 'path';
import fs from 'fs';

// Ensure log directory exists
if (!fs.existsSync(env.LOG_DIR)) {
    fs.mkdirSync(env.LOG_DIR, { recursive: true });
}

// Mask sensitive data in logs
const maskSensitiveData = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(maskSensitiveData);
    }

    const masked: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'code', 'secret', 'key'];
    const emailKeys = ['email'];

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
            if (typeof value === 'string' && value.length > 10) {
                masked[key] = value.substring(0, 10) + '***';
            } else {
                masked[key] = '***';
            }
        } else if (emailKeys.some((ek) => lowerKey.includes(ek))) {
            if (typeof value === 'string' && value.includes('@')) {
                const [local, domain] = value.split('@');
                masked[key] = `${local[0]}***@${domain}`;
            } else {
                masked[key] = value;
            }
        } else if (typeof value === 'object') {
            masked[key] = maskSensitiveData(value);
        } else {
            masked[key] = value;
        }
    }

    return masked;
};

// Custom format for masking
const maskFormat = winston.format((info) => {
    if (info.meta) {
        info.meta = maskSensitiveData(info.meta);
    }
    return info;
});

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, userId, action, ...meta }) => {
        let log = `${timestamp} [${level}]`;
        if (requestId) log += ` [${requestId}]`;
        if (userId) log += ` [user:${userId}]`;
        if (action) log += ` [${action}]`;
        log += `: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(maskSensitiveData(meta))}`;
        }
        return log;
    })
);

// File format (JSON for production)
const fileFormat = winston.format.combine(
    maskFormat(),
    winston.format.timestamp(),
    winston.format.json()
);

// Create transports
const transports: winston.transport[] = [
    new winston.transports.Console({
        format: env.NODE_ENV === 'development' ? consoleFormat : fileFormat,
    }),
];

// Add file transport in production
if (env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(env.LOG_DIR, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        new winston.transports.File({
            filename: path.join(env.LOG_DIR, 'combined.log'),
            format: fileFormat,
        })
    );
}

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    defaultMeta: { service: 'fitness-app' },
    transports,
});

// Request logger helper
export const logRequest = (
    requestId: string,
    method: string,
    url: string,
    userId?: string
) => {
    logger.info(`${method} ${url}`, { requestId, userId, action: 'REQUEST' });
};

// Response logger helper
export const logResponse = (
    requestId: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    userId?: string
) => {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, `${method} ${url} ${statusCode} ${duration}ms`, {
        requestId,
        userId,
        statusCode,
        duration,
        action: 'RESPONSE',
    });
};

// Auth-specific loggers
export const authLogger = {
    loginSuccess: (userId: string, deviceId: string, provider: string) => {
        logger.info('User login successful', { userId, deviceId, provider, action: 'LOGIN_SUCCESS' });
    },
    loginFailed: (email: string, reason: string, ip?: string) => {
        logger.warn('User login failed', { email, reason, ip, action: 'LOGIN_FAILED' });
    },
    registerSuccess: (userId: string, email: string) => {
        logger.info('User registered successfully', { userId, email, action: 'REGISTER_SUCCESS' });
    },
    passwordChanged: (userId: string) => {
        logger.info('User password changed', { userId, action: 'PASSWORD_CHANGED' });
    },
    passwordResetRequested: (email: string) => {
        logger.info('Password reset requested', { email, action: 'PASSWORD_RESET_REQUESTED' });
    },
    emailVerified: (userId: string) => {
        logger.info('Email verified', { userId, action: 'EMAIL_VERIFIED' });
    },
    tokenRefreshed: (userId: string, deviceId: string) => {
        logger.debug('Token refreshed', { userId, deviceId, action: 'TOKEN_REFRESHED' });
    },
    logoutSuccess: (userId: string, deviceId: string) => {
        logger.info('User logged out', { userId, deviceId, action: 'LOGOUT' });
    },
    suspiciousActivity: (userId: string, reason: string, details?: object) => {
        logger.warn('Suspicious activity detected', { userId, reason, ...details, action: 'SUSPICIOUS_ACTIVITY' });
    },
};
