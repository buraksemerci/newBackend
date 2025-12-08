import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import ms, { StringValue } from 'ms';
import { env } from '../config/env.js';
import { hashToken } from '../utils/codeGenerator.util.js';

// Token payload interfaces
export interface AccessTokenPayload {
    userId: string;
    deviceId: string;
    type: 'access';
}

export interface RefreshTokenPayload {
    userId: string;
    deviceId: string;
    tokenId: string;
    type: 'refresh';
}

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload;

// Token verification result
export interface TokenVerificationResult<T> {
    valid: boolean;
    payload?: T;
    error?: string;
}

/**
 * Generate an access token
 */
export const generateAccessToken = (userId: string, deviceId: string): string => {
    const payload: AccessTokenPayload = {
        userId,
        deviceId,
        type: 'access',
    };

    const options: SignOptions = {
        expiresIn: env.ACCESS_TOKEN_LIFE as StringValue,
        algorithm: 'HS256',
    };

    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, options);
};

/**
 * Generate a refresh token
 */
export const generateRefreshToken = (userId: string, deviceId: string, tokenId: string): string => {
    const payload: RefreshTokenPayload = {
        userId,
        deviceId,
        tokenId,
        type: 'refresh',
    };

    const options: SignOptions = {
        expiresIn: env.REFRESH_TOKEN_LIFE as StringValue,
        algorithm: 'HS256',
    };

    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, options);
};

/**
 * Verify an access token
 */
export const verifyAccessToken = (token: string): TokenVerificationResult<AccessTokenPayload> => {
    try {
        const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload & AccessTokenPayload;

        if (payload.type !== 'access') {
            return { valid: false, error: 'Invalid token type' };
        }

        return {
            valid: true,
            payload: {
                userId: payload.userId,
                deviceId: payload.deviceId,
                type: 'access',
            },
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return { valid: false, error: 'Token expired' };
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return { valid: false, error: 'Invalid token' };
        }
        return { valid: false, error: 'Token verification failed' };
    }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (token: string): TokenVerificationResult<RefreshTokenPayload> => {
    try {
        const payload = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as JwtPayload & RefreshTokenPayload;

        if (payload.type !== 'refresh') {
            return { valid: false, error: 'Invalid token type' };
        }

        return {
            valid: true,
            payload: {
                userId: payload.userId,
                deviceId: payload.deviceId,
                tokenId: payload.tokenId,
                type: 'refresh',
            },
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return { valid: false, error: 'Token expired' };
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return { valid: false, error: 'Invalid token' };
        }
        return { valid: false, error: 'Token verification failed' };
    }
};

/**
 * Decode a token without verification (for debugging/logging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch {
        return null;
    }
};

/**
 * Get refresh token expiry date
 */
export const getRefreshTokenExpiry = (): Date => {
    const milliseconds = ms(env.REFRESH_TOKEN_LIFE as StringValue);
    return new Date(Date.now() + milliseconds);
};

/**
 * Hash a refresh token for storage
 */
export const hashRefreshToken = (token: string): string => {
    return hashToken(token);
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (
    userId: string,
    deviceId: string,
    tokenId: string
): {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
} => {
    return {
        accessToken: generateAccessToken(userId, deviceId),
        refreshToken: generateRefreshToken(userId, deviceId, tokenId),
        expiresAt: getRefreshTokenExpiry(),
    };
};
