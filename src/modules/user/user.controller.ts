import { Request, Response } from 'express';
import { sendSuccess, sendError, ErrorCodes } from '../../utils/response.util.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as userService from './user.service.js';

/**
 * Get current user
 * GET /api/user/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const user = await userService.getCurrentUser(authReq.userId);
    sendSuccess(res, user);
};

/**
 * Update profile
 * PATCH /api/user/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { firstName, lastName, birthDate, gender } = req.body;

    await userService.updateProfile(authReq.userId, {
        firstName,
        lastName,
        birthDate: birthDate, // Zod handles date coercion
        gender,
    });

    sendSuccess(res, null, 'Profile updated successfully');
};

/**
 * Update body info
 * PATCH /api/user/body
 */
export const updateBody = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { heightCm, weightKg, targetWeightKg, somatotype } = req.body;

    await userService.updateBody(authReq.userId, {
        heightCm,
        weightKg,
        targetWeightKg,
        somatotype
    });

    sendSuccess(res, null, 'Body info updated successfully');
};

/**
 * Get settings
 * GET /api/user/settings
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const user = await userService.getCurrentUser(authReq.userId);

    sendSuccess(res, user.settings, 'Settings retrieved successfully');
};

/**
 * Update settings
 * PATCH /api/user/settings
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { preferredUnit, languageId, theme, workoutReminders, progressUpdates } = req.body;

    await userService.updateSettings(authReq.userId, {
        preferredUnit,
        languageId,
        theme,
        workoutReminders,
        progressUpdates,
    });

    sendSuccess(res, null, 'Settings updated successfully');
};

/**
 * Change username
 * PATCH /api/user/username
 */
export const changeUsername = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { username } = req.body;

    await userService.changeUsername(authReq.userId, username);
    sendSuccess(res, null, 'Username changed successfully');
};

/**
 * Update fitness goal
 * PATCH /api/user/fitness-goal
 */
export const updateFitnessGoal = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { fitnessGoalId } = req.body;

    await userService.updateFitnessGoal(authReq.userId, fitnessGoalId);
    sendSuccess(res, null, 'Fitness goal updated successfully');
};

/**
 * Get auth methods
 * GET /api/user/auth-methods
 */
export const getAuthMethods = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const methods = await userService.getAuthMethods(authReq.userId);
    sendSuccess(res, methods);
};

/**
 * Delete account
 * DELETE /api/user/account
 */
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    await userService.deleteAccount(authReq.userId);
    sendSuccess(res, null, 'Account deleted successfully');
};

/**
 * Search users by username or name
 * GET /api/user/search?q=query&limit=20
 */
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const q = req.query.q as string;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const users = await userService.searchUsers(authReq.userId, q, limit);
    sendSuccess(res, users);
};

/**
 * Get public profile of another user
 * GET /api/user/:userId
 */
export const getUserPublicProfile = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = req.params;

    const profile = await userService.getPublicProfile(userId, authReq.userId);
    sendSuccess(res, profile);
};
