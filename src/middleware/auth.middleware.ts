import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../services/jwt.service.js';
import { sendError, ErrorCodes } from '../utils/response.util.js';
import { prisma } from '../config/database.js';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
    userId: string;
    deviceId: string;
    user?: {
        id: string;
        email: string;
        username: string;
        isEmailVerified: boolean;
    };
}

/**
 * Authentication middleware - verifies JWT access token
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            sendError(res, ErrorCodes.UNAUTHORIZED, 'No token provided', 401);
            return;
        }

        const token = authHeader.substring(7);
        const result = verifyAccessToken(token);

        if (!result.valid || !result.payload) {
            if (result.error === 'Token expired') {
                sendError(res, ErrorCodes.TOKEN_EXPIRED, 'Access token has expired', 401);
            } else {
                sendError(res, ErrorCodes.TOKEN_INVALID, 'Invalid access token', 401);
            }
            return;
        }

        // Attach user info to request
        (req as AuthenticatedRequest).userId = result.payload.userId;
        (req as AuthenticatedRequest).deviceId = result.payload.deviceId;

        next();
    } catch (error) {
        sendError(res, ErrorCodes.INTERNAL_ERROR, 'Authentication failed', 500);
    }
};

/**
 * Email verification check middleware
 * Use after authenticate middleware to ensure email is verified
 */
export const requireVerifiedEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;

        const user = await prisma.user.findUnique({
            where: { user_id: authReq.userId },
            select: {
                user_id: true,
                email: true,
                username: true,
                is_email_verified: true,
                deleted_at: true,
            },
        });

        if (!user || user.deleted_at) {
            sendError(res, ErrorCodes.USER_NOT_FOUND, 'User not found', 404);
            return;
        }

        if (!user.is_email_verified) {
            sendError(
                res,
                ErrorCodes.EMAIL_NOT_VERIFIED,
                'Please verify your email address to continue',
                403
            );
            return;
        }

        // Attach user to request
        authReq.user = {
            id: user.user_id,
            email: user.email,
            username: user.username,
            isEmailVerified: user.is_email_verified,
        };

        next();
    } catch (error) {
        sendError(res, ErrorCodes.INTERNAL_ERROR, 'Failed to verify email status', 500);
    }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }

        const token = authHeader.substring(7);
        const result = verifyAccessToken(token);

        if (result.valid && result.payload) {
            (req as AuthenticatedRequest).userId = result.payload.userId;
            (req as AuthenticatedRequest).deviceId = result.payload.deviceId;
        }

        next();
    } catch {
        // Silently continue without authentication
        next();
    }
};
