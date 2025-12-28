import { Router } from 'express';
import * as connectionController from './connection.controller.js';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const router = Router();

/**
 * Connection Routes
 * All routes require authentication and verified email
 */

// All connection routes require authentication and verified email
router.use(authenticate);
router.use(requireVerifiedEmail);

// Connection Management
router.post('/request', connectionController.sendConnectionRequest);
router.post('/accept', connectionController.acceptConnectionRequest);
router.post('/decline', connectionController.declineConnectionRequest);
router.post('/cancel', connectionController.cancelConnectionRequest);
router.post('/remove', connectionController.removeConnection);

// Block Management
router.post('/block', connectionController.blockUserHandler);
router.post('/unblock', connectionController.unblockUserHandler);
router.get('/blocked', connectionController.getBlockedUsers);

// Privacy Settings
router.get('/privacy', connectionController.getPrivacySettings);
router.patch('/privacy', connectionController.updatePrivacySettings);

export default router;
