import crypto from 'crypto';

/**
 * Generate a 6-digit numeric verification code
 */
export const generateVerificationCode = (): string => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate a secure random token (for password reset, etc.)
 */
export const generateSecureToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token or code using SHA-256
 */
export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a UUID v4
 */
export const generateUUID = (): string => {
    return crypto.randomUUID();
};

/**
 * Calculate expiration date from now
 */
export const calculateExpiry = (minutes: number): Date => {
    return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Calculate expiry from a duration string (e.g., '15m', '7d', '1h')
 */
export const parseDuration = (duration: string): number => {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        case 'h':
            return value * 60 * 60 * 1000;
        case 'd':
            return value * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Invalid duration unit: ${unit}`);
    }
};

/**
 * Check if a date is expired
 */
export const isExpired = (date: Date): boolean => {
    return new Date() > new Date(date);
};
