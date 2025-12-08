import { Router } from 'express';
import * as deviceController from './device.controller.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

// All device routes require authentication
router.use(authenticate);
router.use(requireVerifiedEmail);

// Get all active devices
router.get('/', asyncHandler(deviceController.getDevices));

// Remove a device
router.delete('/:deviceId', asyncHandler(deviceController.removeDevice));

// Update FCM token
router.patch('/fcm-token', asyncHandler(deviceController.updateFcmToken));

export default router;
