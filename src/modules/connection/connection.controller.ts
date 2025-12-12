import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as connectionService from './connection.service.js';
import * as blockService from './block.service.js';
import * as privacyService from './privacy.service.js';
import { sendRequestSchema, connectionActionSchema, blockUserSchema, updatePrivacySchema } from './connection.schemas.js';
import { successResponse } from '../../utils/response.util.js';

/**
 * Connection Controller - API Handlers
 */

// ============================================================================
// CONNECTION ENDPOINTS
// ============================================================================

/**
 * Send connection request
 * POST /api/connections/request
 */
export const sendConnectionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { receiverId } = sendRequestSchema.parse(req.body);

        const result = await connectionService.sendRequest(authReq.userId, receiverId);

        res.status(200).json(successResponse(result, result.message));
    } catch (error) {
        next(error);
    }
};

/**
 * Accept connection request
 * POST /api/connections/accept
 */
export const acceptConnectionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: requesterId } = connectionActionSchema.parse(req.body);

        await connectionService.acceptRequest(authReq.userId, requesterId);

        res.status(200).json(successResponse(null, 'Connection accepted'));
    } catch (error) {
        next(error);
    }
};

/**
 * Decline connection request
 * POST /api/connections/decline
 */
export const declineConnectionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: requesterId } = connectionActionSchema.parse(req.body);

        await connectionService.declineRequest(authReq.userId, requesterId);

        res.status(200).json(successResponse(null, 'Connection declined'));
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel pending connection request
 * POST /api/connections/cancel
 */
export const cancelConnectionRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: receiverId } = connectionActionSchema.parse(req.body);

        await connectionService.cancelRequest(authReq.userId, receiverId);

        res.status(200).json(successResponse(null, 'Connection request cancelled'));
    } catch (error) {
        next(error);
    }
};

/**
 * Remove existing connection
 * POST /api/connections/remove
 */
export const removeConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: otherUserId } = connectionActionSchema.parse(req.body);

        await connectionService.removeConnection(authReq.userId, otherUserId);

        res.status(200).json(successResponse(null, 'Connection removed'));
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// BLOCK ENDPOINTS
// ============================================================================

/**
 * Block a user
 * POST /api/connections/block
 */
export const blockUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: blockedId } = blockUserSchema.parse(req.body);

        await blockService.blockUser(authReq.userId, blockedId);

        res.status(200).json(successResponse(null, 'User blocked'));
    } catch (error) {
        next(error);
    }
};

/**
 * Unblock a user
 * POST /api/connections/unblock
 */
export const unblockUserHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId: blockedId } = blockUserSchema.parse(req.body);

        await blockService.unblockUser(authReq.userId, blockedId);

        res.status(200).json(successResponse(null, 'User unblocked'));
    } catch (error) {
        next(error);
    }
};

/**
 * Get blocked users list
 * GET /api/connections/blocked
 */
export const getBlockedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;

        const blockedUsers = await blockService.getBlockedUsers(authReq.userId);

        res.status(200).json(successResponse({ blockedUsers }, 'Blocked users retrieved'));
    } catch (error) {
        next(error);
    }
};

// ============================================================================
// PRIVACY ENDPOINTS
// ============================================================================

/**
 * Get privacy settings
 * GET /api/connections/privacy
 */
export const getPrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;

        const settings = await privacyService.getPrivacySettings(authReq.userId);

        res.status(200).json(successResponse(settings, 'Privacy settings retrieved'));
    } catch (error) {
        next(error);
    }
};

/**
 * Update privacy settings
 * PATCH /api/connections/privacy
 */
export const updatePrivacySettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authReq = req as AuthenticatedRequest;
        const data = updatePrivacySchema.parse(req.body);

        await privacyService.updatePrivacySettings(authReq.userId, data);

        res.status(200).json(successResponse(null, 'Privacy settings updated'));
    } catch (error) {
        next(error);
    }
};

