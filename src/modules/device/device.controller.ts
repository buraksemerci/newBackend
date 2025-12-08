import { Request, Response } from 'express';
import { sendSuccess, sendError, ErrorCodes } from '../../utils/response.util.js';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as deviceService from './device.service.js';

/**
 * Get all active devices
 * GET /api/devices
 */
export const getDevices = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    const devices = await deviceService.getActiveDevices(authReq.userId, authReq.deviceId);
    sendSuccess(res, devices);
};

/**
 * Remove a device
 * DELETE /api/devices/:deviceId
 */
export const removeDevice = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { deviceId } = req.params;

    try {
        await deviceService.removeDevice(authReq.userId, deviceId, authReq.deviceId);
        sendSuccess(res, null, 'Device removed successfully');
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Device not found') {
                sendError(res, ErrorCodes.DEVICE_NOT_FOUND, 'Device not found', 404);
                return;
            }
            if (error.message.includes('current device')) {
                sendError(res, ErrorCodes.VALIDATION_ERROR, error.message, 400);
                return;
            }
        }
        throw error;
    }
};

/**
 * Update FCM token for current device
 * PATCH /api/devices/fcm-token
 */
export const updateFcmToken = async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const { fcmToken } = req.body;

    if (!fcmToken) {
        sendError(res, ErrorCodes.VALIDATION_ERROR, 'FCM token is required', 400);
        return;
    }

    await deviceService.updateFcmToken(authReq.userId, authReq.deviceId, fcmToken);
    sendSuccess(res, null, 'FCM token updated');
};
