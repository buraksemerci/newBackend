import { Router } from 'express';
import * as connectionController from './connection.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * Connection Routes
 * All routes require authentication
 */

// Connection Management
router.post('/request', authenticate, connectionController.sendConnectionRequest);
router.post('/accept', authenticate, connectionController.acceptConnectionRequest);
router.post('/decline', authenticate, connectionController.declineConnectionRequest);
router.post('/cancel', authenticate, connectionController.cancelConnectionRequest);
router.post('/remove', authenticate, connectionController.removeConnection);

// Block Management
router.post('/block', authenticate, connectionController.blockUserHandler);
router.post('/unblock', authenticate, connectionController.unblockUserHandler);
router.get('/blocked', authenticate, connectionController.getBlockedUsers);

// Privacy Settings
router.get('/privacy', authenticate, connectionController.getPrivacySettings);
router.patch('/privacy', authenticate, connectionController.updatePrivacySettings);

export default router;
