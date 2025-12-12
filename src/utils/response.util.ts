import { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
}

// Success response helper
export const sendSuccess = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): Response => {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};

// Error response helper
export const sendError = (
    res: Response,
    code: string,
    message: string,
    statusCode: number = 400,
    details?: unknown
): Response => {
    const response: ApiResponse = {
        success: false,
        error: {
            code,
            message,
            details,
        },
    };
    return res.status(statusCode).json(response);
};

// Common error codes
export const ErrorCodes = {
    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // Authentication
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',

    // Email verification
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    VERIFICATION_CODE_EXPIRED: 'VERIFICATION_CODE_EXPIRED',
    VERIFICATION_CODE_INVALID: 'VERIFICATION_CODE_INVALID',
    MAX_VERIFICATION_ATTEMPTS: 'MAX_VERIFICATION_ATTEMPTS',
    VERIFICATION_RESEND_COOLDOWN: 'VERIFICATION_RESEND_COOLDOWN',
    MAX_DAILY_VERIFICATIONS: 'MAX_DAILY_VERIFICATIONS',

    // Registration
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    USERNAME_TAKEN: 'USERNAME_TAKEN',
    USERNAME_CHANGE_COOLDOWN: 'USERNAME_CHANGE_COOLDOWN',

    // Password
    PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
    PASSWORD_RESET_EXPIRED: 'PASSWORD_RESET_EXPIRED',
    PASSWORD_RESET_USED: 'PASSWORD_RESET_USED',
    INCORRECT_PASSWORD: 'INCORRECT_PASSWORD',

    // Social auth
    SOCIAL_AUTH_FAILED: 'SOCIAL_AUTH_FAILED',
    ACCOUNT_ALREADY_LINKED: 'ACCOUNT_ALREADY_LINKED',
    CANNOT_REMOVE_LAST_AUTH: 'CANNOT_REMOVE_LAST_AUTH',
    ACCOUNT_MERGE_REQUIRED: 'ACCOUNT_MERGE_REQUIRED',

    // Rate limiting
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

    // Device
    MAX_DEVICES_REACHED: 'MAX_DEVICES_REACHED',
    DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',

    // User
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    USER_DELETED: 'USER_DELETED',

    // General
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Success response utility (for non-Express responses)
 */
export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => {
    return {
        success: true,
        data,
        message,
    };
};
